import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    description: '',
    hsn_code: '6115',
    unit: 'Pcs',
    cost_price: '',
    selling_price: '',
    gst_rate: 5.0,
    current_stock: 100,
    is_stock_tracked: 0, // Flexible / Untracked by default as requested!
    min_stock_alert: 5,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.products) {
        let list;
        if (searchQuery.trim()) {
          list = await window.api.products.search(searchQuery.trim());
        } else {
          list = await window.api.products.getAll();
        }
        setProducts(list || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      item_code: `JH-${Date.now().toString().slice(-4)}`,
      name: '',
      description: '',
      hsn_code: '6115',
      unit: 'Pcs',
      cost_price: '',
      selling_price: '',
      gst_rate: 5.0,
      current_stock: 100,
      is_stock_tracked: 0,
      min_stock_alert: 5,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      item_code: p.item_code || '',
      name: p.name,
      description: p.description || '',
      hsn_code: p.hsn_code || '6115',
      unit: p.unit || 'Pcs',
      cost_price: p.cost_price || '',
      selling_price: p.selling_price || '',
      gst_rate: p.gst_rate || 5.0,
      current_stock: p.current_stock || 0,
      is_stock_tracked: p.is_stock_tracked ? 1 : 0,
      min_stock_alert: p.min_stock_alert || 5,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.selling_price) {
      alert('Please fill product name and selling price');
      return;
    }

    try {
      const payload = {
        ...formData,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        gst_rate: parseFloat(formData.gst_rate) || 5.0,
        current_stock: parseFloat(formData.current_stock) || 0,
        is_stock_tracked: formData.is_stock_tracked === 1 || formData.is_stock_tracked === true ? 1 : 0,
      };

      if (editingProduct) {
        await window.api.products.update(editingProduct.id, payload);
      } else {
        await window.api.products.create(payload);
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert('Error saving product: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this product from the active catalog?')) return;
    try {
      await window.api.products.delete(id);
      fetchProducts();
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Search */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Products & Inventory Master</h2>
            <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
              Manage hosiery catalog, HSN codes, GST slabs, selling prices, and stock tracking modes.
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Product
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Search products by name, item code (JH-xxx), or HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 34 }}
            />
            <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} />
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>HSN</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Cost Price</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'center' }}>Stock Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
                    No products found. Click "Add Product" to create one.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>{p.item_code}</td>
                    <td>
                      <strong style={{ color: 'var(--text-main)', fontSize: 14 }}>{p.name}</strong>
                      {p.description && <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12 }}>{p.description}</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.hsn_code || '6115'}</td>
                    <td>{p.unit}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ₹{p.cost_price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      ₹{p.selling_price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {p.is_stock_tracked ? (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                          Tracked ({p.current_stock} {p.unit})
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }} title="Flexible Mode: Billing never blocked by stock counts">
                          Flexible / Uncounted
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(p)}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <span className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Hosiery Product'}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Item Code / SKU</label>
                    <input 
                      type="text" 
                      className="input input-mono"
                      value={formData.item_code}
                      onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input 
                      type="text" 
                      className="input"
                      placeholder="e.g. Men Cotton Vest (Size 90)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Pack Details (Optional)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Wholesale pack 20/22/24 (Pack of 3 shirts)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input 
                      type="text" 
                      className="input input-mono"
                      placeholder="6115"
                      value={formData.hsn_code}
                      onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select 
                      className="select"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="Set">Set (Wholesale Pack)</option>
                      <option value="Pack">Pack</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Box">Box</option>
                      <option value="Dozen">Dozen</option>
                      <option value="Meter">Meter</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Cost Price (₹)</label>
                    <input 
                      type="number" 
                      className="input input-mono"
                      placeholder="0.00"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      className="input input-mono"
                      placeholder="0.00"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Flexible Stock Mode Switch */}
                <div style={{ 
                  background: '#0d131f', 
                  border: '1px solid #334155', 
                  borderRadius: 10, 
                  padding: 14, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 10 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ fontSize: 13.5, color: '#fff' }}>Enable Strict Stock Tracking</strong>
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>
                        If turned off (recommended for existing uncounted stock), billing is never blocked.
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, accentColor: '#3b82f6', cursor: 'pointer' }}
                      checked={formData.is_stock_tracked === 1}
                      onChange={(e) => setFormData({ ...formData, is_stock_tracked: e.target.checked ? 1 : 0 })}
                    />
                  </div>

                  {formData.is_stock_tracked === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                      <div className="form-group">
                        <label className="form-label">Current Stock</label>
                        <input 
                          type="number" 
                          className="input input-mono"
                          value={formData.current_stock}
                          onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Low Stock Alert</label>
                        <input 
                          type="number" 
                          className="input input-mono"
                          value={formData.min_stock_alert}
                          onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
