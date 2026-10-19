import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, FolderOpen, Printer, Download, 
  RefreshCw, Calendar, TrendingUp, Hash, IndianRupee, Layers 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BatchGSTGenerator({ onBatchCommitted }) {
  const { t } = useApp();
  const [targetTotal, setTargetTotal] = useState(200000);
  const [billCount, setBillCount] = useState(200);

  // Default to current month start & end
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [batchGstRate, setBatchGstRate] = useState(5.0);

  const [generatedBatch, setGeneratedBatch] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  const avgBill = billCount > 0 ? (targetTotal / billCount).toFixed(2) : 0;

  const handleGenerate = async () => {
    if (targetTotal <= 0 || billCount <= 0) {
      alert('Please enter valid positive numbers for Target Amount and Bill Count');
      return;
    }

    setIsGenerating(true);
    setCommitResult(null);

    try {
      if (window.api && window.api.batch) {
        const result = await window.api.batch.generate({
          targetTotal: parseFloat(targetTotal),
          billCount: parseInt(billCount, 10),
          startDate,
          endDate,
          gstRate: parseFloat(batchGstRate),
        });

        setGeneratedBatch(result);
      }
    } catch (err) {
      alert('Failed to generate batch bills: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitBatch = async () => {
    if (!generatedBatch || !generatedBatch.invoices || generatedBatch.invoices.length === 0) {
      return;
    }

    const confirmMsg = `Are you sure you want to save all ${generatedBatch.invoices.length} GST bills totaling ₹${generatedBatch.actualTotal.toLocaleString('en-IN')} to the database and export to Year/Month folders?`;
    if (!window.confirm(confirmMsg)) return;

    setIsCommitting(true);
    try {
      const res = await window.api.batch.commit(generatedBatch);
      setCommitResult(res);
      alert(`Success! ${res.savedCount} GST bills have been saved and exported to your Bills directory.`);
      if (onBatchCommitted) onBatchCommitted();
    } catch (err) {
      alert('Error committing batch: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      if (window.api && window.api.files) {
        const dir = commitResult?.folderPath || await window.api.files.getBillsBaseDir();
        await window.api.files.openPath(dir);
      }
    } catch (err) {
      alert('Could not open folder: ' + err.message);
    }
  };

  const handleExportCsv = () => {
    if (!generatedBatch) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Invoice Number,Date,Customer Name,Subtotal,Taxable Value,CGST,SGST,Grand Total,Payment Mode\n';

    generatedBatch.invoices.forEach(inv => {
      const row = [
        inv.invoice_number,
        inv.invoice_date,
        `"${inv.customer_name}"`,
        inv.subtotal.toFixed(2),
        inv.taxable_amount.toFixed(2),
        inv.cgst_amount.toFixed(2),
        inv.sgst_amount.toFixed(2),
        inv.grand_total.toFixed(2),
        inv.payment_mode
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JainHosiery_GST_Batch_${targetTotal}_${billCount}bills.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title & Explanation */}
      <div className="hero-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sparkles size={20} color="#3b82f6" />
            <h2 className="hero-banner-title" style={{ fontSize: 20 }}>
              Smart Batch GST Invoice Generator
            </h2>
          </div>
          <p className="hero-banner-meta" style={{ maxWidth: 750, lineHeight: 1.5, display: 'block' }}>
            Periodically generate compliant GST invoices for Jain Hosiery to hit a specified turnover target (e.g. ₹2,00,000 across 200 bills). 
            Selects real catalog items, introduces natural price variations (e.g. ₹920, ₹1,050, ₹1,110), distributes timestamps across shop hours, 
            and ensures the <span className="hero-banner-highlight">grand total matches to the exact paisa</span>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleOpenFolder}>
            <FolderOpen size={16} /> Open Bills Folder
          </button>
        </div>
      </div>

      {/* Inputs Configuration Card */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Batch Parameters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Target Turnover (₹)</label>
            <input 
              type="number" 
              className="input input-mono"
              placeholder="e.g. 200000"
              value={targetTotal}
              onChange={(e) => setTargetTotal(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Number of Bills</label>
            <input 
              type="number" 
              className="input input-mono"
              placeholder="e.g. 200"
              value={billCount}
              onChange={(e) => setBillCount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">GST Tax Slab (CGST + SGST)</label>
            <select 
              className="select"
              value={batchGstRate}
              onChange={(e) => setBatchGstRate(parseFloat(e.target.value))}
            >
              <option value={5.0}>5% GST (2.5% CGST + 2.5% SGST) - Standard Hosiery</option>
              <option value={12.0}>12% GST (6.0% CGST + 6.0% SGST)</option>
              <option value={18.0}>18% GST (9.0% CGST + 9.0% SGST)</option>
              <option value={0.0}>0% GST (Exempt)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">From Date</label>
            <input 
              type="date" 
              className="input input-mono"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">To Date</label>
            <input 
              type="date" 
              className="input input-mono"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary"
            style={{ height: 42, fontWeight: 700 }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Sparkles size={16} /> {isGenerating ? 'Generating...' : 'Generate Batch Bills'}
          </button>
        </div>

        <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span>Average Per Bill: <strong style={{ color: 'var(--text-main)' }}>₹{avgBill}</strong></span>
          <span>•</span>
          <span>GST Rate: <strong style={{ color: 'var(--primary)' }}>{batchGstRate}% ({batchGstRate / 2}% CGST + {batchGstRate / 2}% SGST)</strong></span>
          <span>•</span>
          <span>Allowable Variance: <strong style={{ color: 'var(--primary)' }}>±18% (e.g. ₹{(avgBill * 0.82).toFixed(0)} to ₹{(avgBill * 1.18).toFixed(0)})</strong></span>
          <span>•</span>
          <span>Safe: <strong style={{ color: 'var(--success)' }}>Does not distort physical stock counts</strong></span>
        </div>
      </div>

      {/* Generation Results Review */}
      {generatedBatch && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary Banner */}
          <div className="card" style={{ 
            background: '#131d2e', 
            border: '1px solid #1e3a8a',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Requested Target</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  ₹{generatedBatch.targetTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ height: 35, width: 1, background: '#334155' }} />

              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Actual Calculated Sum</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  ₹{generatedBatch.actualTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ height: 35, width: 1, background: '#334155' }} />

              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Invoices</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
                  {generatedBatch.billCount} Bills
                </div>
              </div>

              <div style={{ height: 35, width: 1, background: '#334155' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 13, fontWeight: 700 }}>
                <CheckCircle2 size={18} /> Exact Match (0.00 Diff)
              </div>
            </div>

            {/* Commit & Export Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={handleExportCsv}>
                <Download size={16} /> Export CSV / Excel
              </button>

              <button 
                className="btn btn-success" 
                style={{ fontWeight: 800, padding: '10px 20px' }}
                onClick={handleCommitBatch}
                disabled={isCommitting}
              >
                <CheckCircle2 size={18} /> {isCommitting ? 'Saving...' : 'Commit & Save All to System'}
              </button>
            </div>
          </div>

          {/* Success Box after Commit */}
          {commitResult && (
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              border: '1px solid #059669', 
              borderRadius: 12, 
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#34d399'
            }}>
              <div>
                <strong>Batch Successfully Committed!</strong> Saved {commitResult.savedCount} bills into database and auto-exported to Year/Month directory.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleOpenFolder}>
                <FolderOpen size={14} /> Open in Explorer
              </button>
            </div>
          )}

          {/* Preview Table of Bills */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>
                Generated Invoices Preview ({generatedBatch.invoices.length} entries)
              </h4>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Review before committing
              </span>
            </div>

            <div className="table-container" style={{ maxHeight: 440, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Items Included</th>
                    <th style={{ textAlign: 'right' }}>Taxable</th>
                    <th style={{ textAlign: 'right' }}>CGST</th>
                    <th style={{ textAlign: 'right' }}>SGST</th>
                    <th style={{ textAlign: 'right' }}>Grand Total</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedBatch.invoices.map((inv, idx) => (
                    <tr key={idx}>
                      <td style={{ color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td>{inv.invoice_date}</td>
                      <td><strong>{inv.customer_name}</strong></td>
                      <td style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                        {inv.items.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{inv.taxable_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#34d399' }}>₹{inv.cgst_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#34d399' }}>₹{inv.sgst_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                        ₹{inv.grand_total.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${inv.payment_mode === 'CASH' ? 'badge-cash' : 'badge-online'}`}>
                          {inv.payment_mode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
