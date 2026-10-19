const path = require('path');
const fs = require('fs');

const MONTH_NAMES = [
  '01-January', '02-February', '03-March', '04-April',
  '05-May', '06-June', '07-July', '08-August',
  '09-September', '10-October', '11-November', '12-December'
];

function sanitizeFilename(str) {
  if (!str) return 'Customer';
  return str.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').substring(0, 50);
}

function getBillsBaseDir(customPath = null) {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  let docsPath = path.join(process.cwd(), 'Documents');
  if (process.versions && process.versions.electron) {
    try {
      const electron = require('electron');
      const app = electron?.app || electron;
      if (app && typeof app.getPath === 'function') {
        docsPath = app.getPath('documents');
      }
    } catch (err) {}
  }

  const baseDir = path.join(docsPath, 'JainHosiery', 'Bills');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

/**
 * Returns folder path for Year -> Month
 * Example: Documents/JainHosiery/Bills/2026/10-October/
 */
function getTargetFolder(invoiceDate, customBaseDir = null) {
  const d = new Date(invoiceDate || Date.now());
  const year = d.getFullYear().toString();
  const month = MONTH_NAMES[d.getMonth()] || `${(d.getMonth() + 1).toString().padStart(2, '0')}-Month`;

  const baseDir = getBillsBaseDir(customBaseDir);
  const targetDir = path.join(baseDir, year, month);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return { targetDir, year, month };
}

/**
 * Generates file path:
 * <Year>/<Month>/<YYYY-MM-DD>_<Customer_Name>_<BillNo>.html (or .pdf)
 */
function getBillFilePath(invoice, extension = 'html', customBaseDir = null) {
  const dateStr = invoice.invoice_date || new Date().toISOString().split('T')[0];
  const { targetDir } = getTargetFolder(dateStr, customBaseDir);

  const cleanCustomer = sanitizeFilename(invoice.customer_name || 'Walk-in');
  const cleanBillNo = sanitizeFilename(invoice.invoice_number || 'Bill');

  const filename = `${dateStr}_${cleanCustomer}_${cleanBillNo}.${extension}`;
  return path.join(targetDir, filename);
}

/**
 * Saves bill HTML template to the structured folder
 */
function saveBillDocument(invoice, htmlContent, customBaseDir = null) {
  try {
    const filePath = getBillFilePath(invoice, 'html', customBaseDir);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log('[FileOrganizer] Saved bill to:', filePath);
    return { success: true, filePath };
  } catch (err) {
    console.error('[FileOrganizer] Error saving bill document:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Open file in OS default viewer or reveal in Windows Explorer
 */
function showItemInFolder(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      const { shell } = require('electron');
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'File not found' };
}

function openPath(targetPath) {
  if (targetPath && fs.existsSync(targetPath)) {
    try {
      const { shell } = require('electron');
      shell.openPath(targetPath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'Path not found' };
}

module.exports = {
  getBillsBaseDir,
  getTargetFolder,
  getBillFilePath,
  saveBillDocument,
  showItemInFolder,
  openPath,
  sanitizeFilename,
};
