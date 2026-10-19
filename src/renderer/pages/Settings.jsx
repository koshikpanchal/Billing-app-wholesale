import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, FolderOpen, Database, 
  ShieldCheck, Check, Download, Upload, HardDrive, RefreshCw 
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [baseDir, setBaseDir] = useState('');
  const [dbPath, setDbPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      if (window.api) {
        const [stt, dir, currentDbPath] = await Promise.all([
          window.api.settings.get(),
          window.api.files.getBillsBaseDir(),
          window.api.db?.getPath ? window.api.db.getPath() : Promise.resolve(''),
        ]);
        setSettings(stt || {});
        setBaseDir(dir || '');
        setDbPath(currentDbPath || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await window.api.settings.update(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    }
  };

  const handleOpenFolder = async () => {
    try {
      if (window.api && window.api.files) {
        await window.api.files.openPath(baseDir);
      }
    } catch (err) {
      alert('Could not open folder: ' + err.message);
    }
  };

  const handleOpenDbFolder = async () => {
    try {
      if (window.api && window.api.db) {
        await window.api.db.openFolder();
      }
    } catch (err) {
      alert('Could not open database folder: ' + err.message);
    }
  };

  const handleBackupDb = async () => {
    try {
      if (window.api && window.api.db) {
        const res = await window.api.db.backup();
        if (res.cancelled) return;
        if (res.success) {
          setBackupMsg({ type: 'success', text: `Backup saved successfully to: ${res.destination}` });
          setTimeout(() => setBackupMsg(null), 6000);
        } else {
          alert('Backup failed: ' + res.error);
        }
      }
    } catch (err) {
      alert('Backup error: ' + err.message);
    }
  };

  const handleRestoreDb = async () => {
    if (!window.confirm('WARNING: Restoring a database backup will overwrite current products, accounts, and invoices on this machine with the backup file. Are you sure you want to proceed?')) {
      return;
    }

    try {
      if (window.api && window.api.db) {
        const res = await window.api.db.restore();
        if (res.cancelled) return;
        if (res.success) {
          alert('Database restored successfully from backup! The app will now reload.');
          window.location.reload();
        } else {
          alert('Restore failed: ' + (res.error || 'Unknown error'));
        }
      }
    } catch (err) {
      alert('Restore error: ' + err.message);
    }
  };

  if (loading || !settings) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading settings...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>
      {/* Header */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Shop Profile & System Configuration</h2>
            <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
              Configure business details for A4 printouts, GST rules, and local bills directory.
            </p>
          </div>

          {savedSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: 13, fontWeight: 700 }}>
              <Check size={18} /> Settings Saved!
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Business Details Card */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#94a3b8', textTransform: 'uppercase' }}>
            Business & Tax Profile
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input 
                type="text" 
                className="input"
                value={settings.business_name}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trade / Tagline</label>
              <input 
                type="text" 
                className="input"
                value={settings.trade_name}
                onChange={(e) => setSettings({ ...settings, trade_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registered State</label>
              <input 
                type="text" 
                className="input"
                value={settings.state}
                onChange={(e) => setSettings({ ...settings, state: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">State Code</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.state_code}
                onChange={(e) => setSettings({ ...settings, state_code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Address Line 1</label>
              <input 
                type="text" 
                className="input"
                value={settings.address_line1}
                onChange={(e) => setSettings({ ...settings, address_line1: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address Line 2 (City / PIN)</label>
              <input 
                type="text" 
                className="input"
                value={settings.address_line2}
                onChange={(e) => setSettings({ ...settings, address_line2: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Invoice Numbering & Bank Details */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#94a3b8', textTransform: 'uppercase' }}>
            Invoice Series & Bank Info
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Cash Memo Prefix</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.cash_memo_prefix}
                onChange={(e) => setSettings({ ...settings, cash_memo_prefix: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">GST Invoice Prefix</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Financial Year</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.financial_year}
                onChange={(e) => setSettings({ ...settings, financial_year: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID for QR</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.upi_id}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input 
                type="text" 
                className="input"
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.bank_account_no}
                onChange={(e) => setSettings({ ...settings, bank_account_no: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input 
                type="text" 
                className="input input-mono"
                value={settings.bank_ifsc}
                onChange={(e) => setSettings({ ...settings, bank_ifsc: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </div>

        {/* Database Backup & Laptop Transfer Card */}
        <div className="card" style={{ background: '#0e1d2f', border: '1.5px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} color="#38bdf8" />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                  Database Backup & Laptop Migration (डेटा बैकअप व ट्रांसफर)
                </h3>
              </div>
              <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                Easily transfer your entire shop database (products, customer credit khatas, past bills, cash register) to another laptop via Pen Drive.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleOpenDbFolder}
                title="Open SQLite Database Folder in Windows Explorer"
              >
                <FolderOpen size={15} /> Open DB Folder
              </button>

              <button 
                type="button" 
                className="btn btn-success btn-sm"
                onClick={handleBackupDb}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                title="Save database backup to Pen Drive or Desktop"
              >
                <Download size={15} /> Backup Database (Export)
              </button>

              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={handleRestoreDb}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                title="Restore/Import a database backup file"
              >
                <Upload size={15} /> Restore Database (Import)
              </button>
            </div>
          </div>

          {backupMsg && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              color: '#4ade80',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12.5,
              marginBottom: 12,
              fontWeight: 600
            }}>
              ✓ {backupMsg.text}
            </div>
          )}

          <div style={{ background: '#091322', padding: 12, borderRadius: 8, fontSize: 12.5 }}>
            <div style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
              Active SQLite Database File Location:
            </div>
            <div style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              {dbPath || 'Loading database path...'}
            </div>
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
            <strong>How to transfer to another laptop:</strong>
            <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
              <li>On this laptop, click <strong>"Backup Database (Export)"</strong> and save the <code>.sqlite</code> file to a USB Pen Drive.</li>
              <li>On your other laptop, open Jain Hosiery, go to <strong>Settings</strong>, and click <strong>"Restore Database (Import)"</strong>.</li>
              <li>Select the file from your Pen Drive. All products, khatas, and invoices will transfer automatically!</li>
            </ol>
          </div>
        </div>

        {/* File Storage & Organized Directory (User Requirement 3) */}
        <div className="card" style={{ background: '#0e1828', border: '1px solid #1e3a8a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                Local Structured Bills Directory
              </h3>
              <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
                Every generated bill is automatically categorized into <strong>Year &rarr; Month &rarr; Date-CustomerName.html</strong>
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleOpenFolder}>
              <FolderOpen size={16} /> Open Folder
            </button>
          </div>

          <div style={{ background: '#131e33', padding: 12, borderRadius: 8, fontSize: 13, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {baseDir}
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ fontWeight: 800 }}>
            <Save size={18} /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
