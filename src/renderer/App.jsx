import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, History, Sparkles, Package, 
  Users, Truck, Wallet, Settings as SettingsIcon, FolderOpen, 
  Languages, Sun, Moon, Check 
} from 'lucide-react';

import { useApp } from './context/AppContext';

import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import InvoiceHistory from './pages/InvoiceHistory';
import BatchGSTGenerator from './pages/BatchGSTGenerator';
import Products from './pages/Products';
import CustomersKhata from './pages/CustomersKhata';
import SuppliersKhata from './pages/SuppliersKhata';
import DailyRegister from './pages/DailyRegister';
import Settings from './pages/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openedBillId, setOpenedBillId] = useState(null);

  const { lang, toggleLang, theme, toggleTheme, t } = useApp();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case 'F1': setActiveTab('dashboard'); break;
          case 'F2': setActiveTab('billing'); break;
          case 'F3': setActiveTab('history'); break;
          case 'F4': setActiveTab('batch'); break;
          case 'F6': setActiveTab('customers'); break;
          case 'F7': setActiveTab('suppliers'); break;
          case 'F8': setActiveTab('register'); break;
          case 'F9': setActiveTab('products'); break;
          default: break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleOpenBillFromDashboard = (billId) => {
    setOpenedBillId(billId);
    setActiveTab('history');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">JH</div>
          <div>
            <div className="brand-title">{t('appTitle')}</div>
            <div className="brand-subtitle">{t('appSubtitle')}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>{t('dashboard')}</span>
            <span className="nav-badge">F1</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <ShoppingCart size={18} />
            <span>{t('billing')}</span>
            <span className="nav-badge">F2</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} />
            <span>{t('history')}</span>
            <span className="nav-badge">F3</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'batch' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch')}
          >
            <Sparkles size={18} color="#c084fc" />
            <span style={{ color: activeTab === 'batch' ? '#fff' : '#c084fc' }}>{t('batch')}</span>
            <span className="nav-badge">F4</span>
          </div>

          <div style={{ height: 1, background: 'var(--border-color)', margin: '6px 0' }} />

          <div 
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={18} />
            <span>{t('products')}</span>
            <span className="nav-badge">F9</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={18} />
            <span>{t('customers')}</span>
            <span className="nav-badge">F6</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            <Truck size={18} />
            <span>{t('suppliers')}</span>
            <span className="nav-badge">F7</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <Wallet size={18} />
            <span>{t('register')}</span>
            <span className="nav-badge">F8</span>
          </div>

          <div style={{ height: 1, background: 'var(--border-color)', margin: '6px 0' }} />

          <div 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} />
            <span>{t('settings')}</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="status-dot" />
            <span>{t('offlineBadge')}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)' }}>v1.0.0</span>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="main-wrapper">
        {/* Topbar with Language & Theme Switchers */}
        <header className="topbar">
          <div className="topbar-title-section">
            <span className="topbar-title">
              {activeTab === 'dashboard' && t('counterOverview')}
              {activeTab === 'billing' && t('billingCounter')}
              {activeTab === 'history' && t('pastBills')}
              {activeTab === 'batch' && t('batchGstTitle')}
              {activeTab === 'products' && t('productsTitle')}
              {activeTab === 'customers' && t('customerKhataTitle')}
              {activeTab === 'suppliers' && t('supplierKhataTitle')}
              {activeTab === 'register' && t('cashRegisterTitle')}
              {activeTab === 'settings' && t('settingsTitle')}
            </span>
          </div>

          <div className="topbar-actions">
            {/* Language Switcher */}
            <button 
              className="switcher-btn"
              onClick={toggleLang}
              title={lang === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
            >
              <Languages size={15} color="#3b82f6" />
              <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            {/* Dark / Light Mode Switcher */}
            <button 
              className="switcher-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} color="#facc15" />
                  <span>{t('lightMode')}</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#2563eb" />
                  <span>{t('darkMode')}</span>
                </>
              )}
            </button>

            {window.api?._isMock ? (
              <div 
                className="status-indicator" 
                style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', cursor: 'pointer' }}
                title="Running in Web Browser mode: All bills, products, and accounts are automatically saved to your browser's persistent Local Storage. To connect to native Windows SQLite and File Explorer, start the desktop app via 'npm run dev'."
                onClick={() => alert("Browser Mode Notice:\nYou are viewing in a web browser.\nData is saved in browser persistent storage and will not be lost on refresh.\nTo run with native Windows SQLite and automatic file exports to Documents, run 'npm run dev' or 'npm run dev:electron'.")}
              >
                <div className="status-dot" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
                <span>{t('browserPreviewConnected')}</span>
              </div>
            ) : (
              <div className="status-indicator">
                <div className="status-dot" />
                <span>{t('dbConnected')}</span>
              </div>
            )}

            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleOpenBillsFolder}
              title="Open Bills Directory (Year -> Month -> Date-Name)"
            >
              <FolderOpen size={15} /> {t('openFolder')}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="content-area">
          {activeTab === 'dashboard' && (
            <Dashboard 
              setActiveTab={setActiveTab} 
              onOpenBill={handleOpenBillFromDashboard} 
            />
          )}

          {activeTab === 'billing' && (
            <Billing 
              onBillSaved={() => {}} 
            />
          )}

          {activeTab === 'history' && (
            <InvoiceHistory 
              initialBillId={openedBillId} 
            />
          )}

          {activeTab === 'batch' && (
            <BatchGSTGenerator 
              onBatchCommitted={() => {}} 
            />
          )}

          {activeTab === 'products' && (
            <Products />
          )}

          {activeTab === 'customers' && (
            <CustomersKhata />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersKhata />
          )}

          {activeTab === 'register' && (
            <DailyRegister />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </div>
      </main>
    </div>
  );
}
