const { getDb } = require('../db');
const fileOrganizer = require('../../services/fileOrganizerService');
const { generateDualCopyPrintableHtml } = require('../../services/invoicePrintTemplate');

function getSettings() {
  const db = getDb();
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

function getNextInvoiceNumber(documentType = 'CASH_MEMO') {
  const db = getDb();
  const settings = getSettings();
  const fy = settings.financial_year || '2026-27';

  let prefix = settings.cash_memo_prefix || 'CM/';
  if (documentType === 'GST_INVOICE') {
    prefix = settings.invoice_prefix || 'JH/';
  } else if (documentType === 'BATCH_GST') {
    prefix = `${settings.invoice_prefix || 'JH/'}B`;
  }

  const lastInv = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE document_type = ? AND financial_year = ? 
    ORDER BY id DESC LIMIT 1
  `).get(documentType, fy);

  let nextSeq = 1;
  if (lastInv && lastInv.invoice_number) {
    const parts = lastInv.invoice_number.split('/');
    const lastNumStr = parts[parts.length - 1];
    const match = lastNumStr.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  const paddedSeq = nextSeq.toString().padStart(4, '0');
  return `${prefix}${fy}/${paddedSeq}`;
}

function createInvoice(invoiceData) {
  const db = getDb();
  const settings = getSettings();

  const fy = settings.financial_year || '2026-27';
  const invoiceNumber = invoiceData.invoice_number || getNextInvoiceNumber(invoiceData.document_type);
  const today = invoiceData.invoice_date || new Date().toISOString().split('T')[0];

  let insertedInvoiceId = null;

  const txn = db.transaction(() => {
    // 1. Insert invoice header
    const insertInv = db.prepare(`
      INSERT INTO invoices (
        document_type, invoice_number, financial_year, invoice_date, party_id,
        customer_name, customer_phone, customer_gstin, customer_address, customer_state,
        customer_state_code, place_of_supply, is_inter_state, subtotal, discount_amount,
        taxable_amount, cgst_amount, sgst_amount, igst_amount, round_off, grand_total,
        paid_amount, balance_amount, payment_mode, notes, batch_reference_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertInv.run(
      invoiceData.document_type || 'CASH_MEMO',
      invoiceNumber,
      fy,
      today,
      invoiceData.party_id || null,
      invoiceData.customer_name || 'Walk-in Customer',
      invoiceData.customer_phone || '',
      invoiceData.customer_gstin || '',
      invoiceData.customer_address || '',
      invoiceData.customer_state || settings.state,
      invoiceData.customer_state_code || settings.state_code,
      invoiceData.place_of_supply || `${settings.state} (${settings.state_code})`,
      invoiceData.is_inter_state ? 1 : 0,
      invoiceData.subtotal || 0,
      invoiceData.discount_amount || 0,
      invoiceData.taxable_amount || 0,
      invoiceData.cgst_amount || 0,
      invoiceData.sgst_amount || 0,
      invoiceData.igst_amount || 0,
      invoiceData.round_off || 0,
      invoiceData.grand_total || 0,
      invoiceData.paid_amount !== undefined ? invoiceData.paid_amount : invoiceData.grand_total,
      invoiceData.balance_amount || 0,
      invoiceData.payment_mode || 'CASH',
      invoiceData.notes || '',
      invoiceData.batch_reference_id || null
    );

    insertedInvoiceId = info.lastInsertRowid;

    // 2. Insert line items
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, item_name, hsn_code, unit, quantity,
        unit_price, discount_percent, discount_amount, taxable_value,
        gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products SET current_stock = current_stock - ? WHERE id = ?
    `);

    const insertStockMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, notes)
      VALUES (?, 'SALE', ?, ?, ?)
    `);

    for (const item of (invoiceData.items || [])) {
      insertItem.run(
        insertedInvoiceId,
        item.product_id || null,
        item.item_name,
        item.hsn_code || '6115',
        item.unit || 'Pcs',
        item.quantity || 1,
        item.unit_price || 0,
        item.discount_percent || 0,
        item.discount_amount || 0,
        item.taxable_value || (item.unit_price * item.quantity),
        item.gst_rate !== undefined ? item.gst_rate : 5.0,
        item.cgst_amount || 0,
        item.sgst_amount || 0,
        item.igst_amount || 0,
        item.total_amount || 0
      );

      // Deduct stock if tracked and NOT a batch invoice
      if (item.product_id && invoiceData.document_type !== 'BATCH_GST') {
        const prod = db.prepare('SELECT id, is_stock_tracked FROM products WHERE id = ?').get(item.product_id);
        if (prod && prod.is_stock_tracked) {
          updateStockStmt.run(item.quantity, item.product_id);
          insertStockMovement.run(item.product_id, -item.quantity, insertedInvoiceId, `Sale Bill: ${invoiceNumber}`);
        }
      }
    }

    // 3. Customer credit ledger (if balance_amount > 0 and party_id exists)
    if (invoiceData.party_id && invoiceData.balance_amount > 0) {
      db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?')
        .run(invoiceData.balance_amount, invoiceData.party_id);
    }

    // 4. Update Daily Cash Register (if paid in cash and not batch GST)
    if (invoiceData.document_type !== 'BATCH_GST') {
      const reg = db.prepare('SELECT id, cash_sales, online_sales_total, expected_closing_cash FROM daily_cash_register WHERE entry_date = ?').get(today);
      if (reg) {
        if (invoiceData.payment_mode === 'CASH') {
          db.prepare(`
            UPDATE daily_cash_register SET
              cash_sales = cash_sales + ?,
              expected_closing_cash = expected_closing_cash + ?
            WHERE id = ?
          `).run(invoiceData.paid_amount, invoiceData.paid_amount, reg.id);
        } else if (invoiceData.payment_mode === 'ONLINE') {
          db.prepare(`
            UPDATE daily_cash_register SET
              online_sales_total = online_sales_total + ?
            WHERE id = ?
          `).run(invoiceData.paid_amount, reg.id);
        }
      }
    }
  });

  txn();

  // Retrieve full saved invoice
  const fullInvoice = getInvoiceById(insertedInvoiceId);

  // Generate HTML & save to Year -> Month -> Date-Name_of_customer
  try {
    const html = generatePrintableHtml(fullInvoice, settings);
    const saveRes = fileOrganizer.saveBillDocument(fullInvoice, html, settings.bills_storage_path);
    if (saveRes.success) {
      db.prepare('UPDATE invoices SET pdf_file_path = ? WHERE id = ?').run(saveRes.filePath, insertedInvoiceId);
      fullInvoice.pdf_file_path = saveRes.filePath;
    }
  } catch (err) {
    console.warn('[InvoiceRepo] File saving failed non-critically:', err);
  }

  return fullInvoice;
}

