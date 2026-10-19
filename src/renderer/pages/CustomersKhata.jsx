import React, { useState, useEffect } from 'react';
import { Users, IndianRupee, Plus, Phone, MapPin, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CustomersKhata() {
  const { t } = useApp();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Forms
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '', state: 'Delhi', gstin: '', initial_balance: '' });
  const [payData, setPayData] = useState({ amount: '', payment_mode: 'CASH', reference_no: '', notes: '' });

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
    if (!payData.amount || parseFloat(payData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await window.api.parties.recordPayment({
        partyId: selectedCustomer.id,
        amount: parseFloat(payData.amount),
        paymentMode: payData.payment_mode, // CASH or ONLINE
        referenceNo: payData.reference_no,
        notes: payData.notes,
      });

      setShowPayModal(false);
      setPayData({ amount: '', payment_mode: 'CASH', reference_no: '', notes: '' });
      fetchCustomers();
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    }
  };

  const totalUdhar = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

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
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13, color: '#94a3b8' }}>
            CUSTOMERS ({customers.length})
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {customers.map((c) => (
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
            ))}
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
