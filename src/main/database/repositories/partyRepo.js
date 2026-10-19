const { getDb } = require('../db');

function getAllParties(partyType = null) {
  const db = getDb();
  if (partyType) {
    return db.prepare("SELECT * FROM parties WHERE party_type = ? OR party_type = 'BOTH' ORDER BY name ASC").all(partyType);
  }
  return db.prepare('SELECT * FROM parties ORDER BY name ASC').all();
}

function getPartyById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
}

function createParty(party) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO parties (party_type, name, phone, email, address, state, state_code, gstin, credit_limit, current_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    party.party_type || 'CUSTOMER',
    party.name,
    party.phone || '',
    party.email || '',
    party.address || '',
    party.state || 'Delhi',
    party.state_code || '07',
    party.gstin || '',
    party.credit_limit || 0,
    party.current_balance || 0
  );

  return getPartyById(info.lastInsertRowid);
}

function updateParty(id, party) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE parties SET
      name = ?,
      phone = ?,
      email = ?,
      address = ?,
      state = ?,
      state_code = ?,
      gstin = ?,
      credit_limit = ?
    WHERE id = ?
  `);

  stmt.run(
    party.name,
    party.phone || '',
    party.email || '',
    party.address || '',
    party.state || 'Delhi',
    party.state_code || '07',
    party.gstin || '',
    party.credit_limit || 0,
    id
  );

  return getPartyById(id);
}

function recordPartyPayment({ partyId, amount, paymentMode = 'CASH', referenceNo = '', notes = '' }) {
  const db = getDb();
  const party = getPartyById(partyId);
  if (!party) throw new Error('Party not found');

  const today = new Date().toISOString().split('T')[0];
  const numAmount = parseFloat(amount) || 0;

  const txn = db.transaction(() => {
    // 1. Insert payment record
    const isCustomer = party.party_type === 'CUSTOMER';
    const txnType = isCustomer ? 'CREDIT_SETTLEMENT' : 'SUPPLIER_PAYMENT';

    db.prepare(`
      INSERT INTO payments (payment_date, party_id, party_type, transaction_type, amount, payment_mode, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(today, partyId, party.party_type, txnType, numAmount, paymentMode, referenceNo, notes);

    // 2. Update party current_balance
    // For Customer: balance reduces (they owe less)
    // For Supplier: balance increases towards 0 (we owe less, so -balance + payment = closer to 0)
    let newBalance = party.current_balance;
    if (isCustomer) {
      newBalance = party.current_balance - numAmount;
    } else {
      newBalance = party.current_balance + numAmount;
    }

    db.prepare('UPDATE parties SET current_balance = ? WHERE id = ?').run(newBalance, partyId);

    // 3. If Cash payment, update daily cash register
    if (paymentMode === 'CASH') {
      const reg = db.prepare('SELECT id, customer_cash_collections, supplier_cash_payments, expected_closing_cash FROM daily_cash_register WHERE entry_date = ?').get(today);
      if (reg) {
        if (isCustomer) {
          db.prepare(`
            UPDATE daily_cash_register SET
              customer_cash_collections = customer_cash_collections + ?,
              expected_closing_cash = expected_closing_cash + ?
            WHERE id = ?
          `).run(numAmount, numAmount, reg.id);
        } else {
          db.prepare(`
            UPDATE daily_cash_register SET
              supplier_cash_payments = supplier_cash_payments + ?,
              expected_closing_cash = expected_closing_cash - ?
            WHERE id = ?
          `).run(numAmount, numAmount, reg.id);
        }
      }
    }
  });

  txn();
  return getPartyById(partyId);
}

function getPartyStatement(partyId) {
  const db = getDb();
  const party = getPartyById(partyId);
  if (!party) return null;

  const invoices = db.prepare(`
    SELECT id, document_type, invoice_number as ref_no, invoice_date as date, grand_total as amount, paid_amount, balance_amount, 'SALE' as type
    FROM invoices WHERE party_id = ? ORDER BY invoice_date DESC
  `).all(partyId);

  const payments = db.prepare(`
    SELECT id, 'PAYMENT' as document_type, reference_no as ref_no, payment_date as date, amount, payment_mode, notes, 'PAYMENT' as type
    FROM payments WHERE party_id = ? ORDER BY payment_date DESC
  `).all(partyId);

  const purchases = db.prepare(`
    SELECT id, 'PURCHASE' as document_type, bill_number as ref_no, purchase_date as date, total_amount as amount, paid_amount, balance_amount, 'PURCHASE' as type
    FROM purchases WHERE supplier_id = ? ORDER BY purchase_date DESC
  `).all(partyId);

  const combined = [...invoices, ...payments, ...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    party,
    history: combined,
  };
}

module.exports = {
  getAllParties,
  getPartyById,
  createParty,
  updateParty,
  recordPartyPayment,
  getPartyStatement,
};
