import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Printer, FolderOpen, XCircle, Eye, 
  Calendar, FileText, CheckCircle, RefreshCw 
} from 'lucide-react';

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [filterType, setFilterType] = useState(''); // '' = all, or 'CASH_MEMO', 'GST_INVOICE', 'BATCH_GST'
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal preview
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.invoices) {
        const list = await window.api.invoices.getList({
          type: filterType || null,
          startDate: startDate || null,
          endDate: endDate || null,
          query: searchQuery,
          limit: 100,
        });
        setInvoices(list || []);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterType, startDate, endDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleViewBill = async (inv) => {
    try {
      setSelectedInvoice(inv);
      if (window.api && window.api.invoices) {
        const html = await window.api.invoices.getPrintHtml(inv.id);
        setPreviewHtml(html);
        setShowModal(true);
      }
    } catch (err) {
      alert('Failed to load bill print view: ' + err.message);
    }
  };

  const handlePrint = () => {
    if (previewHtml && window.api?.print) {
      window.api.print.printBill(previewHtml);
    }
  };

  const handleShowInFolder = async (filePath) => {
    try {
      if (window.api && window.api.files) {
        if (filePath) {
          await window.api.files.showInFolder(filePath);
        } else {
          const rootDir = await window.api.files.getBillsBaseDir();
          await window.api.files.openPath(rootDir);
        }
      }
    } catch (err) {
      alert('Could not open folder: ' + err.message);
    }
  };

  const handleCancelBill = async (inv) => {
    if (inv.status === 'CANCELLED') return;
    if (!window.confirm(`Are you sure you want to cancel invoice ${inv.invoice_number}? This will reverse stock and customer balance if applicable.`)) {
      return;
    }

    try {
      await window.api.invoices.cancel(inv.id);
      alert('Invoice cancelled successfully.');
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === inv.id) {
        setShowModal(false);
      }
    } catch (err) {
      alert('Failed to cancel invoice: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Controls */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Invoice & Cash Memo History</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Browse, reprint, or locate any bill in your local directory (Year &rarr; Month &rarr; Date-Name)
            </p>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => handleShowInFolder(null)}>
            <FolderOpen size={16} /> Open Root Bills Folder
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Document Type Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: 4, borderRadius: 8, gap: 4 }}>
            <button 
              className={`btn btn-sm ${filterType === '' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setFilterType('')}
            >
              All Types
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'CASH_MEMO' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setFilterType('CASH_MEMO')}
            >
              Cash Memos
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'GST_INVOICE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setFilterType('GST_INVOICE')}
            >
              GST Invoices
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'BATCH_GST' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setFilterType('BATCH_GST')}
            >
              Batch GST
            </button>
          </div>

          {/* Search box */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Search by Bill No, Customer Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary">
              <Search size={16} /> Search
            </button>
          </form>

          {/* Date range */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>
            <span>From:</span>
            <input 
              type="date" 
              className="input input-mono"
              style={{ padding: '6px 10px', fontSize: 13 }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>To:</span>
            <input 
              type="date" 
              className="input input-mono"
              style={{ padding: '6px 10px', fontSize: 13 }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(startDate || endDate || searchQuery) && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); }}
                title="Clear filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Taxable</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 36, color: '#64748b' }}>
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className={`badge ${
                        inv.document_type === 'GST_INVOICE' ? 'badge-gst' : 
                        inv.document_type === 'BATCH_GST' ? 'badge-batch' : 'badge-cash-memo'
                      }`}>
                        {inv.document_type === 'GST_INVOICE' ? 'GST Invoice' : 
                         inv.document_type === 'BATCH_GST' ? 'Batch GST' : 'Cash Memo'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td>{inv.invoice_date}</td>
                    <td>
                      <strong>{inv.customer_name}</strong>
                      {inv.customer_phone && <span style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>{inv.customer_phone}</span>}
                    </td>
                    <td>
                      <span className={`badge ${inv.payment_mode === 'CASH' ? 'badge-cash' : 'badge-online'}`}>
                        {inv.payment_mode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{inv.taxable_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                      ₹{inv.grand_total.toFixed(2)}
                    </td>
                    <td>
                      <span style={{ 
                        color: inv.status === 'COMPLETED' ? '#10b981' : '#ef4444', 
                        fontSize: 12, 
                        fontWeight: 700 
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewBill(inv)}
                          title="View / Print"
                        >
                          <Eye size={13} /> View
                        </button>

                        {inv.pdf_file_path && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleShowInFolder(inv.pdf_file_path)}
                            title="Reveal in Windows Explorer"
                          >
                            <FolderOpen size={13} />
                          </button>
                        )}

                        {inv.status !== 'CANCELLED' && (
                          <button 
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 6px' }}
                            onClick={() => handleCancelBill(inv)}
                            title="Cancel Bill"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice View & Print Modal */}
      {showModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 840, maxHeight: '92vh' }}>
            <div className="modal-header">
              <span className="modal-title">
                {selectedInvoice.document_type === 'GST_INVOICE' ? 'GST Tax Invoice' : 'Cash Memo'} - {selectedInvoice.invoice_number}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: 16, background: '#1e293b' }}>
              <div 
                style={{ background: '#fff', color: '#000', borderRadius: 8, padding: 18, maxHeight: 500, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />

              {selectedInvoice.pdf_file_path && (
                <div style={{ 
                  background: 'rgba(15, 23, 42, 0.7)', 
                  border: '1px solid #334155', 
                  borderRadius: 8, 
                  padding: '10px 14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: '#94a3b8'
                }}>
                  <div>
                    File path: <code style={{ color: '#38bdf8' }}>{selectedInvoice.pdf_file_path}</code>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleShowInFolder(selectedInvoice.pdf_file_path)}>
                    <FolderOpen size={14} /> Reveal in Explorer
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedInvoice.status !== 'CANCELLED' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleCancelBill(selectedInvoice)}>
                  <XCircle size={14} /> Cancel Bill
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} /> Print (A4)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
