import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, History, Sparkles, Package, 
  Users, Truck, Wallet, Settings as SettingsIcon, FolderOpen, 
  Languages, Sun, Moon, Check, Database, AlertTriangle, RefreshCw 
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
  const [dbState, setDbState] = useState({ checking: true, connected: false, error: null, dbName: null, dbUser: null });

  const { lang, toggleLang, theme, toggleTheme, t } = useApp();

  const checkDb = async () => {
    setDbState(prev => ({ ...prev, checking: true, error: null }));
    try {
      if (!window.api || !window.api.db) {
        throw new Error('Native SQLite Database API is not accessible. Browser storage is blocked to prevent desynchronization. Please run the desktop application via Electron.');
      }
      const res = await window.api.db.getStatus();
      if (!res || !res.connected) {
        throw new Error(res?.error || 'Database connection could not be established.');
      }
      setDbState({ checking: false, connected: true, error: null, dbName: res.dbName, dbUser: res.dbUser });
    } catch (err) {
      setDbState({ checking: false, connected: false, error: err.message, dbName: null, dbUser: null });
    }
  };

  useEffect(() => {
    checkDb();
  }, []);

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

  if (dbState.checking) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans)',
        gap: 16,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(37, 99, 235, 0.4)',
        }}>
          <Database size={28} color="#fff" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Connecting to Jain Hosiery Database...</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>Verifying SQLite database configuration from .env</div>
      </div>
    );
  }

  if (!dbState.connected) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans)',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 600,
          width: '100%',
          background: '#0f172a',
          border: '1.5px solid #ef4444',
          borderRadius: 14,
          padding: 32,
          boxShadow: '0 20px 45px rgba(239, 68, 68, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171', letterSpacing: '0.3px' }}>
                Database Not Connected
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                डेटाबेस कनेक्शन उपलब्ध नहीं है (Application Blocked)
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 8,
            padding: '14px 16px',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#fca5a5',
          }}>
            <strong>Restriction Notice:</strong> Browser localStorage fallback has been disabled to prevent data corruption and desynchronization between the database and the UI. The application is strictly configured to only operate when connected to the local database defined in <code>.env</code>.
          </div>

          {dbState.error && (
            <div style={{
              background: '#020617',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: '12px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#e2e8f0',
              wordBreak: 'break-word',
            }}>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>Error: </span>
              {dbState.error}
            </div>
          )}

          <div style={{
            background: '#1e293b',
            borderRadius: 8,
            padding: '14px 16px',
            fontSize: 13,
            color: '#cbd5e1',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff' }}>How to resolve:</div>
            <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
              <li>Ensure <code>.env</code> exists in project root with valid credentials (<code>DB_NAME</code>, <code>DB_USER</code>, etc.).</li>
              <li>Launch the application via the Electron desktop window using <code>npm run dev</code>.</li>
              <li>If you opened this in an external web browser, please switch to the Electron desktop application window.</li>
            </ol>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
            <button 
              className="btn btn-primary"
              onClick={checkDb}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
            >
              <RefreshCw size={16} /> Retry Database Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

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

            <div 
              className="status-indicator" 
              style={{ 
                background: 'rgba(34, 197, 94, 0.12)', 
                color: '#22c55e', 
                border: '1px solid rgba(34, 197, 94, 0.35)',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '12px',
                fontWeight: 700
              }}
              title={`Active Database: ${dbState.dbName || 'jain_hosiery.sqlite'}`}
            >
              <div className="status-dot" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span>{t('dbConnected')}</span>
            </div>

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
            <InvoiceHistory />
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
