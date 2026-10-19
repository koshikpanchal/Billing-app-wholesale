import React, { useState, useEffect } from 'react';
import { Truck, Plus, IndianRupee, Package, Phone, CheckCircle, ArrowRight, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SuppliersKhata() {
  const { t } = useApp();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [statement, setStatement] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Forms
  const [newSupp, setNewSupp] = useState({ name: '', phone: '', address: '', state: 'Punjab', gstin: '', initial_balance: '' });
  const [payData, setPayData] = useState({ amount: '', payment_mode: 'CASH', reference_no: '', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // New Purchase Form
  const [purchaseBillNo, setPurchaseBillNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [purchasePaid, setPurchasePaid] = useState('');
  const [purchasePaymentMode, setPurchasePaymentMode] = useState('CASH');

  // Purchase Item Entry
  const [itemProdId, setItemProdId] = useState('');
  const [itemProdName, setItemProdName] = useState('');
  const [itemQty, setItemQty] = useState(10);
  const [itemCost, setItemCost] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.parties) {
        const [suppList, prodList] = await Promise.all([
          window.api.parties.getAll('SUPPLIER'),
          window.api.products.getAll(),
        ]);
        setSuppliers(suppList || []);
        setProducts(prodList || []);

        if (selectedSupplier) {
          loadStatement(selectedSupplier.id);
        } else if (suppList && suppList.length > 0) {
          loadStatement(suppList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (id) => {
    try {
      const data = await window.api.parties.getStatement(id);
      setSelectedSupplier(data?.party || null);
      setStatement(data?.history || []);
    } catch (err) {
      console.error('Failed to load supplier statement:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!newSupp.name.trim()) return;

    try {
      await window.api.parties.create({
        party_type: 'SUPPLIER',
        name: newSupp.name,
        phone: newSupp.phone,
        address: newSupp.address,
        state: newSupp.state,
        gstin: newSupp.gstin,
        current_balance: -Math.abs(parseFloat(newSupp.initial_balance) || 0),
      });

      setShowAddSupplier(false);
      setNewSupp({ name: '', phone: '', address: '', state: 'Punjab', gstin: '', initial_balance: '' });
      fetchSuppliers();
    } catch (err) {
      alert('Error creating supplier: ' + err.message);
    }
  };

  const handleAddPurchaseItem = () => {
    if (!itemProdName && !itemProdId) return;
    const prod = products.find(p => p.id === parseInt(itemProdId, 10));
    const name = prod ? prod.name : itemProdName;
    const cost = parseFloat(itemCost) || (prod ? prod.cost_price : 0);
    const qty = parseFloat(itemQty) || 1;

    setPurchaseItems([
      ...purchaseItems,
      {
        product_id: prod ? prod.id : null,
        item_name: name,
        quantity: qty,
        unit_cost: cost,
        total_amount: cost * qty,
      }
    ]);

    setItemProdId('');
    setItemProdName('');
    setItemQty(10);
    setItemCost('');
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const totalAmt = purchaseItems.reduce((acc, it) => acc + it.total_amount, 0);
    const paidAmt = purchasePaid === '' ? totalAmt : parseFloat(purchasePaid) || 0;

    try {
      await window.api.purchases.create({
        bill_number: purchaseBillNo || `PB-${Date.now().toString().slice(-4)}`,
        purchase_date: purchaseDate,
        supplier_id: selectedSupplier.id,
        items: purchaseItems,
        total_amount: totalAmt,
        paid_amount: paidAmt,
        payment_mode: purchasePaymentMode, // CASH or ONLINE
      });

      setShowPurchaseModal(false);
      setPurchaseItems([]);
      setPurchaseBillNo('');
      setPurchasePaid('');
      fetchSuppliers();
      alert('Purchase recorded! Stock updated and supplier ledger updated.');
    } catch (err) {
      alert('Error recording purchase: ' + err.message);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payData.amount || parseFloat(payData.amount) <= 0) return;

    try {
      await window.api.parties.recordPayment({
        partyId: selectedSupplier.id,
        amount: parseFloat(payData.amount),
        paymentMode: payData.payment_mode, // CASH or ONLINE
        referenceNo: payData.reference_no,
        notes: payData.notes,
      });

      setShowPayModal(false);
      setPayData({ amount: '', payment_mode: 'CASH', reference_no: '', notes: '' });
      fetchSuppliers();
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    }
  };

  const totalOwed = suppliers.reduce((acc, s) => acc + (s.current_balance < 0 ? Math.abs(s.current_balance) : 0), 0);

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.gstin && s.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Bar */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Merchant & Supplier Khata (Payables)</h2>
            <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
              Record stock purchases from mills/merchants, update inventory, and track dues owed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#1e293b', padding: '6px 14px', borderRadius: 8, fontSize: 13 }}>
              Total Dues Owed: <strong style={{ color: '#c084fc', fontFamily: 'var(--font-mono)' }}>₹{totalOwed.toFixed(2)}</strong>
            </div>

            <button className="btn btn-primary" onClick={() => setShowAddSupplier(true)}>
              <Plus size={16} /> New Merchant
            </button>
          </div>
        </div>
      </div>

      {/* Main Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 20 }}>
        {/* Supplier List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>MERCHANTS & MILLS ({filteredSuppliers.length})</span>
            {searchQuery && (
              <span style={{ fontSize: 11, color: '#c084fc' }}>Filtered ({filteredSuppliers.length} of {suppliers.length})</span>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0, 0, 0, 0.15)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                className="input input-sm" 
                placeholder="Search merchant by name, phone, city..." 
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
            {filteredSuppliers.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
                No merchants found matching "{searchQuery}"
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const owed = Math.abs(s.current_balance);
                return (
                  <div 
                    key={s.id}
                    onClick={() => loadStatement(s.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #1a2436',
                      cursor: 'pointer',
                      background: selectedSupplier?.id === s.id ? '#172338' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.15s ease'
                    }}
                  >
                  <div>
                    <strong style={{ color: '#fff', fontSize: 14 }}>{s.name}</strong>
                    {s.address && <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.address}</div>}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700,
                      fontSize: 14,
                      color: s.current_balance < 0 ? '#c084fc' : '#34d399'
                    }}>
                      ₹{owed.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>
                      {s.current_balance < 0 ? 'We Owe' : 'Settled'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Selected Supplier View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedSupplier ? (
            <>
              {/* Profile Card */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>{selectedSupplier.name}</h3>
                  <div style={{ display: 'flex', gap: 14, color: '#94a3b8', fontSize: 12.5, marginTop: 4 }}>
                    {selectedSupplier.phone && <span><Phone size={13} style={{ display: 'inline', marginRight: 4 }} />{selectedSupplier.phone}</span>}
                    {selectedSupplier.gstin && <span>GSTIN: {selectedSupplier.gstin}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Amount We Owe</div>
                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 800, 
                      fontFamily: 'var(--font-mono)',
                      color: '#c084fc'
                    }}>
                      ₹{Math.abs(selectedSupplier.current_balance).toFixed(2)}
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={() => setShowPurchaseModal(true)}>
                    <Package size={16} /> New Stock Purchase
                  </button>

                  <button className="btn btn-success" onClick={() => setShowPayModal(true)}>
                    <IndianRupee size={16} /> {t('payMerchantBtn')}
                  </button>
                </div>
              </div>

              {/* Transactions History */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13, color: '#94a3b8' }}>
                  PURCHASES & SETTLEMENT HISTORY
                </div>

                <div className="table-container" style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Bill / Ref No</th>
                        <th style={{ textAlign: 'right' }}>Purchase Bill (+)</th>
                        <th style={{ textAlign: 'right' }}>Payment Paid (-)</th>
                        <th>Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!statement || statement.length === 0) ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                            No past transactions with this supplier.
                          </td>
                        </tr>
                      ) : (
                        statement.map((tx, idx) => (
                          <tr key={idx}>
                            <td>{tx.date}</td>
                            <td>
                              <span className={`badge ${tx.type === 'PURCHASE' ? 'badge-batch' : 'badge-gst'}`}>
                                {tx.type === 'PURCHASE' ? 'Stock Purchase' : 'Supplier Payment'}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{tx.ref_no || '-'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: tx.type === 'PURCHASE' ? '#c084fc' : '#94a3b8' }}>
                              {tx.type === 'PURCHASE' ? `₹${tx.amount.toFixed(2)}` : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: tx.type === 'PAYMENT' ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
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
              Select a supplier on the left to view statement.
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Add Merchant / Mill Profile</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddSupplier(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Merchant Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Vardhman Mills Ludhiana"
                    value={newSupp.name}
                    onChange={(e) => setNewSupp({ ...newSupp, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="text" 
                    className="input input-mono" 
                    placeholder="Mobile number"
                    value={newSupp.phone}
                    onChange={(e) => setNewSupp({ ...newSupp, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address / City</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Ludhiana, Punjab"
                    value={newSupp.address}
                    onChange={(e) => setNewSupp({ ...newSupp, address: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input 
                      type="text" 
                      className="input input-mono" 
                      value={newSupp.gstin}
                      onChange={(e) => setNewSupp({ ...newSupp, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Amount Owed (₹)</label>
                    <input 
                      type="number" 
                      className="input input-mono" 
                      placeholder="0.00"
                      value={newSupp.initial_balance}
                      onChange={(e) => setNewSupp({ ...newSupp, initial_balance: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSupplier(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Merchant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Purchase Modal */}
      {showPurchaseModal && selectedSupplier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <span className="modal-title">Record Stock Purchase from {selectedSupplier.name}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPurchaseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePurchase}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Supplier Bill / Invoice No *</label>
                    <input 
                      type="text" 
                      className="input input-mono"
                      placeholder="e.g. VM-9842"
                      value={purchaseBillNo}
                      onChange={(e) => setPurchaseBillNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input 
                      type="date" 
                      className="input input-mono"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Item Entry Row */}
                <div style={{ background: '#0d131f', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                    ADD PURCHASED ITEMS (ADDS TO STOCK)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px', gap: 8, alignItems: 'flex-end' }}>
                    <div className="form-group">
                      <label className="form-label">Product</label>
                      <select 
                        className="select" 
                        value={itemProdId}
                        onChange={(e) => {
                          setItemProdId(e.target.value);
                          const p = products.find(x => x.id === parseInt(e.target.value, 10));
                          if (p) {
                            setItemProdName(p.name);
                            setItemCost(p.cost_price || '');
                          }
                        }}
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Qty</label>
                      <input 
                        type="number" 
                        className="input input-mono" 
                        value={itemQty}
                        onChange={(e) => setItemQty(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cost (₹)</label>
                      <input 
                        type="number" 
                        className="input input-mono" 
                        value={itemCost}
                        onChange={(e) => setItemCost(e.target.value)}
                      />
                    </div>

                    <button type="button" className="btn btn-primary" onClick={handleAddPurchaseItem}>
                      Add
                    </button>
                  </div>
                </div>

                {/* Items Added Table */}
                {purchaseItems.length > 0 && (
                  <table className="data-table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Cost</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseItems.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.item_name}</td>
                          <td>{it.quantity}</td>
                          <td>₹{it.unit_cost}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{it.total_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Payment split */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Amount Paid Now (₹)</label>
                    <input 
                      type="number" 
                      className="input input-mono"
                      placeholder="Leave blank for full credit"
                      value={purchasePaid}
                      onChange={(e) => setPurchasePaid(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Paid Via (Strictly Cash or Online)</label>
                    <select 
                      className="select"
                      value={purchasePaymentMode}
                      onChange={(e) => setPurchasePaymentMode(e.target.value)}
                    >
                      <option value="CASH">CASH (Deducts from drawer)</option>
                      <option value="ONLINE">ONLINE (UPI/Bank)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPurchaseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Purchase & Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showPayModal && selectedSupplier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <span className="modal-title">Pay Merchant {selectedSupplier.name}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Total Amount We Owe:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
                    ₹{Math.abs(selectedSupplier.current_balance).toFixed(2)}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount to Pay (₹) *</label>
                  <input 
                    type="number" 
                    className="input input-mono"
                    placeholder="Enter amount"
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
                      CASH (Drawer -)
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
                    <label className="form-label">Reference / UTR Number</label>
                    <input 
                      type="text" 
                      className="input input-mono"
                      value={payData.reference_no}
                      onChange={(e) => setPayData({ ...payData, reference_no: e.target.value })}
                    />
                  </div>
                )}
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
