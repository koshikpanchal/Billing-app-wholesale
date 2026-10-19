const { getDb } = require('../db');

function getSettings() {
  const db = getDb();
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

function updateSettings(settings) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE settings SET
      business_name = ?,
      trade_name = ?,
      gstin = ?,
      state = ?,
      state_code = ?,
      address_line1 = ?,
      address_line2 = ?,
      phone = ?,
      email = ?,
      invoice_prefix = ?,
      cash_memo_prefix = ?,
      financial_year = ?,
      terms_and_conditions = ?,
      bank_name = ?,
      bank_account_no = ?,
      bank_ifsc = ?,
      bank_branch = ?,
      upi_id = ?,
      bills_storage_path = ?,
      allow_negative_stock = ?
    WHERE id = 1
  `);

  stmt.run(
    settings.business_name || 'Jain Hosiery',
    settings.trade_name || '',
    settings.gstin || '',
    settings.state || 'Delhi',
    settings.state_code || '07',
    settings.address_line1 || '',
    settings.address_line2 || '',
    settings.phone || '',
    settings.email || '',
    settings.invoice_prefix || 'JH/',
    settings.cash_memo_prefix || 'CM/',
    settings.financial_year || '2026-27',
    settings.terms_and_conditions || '',
    settings.bank_name || '',
    settings.bank_account_no || '',
    settings.bank_ifsc || '',
    settings.bank_branch || '',
    settings.upi_id || '',
    settings.bills_storage_path || null,
    settings.allow_negative_stock ? 1 : 0
  );

  return getSettings();
}

module.exports = {
  getSettings,
  updateSettings,
};
