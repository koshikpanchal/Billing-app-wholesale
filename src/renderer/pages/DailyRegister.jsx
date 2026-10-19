import React, { useState, useEffect } from 'react';
import { 
  Wallet, IndianRupee, ArrowUpRight, ArrowDownLeft, 
  Home, CheckCircle, AlertTriangle, Plus, Lock, Calendar, FolderOpen 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DailyRegister() {
  const { t } = useApp();
  const [register, setRegister] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [cashHome, setCashHome] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseData, setExpenseData] = useState({
    category: 'Tea & Refreshment',
    description: '',
    amount: '',
    payment_mode: 'CASH',
  });

  const fetchRegister = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.register) {
        const [reg, expList] = await Promise.all([
          window.api.register.getToday(),
          window.api.register.getExpenses(),
        ]);
        setRegister(reg);
        setExpenses(expList || []);
        if (reg) {
          setCashHome(reg.cash_taken_home || '');
          if (reg.actual_closing_cash !== null) {
            setActualCash(reg.actual_closing_cash);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister();
  }, []);

  const handleUpdateCashHome = async () => {
    try {
      const amt = parseFloat(cashHome) || 0;
      const updated = await window.api.register.updateCashTakenHome(amt);
      setRegister(updated);
      alert('Updated cash taken home.');
    } catch (err) {
      alert('Error updating cash taken home: ' + err.message);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseData.amount || parseFloat(expenseData.amount) <= 0) {
      alert('Please enter valid amount');
      return;
    }

    try {
      await window.api.register.recordExpense({
        category: expenseData.category,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        paymentMode: expenseData.payment_mode, // CASH or ONLINE
      });

      setShowExpenseModal(false);
      setExpenseData({ category: 'Tea & Refreshment', description: '', amount: '', payment_mode: 'CASH' });
      fetchRegister();
    } catch (err) {
      alert('Error adding expense: ' + err.message);
    }
  };

  const handleCloseDay = async () => {
    if (!actualCash && actualCash !== 0) {
      alert('Please count and enter the actual physical cash present in the drawer.');
      return;
    }

    const confirm = window.confirm(
      'Are you sure you want to close the cash register for today? This balance will automatically carry forward as tomorrow morning opening cash, and a full database backup will automatically be saved to the backup folder.'
    );
    if (!confirm) return;

    try {
      const updated = await window.api.register.closeDay({
        actualCash: parseFloat(actualCash),
        notes: closingNotes,
      });
      setRegister(updated);

      let backupMsg = '';
      if (updated?.autoBackup?.success) {
        backupMsg = `\n\n💾 Database automatically backed up to:\n${updated.autoBackup.backupFilePath}`;
      }
      alert('Register closed & locked for today! Opening cash for tomorrow has been secured.' + backupMsg);
    } catch (err) {
      alert('Error closing register: ' + err.message);
    }
  };

  if (loading || !register) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading cash register...</div>;
  }

  const expected = register.expected_closing_cash;
  const counted = actualCash !== '' ? parseFloat(actualCash) : null;
  const variance = counted !== null ? (counted - expected) : (register.variance || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Daily Cash Register & Day-End Closing</h2>
              {register.is_closed ? (
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                  <Lock size={12} /> Closed for Today
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>
                  Open & Active
                </span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
              Date: <strong>{register.entry_date}</strong>. Reconciles physical currency notes, expenses, and carry-forward.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => window.api.files.openBackupFolder?.()}>
              <FolderOpen size={16} /> {t('backupFolder')}
            </button>
            <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
              <Plus size={16} /> Record Daily Expense
            </button>
          </div>
        </div>
      </div>

      {/* Main Drawer Calculation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Left Column: Calculation Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            Physical Drawer Cash Calculation
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            {/* 1. Opening Cash */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#172236', borderRadius: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                <Wallet size={16} color="#60a5fa" /> Opening Cash (From Yesterday)
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#fff' }}>
                ₹{register.opening_cash.toFixed(2)}
              </strong>
            </div>

            {/* 2. Cash Inflows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399' }}>
                <ArrowUpRight size={16} /> (+) Today's Cash Sales
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#34d399' }}>
                +₹{register.cash_sales.toFixed(2)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399' }}>
                <ArrowUpRight size={16} /> (+) Customer Cash Collections (Udhar Paid)
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#34d399' }}>
                +₹{register.customer_cash_collections.toFixed(2)}
              </strong>
            </div>

            {/* 3. Cash Outflows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
                <ArrowDownLeft size={16} /> (-) Daily Cash Expenses (Tea, snacks, overhead)
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#f87171' }}>
                -₹{register.cash_expenses.toFixed(2)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
                <ArrowDownLeft size={16} /> (-) Supplier / Merchant Cash Paid
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#f87171' }}>
                -₹{register.supplier_cash_payments.toFixed(2)}
              </strong>
            </div>

            {/* 4. Cash Taken Home */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 14px', 
              background: '#1e293b', 
              borderRadius: 8,
              border: '1px solid #334155'
            }}>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#facc15', fontWeight: 600 }}>
                  <Home size={16} /> (-) Cash Taken Home by Owner
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Carried home tonight so remaining stays in drawer
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="number" 
                  className="input input-mono"
                  style={{ width: 120, textAlign: 'right', padding: '6px 8px' }}
                  placeholder="0.00"
                  value={cashHome}
                  onChange={(e) => setCashHome(e.target.value)}
                  disabled={register.is_closed}
                />
                {!register.is_closed && (
                  <button className="btn btn-secondary btn-sm" onClick={handleUpdateCashHome}>
                    Set
                  </button>
                )}
              </div>
            </div>

            {/* Expected Closing Cash */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 18px', 
              background: '#0d131f', 
              borderRadius: 10,
              border: '2px solid #3b82f6',
              marginTop: 6
            }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                  Expected Closing Cash in Drawer:
                </span>
                <span style={{ display: 'block', fontSize: 12, color: '#94a3b8' }}>
                  This amount will be tomorrow morning's opening cash
                </span>
              </div>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: '#38bdf8' }}>
                ₹{expected.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Counting & Day Closing + Online Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Day End Physical Count Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              Physical Drawer Reconciliation
            </h3>

            <div className="form-group">
              <label className="form-label">Actual Physical Cash Counted in Drawer (₹) *</label>
              <input 
                type="number" 
                className="input input-mono"
                style={{ fontSize: 18, fontWeight: 700 }}
                placeholder={`Expected: ₹${expected.toFixed(2)}`}
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                disabled={register.is_closed}
              />
            </div>

            {counted !== null && (
              <div style={{ 
                padding: 12, 
                borderRadius: 8, 
                background: variance === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${variance === 0 ? '#059669' : '#dc2626'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {variance === 0 ? 'Cash Matches Exactly!' : (variance > 0 ? 'Excess Cash in Drawer:' : 'Cash Shortage:')}
                </span>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 800,
                  fontSize: 16,
                  color: variance === 0 ? '#34d399' : '#f87171' 
                }}>
                  {variance > 0 ? `+₹${variance.toFixed(2)}` : `₹${variance.toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Closing Notes / Remarks</label>
              <input 
                type="text" 
                className="input"
                placeholder="e.g. Verified by Koshik Jain"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                disabled={register.is_closed}
              />
            </div>

            {!register.is_closed ? (
              <button 
                className="btn btn-success btn-lg" 
                style={{ width: '100%', fontWeight: 800 }}
                onClick={handleCloseDay}
              >
                <Lock size={18} /> Close Register & Lock Day
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, padding: 12, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <div>
                  <CheckCircle size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Day is Closed & Locked. Tomorrow morning starts with ₹{(register.actual_closing_cash || expected).toFixed(2)}.
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                  Automatic DB Backup: <code style={{ color: '#38bdf8' }}>jain_hosiery_backup_{register.entry_date}.sqlite</code>
                </div>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.api.files.openBackupFolder?.()}
                >
                  <FolderOpen size={15} /> {t('backupFolder')}
                </button>
              </div>
            )}
          </div>

          {/* Independent Online Collections Card */}
          <div className="card" style={{ background: '#0e1828', border: '1px solid #1e3a8a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                {t('onlineCollections')}
              </span>
              <IndianRupee size={16} color="#38bdf8" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
              ₹{(register.online_sales_total || 0).toFixed(2)}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Received directly in bank / QR code. Kept separate from physical cash in drawer.
            </p>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: 14, fontWeight: 700 }}>Today's Expenses Log</h4>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Total Recorded: ₹{expenses.reduce((acc, x) => acc + x.amount, 0).toFixed(2)}
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Paid Mode</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No expenses recorded today. Click "Record Daily Expense" to add.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td><strong>{exp.category}</strong></td>
                    <td style={{ color: '#cbd5e1' }}>{exp.description || '-'}</td>
                    <td>
                      <span className={`badge ${exp.payment_mode === 'CASH' ? 'badge-cash' : 'badge-online'}`}>
                        {exp.payment_mode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f87171' }}>
                      ₹{exp.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title">Record Daily Shop Expense</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Expense Category</label>
                  <select 
                    className="select"
                    value={expenseData.category}
                    onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                  >
                    <option value="Tea & Refreshment">Tea & Refreshment</option>
                    <option value="Electricity / Utility">Electricity / Utility</option>
                    <option value="Shop Maintenance">Shop Maintenance</option>
                    <option value="Staff / Helper Salary">Staff / Helper Salary</option>
                    <option value="Freight & Transport">Freight & Transport</option>
                    <option value="Packaging & Bags">Packaging & Bags</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Note</label>
                  <input 
                    type="text" 
                    className="input"
                    placeholder="e.g. Evening tea for guests"
                    value={expenseData.description}
                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input 
                    type="number" 
                    className="input input-mono"
                    placeholder="0.00"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Paid Via (Strictly Cash or Online)</label>
                  <select 
                    className="select"
                    value={expenseData.payment_mode}
                    onChange={(e) => setExpenseData({ ...expenseData, payment_mode: e.target.value })}
                  >
                    <option value="CASH">CASH (Deducts from drawer)</option>
                    <option value="ONLINE">ONLINE (UPI/Bank)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