function getInvoiceById(id) {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) return null;

  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
  return invoice;
}

function getInvoices({ type = null, startDate = null, endDate = null, query = '', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];

  if (type) {
    sql += ' AND document_type = ?';
    params.push(type);
  }
  if (startDate) {
    sql += ' AND invoice_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND invoice_date <= ?';
    params.push(endDate);
  }
  if (query && query.trim()) {
    sql += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
    const q = `%${query.trim()}%`;
    params.push(q, q, q);
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

function cancelInvoice(id) {
  const db = getDb();
  const invoice = getInvoiceById(id);
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'CANCELLED') throw new Error('Invoice is already cancelled');

  const txn = db.transaction(() => {
    // 1. Mark as cancelled
    db.prepare("UPDATE invoices SET status = 'CANCELLED' WHERE id = ?").run(id);

    // 2. Restore stock if tracked
    if (invoice.document_type !== 'BATCH_GST') {
      for (const item of invoice.items) {
        if (item.product_id) {
          const prod = db.prepare('SELECT id, is_stock_tracked FROM products WHERE id = ?').get(item.product_id);
          if (prod && prod.is_stock_tracked) {
            db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?').run(item.quantity, item.product_id);
            db.prepare(`
              INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, notes)
              VALUES (?, 'SALE_RETURN', ?, ?, ?)
            `).run(item.product_id, item.quantity, id, `Cancelled Invoice: ${invoice.invoice_number}`);
          }
        }
      }
    }

    // 3. Reverse customer credit balance if applied
    if (invoice.party_id && invoice.balance_amount > 0) {
      db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
        .run(invoice.balance_amount, invoice.party_id);
    }
  });

  txn();
  return getInvoiceById(id);
}

/**
 * Generates clean dual-copy printable HTML (Customer + Merchant) for A4 and file saving
 */
function generatePrintableHtml(inv, settings) {
  return generateDualCopyPrintableHtml(inv, settings);
}

module.exports = {
  getNextInvoiceNumber,
  createInvoice,
  getInvoiceById,
  getInvoices,
  cancelInvoice,
  getSettings,
  generatePrintableHtml,
};
