import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, FolderOpen, Database, ShieldCheck, Check } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [baseDir, setBaseDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      if (window.api) {
        const [stt, dir] = await Promise.all([
          window.api.settings.get(),
          window.api.files.getBillsBaseDir(),
        ]);
        setSettings(stt || {});
        setBaseDir(dir || '');
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
