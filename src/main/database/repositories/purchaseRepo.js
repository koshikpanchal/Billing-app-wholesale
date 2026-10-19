const { getDb } = require('../db');

function createPurchase(purchaseData) {
  const db = getDb();
  const today = purchaseData.purchase_date || new Date().toISOString().split('T')[0];
  const totalAmount = parseFloat(purchaseData.total_amount) || 0;
  const paidAmount = parseFloat(purchaseData.paid_amount) || 0;
  const balanceAmount = totalAmount - paidAmount;
  const paymentMode = purchaseData.payment_mode || 'CASH';

  let insertedPurchaseId = null;

  const txn = db.transaction(() => {
    // 1. Insert purchase header
    const stmt = db.prepare(`
      INSERT INTO purchases (bill_number, purchase_date, supplier_id, total_amount, paid_amount, balance_amount, payment_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      purchaseData.bill_number,
      today,
      purchaseData.supplier_id,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentMode,
      purchaseData.notes || ''
    );
    insertedPurchaseId = info.lastInsertRowid;

    // 2. Insert items and add to stock
    const insertItem = db.prepare(`
      INSERT INTO purchase_items (purchase_id, product_id, item_name, hsn_code, quantity, unit_cost, gst_rate, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET current_stock = current_stock + ?, cost_price = ? WHERE id = ?
    `);

    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, notes)
      VALUES (?, 'PURCHASE', ?, ?, ?)
    `);

    for (const it of (purchaseData.items || [])) {
      insertItem.run(
        insertedPurchaseId,
        it.product_id || null,
        it.item_name,
        it.hsn_code || '6115',
        it.quantity,
        it.unit_cost,
        it.gst_rate || 5.0,
        it.total_amount || (it.quantity * it.unit_cost)
      );

      if (it.product_id) {
        updateStock.run(it.quantity, it.unit_cost, it.product_id);
        insertMovement.run(it.product_id, it.quantity, insertedPurchaseId, `Merchant Bill: ${purchaseData.bill_number}`);
      }
    }

    // 3. Update supplier balance (Payable: negative number in parties table)
    // We owe an additional balanceAmount
    if (balanceAmount > 0) {
      db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
        .run(balanceAmount, purchaseData.supplier_id);
    }

    // 4. If cash paid today, deduct from daily register
    if (paidAmount > 0 && paymentMode === 'CASH') {
      const reg = db.prepare('SELECT id, supplier_cash_payments, expected_closing_cash FROM daily_cash_register WHERE entry_date = ?').get(today);
      if (reg) {
        db.prepare(`
          UPDATE daily_cash_register SET
            supplier_cash_payments = supplier_cash_payments + ?,
            expected_closing_cash = expected_closing_cash - ?
          WHERE id = ?
        `).run(paidAmount, paidAmount, reg.id);
      }
    }
  });

  txn();
  return getPurchaseById(insertedPurchaseId);
}

function getPurchaseById(id) {
  const db = getDb();
  const purchase = db.prepare(`
    SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.gstin as supplier_gstin
    FROM purchases p
    JOIN parties s ON p.supplier_id = s.id
    WHERE p.id = ?
  `).get(id);

  if (!purchase) return null;
  purchase.items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id);
  return purchase;
}

function getAllPurchases(limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, s.name as supplier_name 
    FROM purchases p
    JOIN parties s ON p.supplier_id = s.id
    ORDER BY p.id DESC LIMIT ?
  `).all(limit);
}

module.exports = {
  createPurchase,
  getPurchaseById,
  getAllPurchases,
};
