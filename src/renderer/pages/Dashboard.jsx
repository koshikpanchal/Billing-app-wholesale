import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, ShoppingCart, IndianRupee, Wallet, Users, Truck, 
  ArrowRight, PlusCircle, Printer, FolderOpen, Calendar, AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Dashboard({ setActiveTab, onOpenBill }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useApp();

  const loadStats = async () => {
    try {
      if (window.api && window.api.register) {
        const data = await window.api.register.getDashboardStats();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleOpenBillsFolder = async () => {
    try {
      if (window.api && window.api.files) {
        const dir = await window.api.files.getBillsBaseDir();
        await window.api.files.openPath(dir);
      }
    } catch (err) {
      alert('Could not open folder: ' + err.message);
    }
  };

  const handleViewInvoice = async (inv) => {
    if (onOpenBill) {
      onOpenBill(inv.id);
    } else {
      setActiveTab('history');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading shop overview...</div>;
  }

  const register = stats?.register || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Banner */}
      <div className="hero-banner">
        <div>
          <h2 className="hero-banner-title">
            {t('appTitle')} - {t('counterOverview')}
          </h2>
          <div className="hero-banner-meta">
            <span>
              <Calendar size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> 
              {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span>•</span>
            <span className="hero-banner-highlight">Bills Auto-Saved: Year &rarr; Month &rarr; Date-Name</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleOpenBillsFolder}>
            <FolderOpen size={16} /> {t('openFolder')}
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('billing')}>
            <PlusCircle size={16} /> {t('newBillBtn')} <span className="kbd" style={{ marginLeft: 6 }}>F2</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>{t('todaySales')}</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value">₹{(stats?.todaySales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="stat-sub">{stats?.todayBillCount || 0} {t('billsGeneratedToday')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>{t('cashInDrawer')}</span>
            <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#facc15' }}>
            ₹{(register.expected_closing_cash || register.opening_cash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">{t('opening')}: ₹{(register.opening_cash || 0).toLocaleString('en-IN')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>{t('onlineCollections')}</span>
            <div className="stat-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#38bdf8' }}>
            ₹{(stats?.onlineSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">{t('separateFromDrawer')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>{t('customerReceivables')}</span>
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#f87171' }}>
            ₹{(stats?.customerReceivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">{t('pendingCustomerCredit')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>{t('supplierPayables')}</span>
            <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Truck size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#c084fc' }}>
            ₹{(stats?.supplierPayables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">{t('owedToMerchants')}</div>
        </div>
      </div>

      {/* Quick Access Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div 
          className="card" 
          style={{ cursor: 'pointer', borderLeft: '4px solid #3b82f6', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('billing')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('billing')}</h3>
              <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Everyday walk-in billing in seconds</p>
            </div>
            <span className="kbd">F2</span>
          </div>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', borderLeft: '4px solid #8b5cf6', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('batch')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('batch')}</h3>
              <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Target amount (₹2L) & count (200 bills)</p>
            </div>
            <span className="kbd">F4</span>
          </div>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', borderLeft: '4px solid #10b981', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('customers')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('customers')}</h3>
              <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Manage credit balances & payments</p>
            </div>
            <span className="kbd">F6</span>
          </div>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', borderLeft: '4px solid #f59e0b', transition: 'all 0.2s' }}
          onClick={() => setActiveTab('register')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('register')}</h3>
              <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Count cash, expenses & reconcile drawer</p>
            </div>
            <span className="kbd">F8</span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('recentBills')}</h3>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>{t('latestTransactions')}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
            {t('viewAllBills')} <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Invoice / Memo No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(!stats?.recentInvoices || stats.recentInvoices.length === 0) ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>
                    No bills generated yet today. Press <strong>[F2]</strong> to create the first bill!
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.map((inv) => (
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
                    <td><strong>{inv.customer_name}</strong></td>
                    <td>
                      <span className={`badge ${inv.payment_mode === 'CASH' ? 'badge-cash' : 'badge-online'}`}>
                        {inv.payment_mode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      ₹{inv.grand_total.toFixed(2)}
                    </td>
                    <td>
                      <span style={{ 
                        color: inv.status === 'COMPLETED' ? '#10b981' : '#ef4444', 
                        fontSize: 12, 
                        fontWeight: 600 
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleViewInvoice(inv)}
                        title="View & Reprint"
                      >
                        <Printer size={13} /> View / Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
