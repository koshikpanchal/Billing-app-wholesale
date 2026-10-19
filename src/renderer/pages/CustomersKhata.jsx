import React, { useState, useEffect } from 'react';
import { Users, IndianRupee, Plus, Phone, MapPin, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock, Printer, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

function generateUdharReceiptHtml(customer, prevBalance, amountPaid, newBalance, paymentMode, referenceNo, notes, settings = {}) {
  const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${receiptNo}</title>
  <style>
    @page {
      size: 105mm 148mm;
      margin: 6mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.35;
    }
    .receipt-card {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .header {
      text-align: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .biz-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .biz-sub {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
    }
    .biz-contact {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 10px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 10.5px;
    }
    .info-col strong {
      color: #334155;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .ledger-table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
    }
    .ledger-table .label-cell {
      font-weight: 600;
      color: #334155;
      background: #f8fafc;
      width: 60%;
    }
    .ledger-table .val-cell {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
      font-size: 12px;
    }
    .received-row {
      background: #f0fdf4 !important;
    }
    .received-row td {
      border: 1.5px solid #16a34a;
      color: #15803d;
      font-size: 13px !important;
    }
    .due-row {
      background: #fef2f2 !important;
    }
    .due-row td {
      border: 1.5px solid #dc2626;
      color: #b91c1c;
      font-size: 13px !important;
    }
    .notes-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 10px;
      color: #475569;
      margin-bottom: 12px;
    }
    .footer-sign {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      padding-top: 6px;
    }
    .sign-box {
      text-align: right;
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="biz-title">${settings.business_name || 'JAIN HOSIERY'}</div>
      <div class="biz-sub">${settings.trade_name || 'Wholesale & Retail Hosiery Specialist'}</div>
      <div class="biz-contact">${settings.address_line1 || 'Gandhi Nagar, Main Road'}, ${settings.address_line2 || 'Delhi - 110031'} | Ph: ${settings.phone || '+91 98765 43210'}</div>
      <div class="doc-badge">CASH RECEIVED ON UDHAAR / रसीद</div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <div><strong>Customer:</strong> <span style="font-size: 12px; font-weight: 700;">${customer.name}</span></div>
        ${customer.phone ? `<div><strong>Phone:</strong> ${customer.phone}</div>` : ''}
        ${customer.address ? `<div><strong>Address:</strong> ${customer.address}</div>` : ''}
      </div>
      <div class="info-col" style="text-align: right;">
        <div><strong>Receipt No:</strong> <span style="font-family: monospace; font-weight: 700;">${receiptNo}</span></div>
        <div><strong>Date:</strong> ${dateStr}</div>
        <div><strong>Time:</strong> ${timeStr}</div>
      </div>
    </div>

    <table class="ledger-table">
      <tbody>
        <tr>
          <td class="label-cell">Previous Udhar Balance (पिछला बकाया):</td>
          <td class="val-cell">₹${prevBalance.toFixed(2)}</td>
        </tr>
        <tr class="received-row">
          <td class="label-cell" style="color: #15803d; font-weight: 800;">
            Amount Received (प्राप्त राशि):<br>
            <span style="font-size: 9px; font-weight: 600;">Mode: ${paymentMode}${referenceNo ? ` | Ref: ${referenceNo}` : ''}</span>
          </td>
          <td class="val-cell">₹${amountPaid.toFixed(2)}</td>
        </tr>
        <tr class="due-row">
          <td class="label-cell" style="color: #b91c1c; font-weight: 800;">Remaining Balance Due (शेष बकाया):</td>
          <td class="val-cell">₹${newBalance.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    ${notes ? `
      <div class="notes-box">
        <strong>Remarks / Notes:</strong> ${notes}
      </div>
    ` : ''}

    <div class="footer-sign">
      <div style="font-size: 9px; color: #64748b;">
        Thank you for your payment!<br>
        भुगतान के लिए धन्यवाद!
      </div>
      <div class="sign-box">
        For ${settings.business_name || 'Jain Hosiery'}<br><br><br>
        Authorized Signatory
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function CustomersKhata() {
  const { t } = useApp();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(true);

  // Forms
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '', state: 'Delhi', gstin: '', initial_balance: '' });
  const [payData, setPayData] = useState({ amount: '', payment_mode: 'CASH', reference_no: '', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.parties) {
        const list = await window.api.parties.getAll('CUSTOMER');
        setCustomers(list || []);

        if (selectedCustomer) {
          loadStatement(selectedCustomer.id);
        } else if (list && list.length > 0) {
          loadStatement(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (id) => {
    try {
      const data = await window.api.parties.getStatement(id);
      setSelectedCustomer(data?.party || null);
      setStatement(data?.history || []);
    } catch (err) {
      console.error('Failed to load customer statement:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;

    try {
      await window.api.parties.create({
        party_type: 'CUSTOMER',
        name: newCust.name,
        phone: newCust.phone,
        address: newCust.address,
        state: newCust.state || 'Delhi',
        gstin: newCust.gstin,
        current_balance: parseFloat(newCust.initial_balance) || 0,
      });

      setShowAddModal(false);
      setNewCust({ name: '', phone: '', address: '', state: 'Delhi', gstin: '', initial_balance: '' });
      fetchCustomers();
    } catch (err) {
      alert('Error creating customer: ' + err.message);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const paid = parseFloat(payData.amount);
    if (!paid || paid <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const prevBal = Number(selectedCustomer?.current_balance || 0);
      const newBal = Math.max(0, prevBal - paid);

      await window.api.parties.recordPayment({
        partyId: selectedCustomer.id,
        amount: paid,
        paymentMode: payData.payment_mode, // CASH or ONLINE
        referenceNo: payData.reference_no,
        notes: payData.notes,
      });

      // Optional print receipt for cash received on udhar
      if (printReceipt && window.api?.print?.printBill) {
        let settings = {};
        try {
          if (window.api?.settings?.get) {
            settings = await window.api.settings.get();
          }
        } catch (sErr) {}

        const receiptHtml = generateUdharReceiptHtml(
          selectedCustomer,
          prevBal,
          paid,
          newBal,
          payData.payment_mode,
          payData.reference_no,
          payData.notes,
          settings
        );

        await window.api.print.printBill(receiptHtml);
      }

      setShowPayModal(false);
      setPayData({ amount: '', payment_mode: 'CASH', reference_no: '', notes: '' });
      fetchCustomers();
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    }
  };

  const totalUdhar = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Bar */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Customer Khata (Credit Ledger)</h2>
            <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
              Track customer balances, credit purchases (Udhar), and record payments in Cash or Online.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#1e293b', padding: '6px 14px', borderRadius: 8, fontSize: 13 }}>
              Total Outstanding: <strong style={{ color: '#f87171', fontFamily: 'var(--font-mono)' }}>₹{totalUdhar.toFixed(2)}</strong>
            </div>

            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> New Customer
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Customer List on Left, Statement Ledger on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 20 }}>
        {/* Customer Directory */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>CUSTOMERS ({filteredCustomers.length})</span>
            {searchQuery && (
              <span style={{ fontSize: 11, color: '#38bdf8' }}>Filtered ({filteredCustomers.length} of {customers.length})</span>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0, 0, 0, 0.15)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                className="input input-sm" 
                placeholder="Search by name, phone, address..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 30, width: '100%', fontSize: 12 }}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
                No customers found matching "{searchQuery}"
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => loadStatement(c.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #1a2436',
                    cursor: 'pointer',
                    background: selectedCustomer?.id === c.id ? '#172338' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.15s ease'
                  }}
                >
                <div>
                  <strong style={{ color: '#fff', fontSize: 14 }}>{c.name}</strong>
                  {c.phone && <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.phone}</div>}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontWeight: 700,
                    fontSize: 14,
                    color: c.current_balance > 0 ? '#f87171' : '#34d399'
                  }}>
                    ₹{c.current_balance.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {c.current_balance > 0 ? 'Pending Due' : 'All Clear'}
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        {/* Selected Customer Statement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedCustomer ? (
            <>
              {/* Profile Card */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>{selectedCustomer.name}</h3>
                  <div style={{ display: 'flex', gap: 14, color: '#94a3b8', fontSize: 12.5, marginTop: 4 }}>
                    {selectedCustomer.phone && <span><Phone size={13} style={{ display: 'inline', marginRight: 4 }} />{selectedCustomer.phone}</span>}
                    {selectedCustomer.address && <span><MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />{selectedCustomer.address}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Current Balance</div>
                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 800, 
                      fontFamily: 'var(--font-mono)',
                      color: selectedCustomer.current_balance > 0 ? '#f87171' : '#34d399'
                    }}>
                      ₹{selectedCustomer.current_balance.toFixed(2)}
                    </div>
                  </div>

                  <button className="btn btn-success" onClick={() => setShowPayModal(true)}>
                    <IndianRupee size={16} /> {t('receivePaymentBtn')}
                  </button>
                </div>
              </div>

              {/* Ledger Statement Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13, color: '#94a3b8' }}>
                  TRANSACTION & PAYMENT HISTORY
                </div>

                <div className="table-container" style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type / Document</th>
                        <th>Reference</th>
                        <th style={{ textAlign: 'right' }}>Sale Amount (+)</th>
                        <th style={{ textAlign: 'right' }}>Payment (-)</th>
                        <th>Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!statement || statement.length === 0) ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                            No past transactions for this customer.
                          </td>
                        </tr>
                      ) : (
                        statement.map((tx, idx) => (
                          <tr key={idx}>
                            <td>{tx.date}</td>
                            <td>
                              <span className={`badge ${tx.type === 'SALE' ? 'badge-cash-memo' : 'badge-gst'}`}>
                                {tx.type === 'SALE' ? 'Sale Bill' : 'Payment Received'}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{tx.ref_no || '-'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: tx.type === 'SALE' ? '#f87171' : '#94a3b8' }}>
                              {tx.type === 'SALE' ? `₹${tx.amount.toFixed(2)}` : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: tx.type === 'PAYMENT' ? '#34d399' : '#94a3b8', fontWeight: tx.type === 'PAYMENT' ? 700 : 400 }}>
                              {tx.type === 'PAYMENT' ? `₹${tx.amount.toFixed(2)}` : '-'}
                            </td>
                            <td>
                              {tx.payment_mode ? (
                                <span className={`badge ${tx.payment_mode === 'CASH' ? 'badge-cash' : 'badge-online'}`}>
                                  {tx.payment_mode}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Select a customer from the left list to view their ledger statement.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Add New Customer Profile</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Ramesh Kumar"
                    value={newCust.name}
                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="input input-mono" 
                    placeholder="10-digit mobile"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="City / Area"
                    value={newCust.address}
                    onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input 
                      type="text" 
                      className="input input-mono" 
                      placeholder="GSTIN if any"
                      value={newCust.gstin}
                      onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opening Balance (Udhar ₹)</label>
                    <input 
                      type="number" 
                      className="input input-mono" 
                      placeholder="0.00"
                      value={newCust.initial_balance}
                      onChange={(e) => setNewCust({ ...newCust, initial_balance: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {showPayModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <span className="modal-title">Receive Payment from {selectedCustomer.name}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{ 
                  background: '#1e293b', 
                  borderRadius: 8, 
                  padding: 12, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Current Outstanding Due:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                    ₹{selectedCustomer.current_balance.toFixed(2)}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Received (₹) *</label>
                  <input 
                    type="number" 
                    className="input input-mono"
                    placeholder={`e.g. ${selectedCustomer.current_balance}`}
                    value={payData.amount}
                    onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Mode (Strictly Cash or Online)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      className={`btn ${payData.payment_mode === 'CASH' ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => setPayData({ ...payData, payment_mode: 'CASH' })}
                    >
                      CASH (Drawer +)
                    </button>
                    <button
                      type="button"
                      className={`btn ${payData.payment_mode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPayData({ ...payData, payment_mode: 'ONLINE' })}
                    >
                      ONLINE (UPI/Bank)
                    </button>
                  </div>
                </div>

                {payData.payment_mode === 'ONLINE' && (
                  <div className="form-group">
                    <label className="form-label">UPI Reference / UTR Number</label>
                    <input 
                      type="text" 
                      className="input input-mono"
                      placeholder="e.g. UPI/1234567890"
                      value={payData.reference_no}
                      onChange={(e) => setPayData({ ...payData, reference_no: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input 
                    type="text" 
                    className="input"
                    placeholder="e.g. Full settlement / Partial payment"
                    value={payData.notes}
                    onChange={(e) => setPayData({ ...payData, notes: e.target.value })}
                  />
                </div>

                {/* Optional Print Receipt Checkbox */}
                <div style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <input 
                    type="checkbox" 
                    id="printUdharReceiptCheck"
                    checked={printReceipt}
                    onChange={(e) => setPrintReceipt(e.target.checked)}
                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  <label 
                    htmlFor="printUdharReceiptCheck" 
                    style={{ fontSize: 13, cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                  >
                    <Printer size={15} color="#3b82f6" />
                    Print Cash Receipt for Udhar (उधार रसीद प्रिंट करें)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
