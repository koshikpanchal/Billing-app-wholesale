const { getDb } = require('../db');

function getTodayRegister() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  let reg = db.prepare('SELECT * FROM daily_cash_register WHERE entry_date = ?').get(today);
  if (!reg) {
    // Find yesterday's closing cash to carry forward as today's opening cash!
    const lastClosing = db.prepare(`
      SELECT actual_closing_cash, expected_closing_cash 
      FROM daily_cash_register 
      WHERE entry_date < ? 
      ORDER BY entry_date DESC LIMIT 1
    `).get(today);

    const openingCash = lastClosing 
      ? (lastClosing.actual_closing_cash !== null ? lastClosing.actual_closing_cash : lastClosing.expected_closing_cash)
      : 10000;

    const stmt = db.prepare(`
      INSERT INTO daily_cash_register (
        entry_date, opening_cash, cash_sales, customer_cash_collections, 
        cash_expenses, supplier_cash_payments, cash_taken_home, expected_closing_cash, 
        online_sales_total, is_closed
      ) VALUES (?, ?, 0, 0, 0, 0, 0, ?, 0, 0)
    `);
    stmt.run(today, openingCash, openingCash);
    reg = db.prepare('SELECT * FROM daily_cash_register WHERE entry_date = ?').get(today);
  }

  return reg;
}

function recordExpense({ category, description = '', amount, paymentMode = 'CASH', date = null }) {
  const db = getDb();
  const expenseDate = date || new Date().toISOString().split('T')[0];
  const numAmount = parseFloat(amount) || 0;

  const txn = db.transaction(() => {
    // 1. Insert expense
    db.prepare(`
      INSERT INTO expenses (expense_date, category, description, amount, payment_mode)
      VALUES (?, ?, ?, ?, ?)
    `).run(expenseDate, category, description, numAmount, paymentMode);

    // 2. If Cash, deduct from daily register
    if (paymentMode === 'CASH') {
      const reg = getTodayRegister();
      if (reg) {
        db.prepare(`
          UPDATE daily_cash_register SET
            cash_expenses = cash_expenses + ?,
            expected_closing_cash = expected_closing_cash - ?
          WHERE id = ?
        `).run(numAmount, numAmount, reg.id);
      }
    }
  });

  txn();
  return { success: true };
}

function getExpenses(date = null) {
  const db = getDb();
  const d = date || new Date().toISOString().split('T')[0];
  return db.prepare('SELECT * FROM expenses WHERE expense_date = ? ORDER BY id DESC').all(d);
}

function updateCashTakenHome(amount) {
  const db = getDb();
  const reg = getTodayRegister();
  const numAmount = parseFloat(amount) || 0;

  // New expected = Opening + CashSales + CustCollections - Expenses - SupplierPaid - CashTakenHome
  const newExpected = reg.opening_cash + reg.cash_sales + reg.customer_cash_collections 
    - reg.cash_expenses - reg.supplier_cash_payments - numAmount;

  db.prepare(`
    UPDATE daily_cash_register SET
      cash_taken_home = ?,
      expected_closing_cash = ?
    WHERE id = ?
  `).run(numAmount, newExpected, reg.id);

  return getTodayRegister();
}

function closeDayRegister({ actualCash, notes = '' }) {
  const db = getDb();
  const reg = getTodayRegister();
  const numActual = parseFloat(actualCash) || 0;
  const variance = numActual - reg.expected_closing_cash;

  db.prepare(`
    UPDATE daily_cash_register SET
      actual_closing_cash = ?,
      variance = ?,
      is_closed = 1,
      closed_at = CURRENT_TIMESTAMP,
      notes = ?
    WHERE id = ?
  `).run(numActual, variance, notes, reg.id);

  return getTodayRegister();
}

function getDashboardStats() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const todayBills = db.prepare(`
    SELECT 
      COUNT(*) as total_bills,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN paid_amount ELSE 0 END), 0) as cash_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'ONLINE' THEN paid_amount ELSE 0 END), 0) as online_sales
    FROM invoices 
    WHERE invoice_date = ? AND status != 'CANCELLED'
  `).get(today);

  const dues = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as customer_receivables,
      COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0) as supplier_payables
    FROM parties
  `).get();

  const register = getTodayRegister();
  const recentInvoices = db.prepare(`
    SELECT id, document_type, invoice_number, invoice_date, customer_name, grand_total, payment_mode, status
    FROM invoices 
    ORDER BY id DESC LIMIT 8
  `).all();

  return {
    todaySales: todayBills.total_sales,
    todayBillCount: todayBills.total_bills,
    cashSales: todayBills.cash_sales,
    onlineSales: todayBills.online_sales,
    customerReceivables: dues.customer_receivables,
    supplierPayables: dues.supplier_payables,
    register,
    recentInvoices,
  };
}

module.exports = {
  getTodayRegister,
  recordExpense,
  getExpenses,
  updateCashTakenHome,
  closeDayRegister,
  getDashboardStats,
};
