require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, getDb, getDatabasePath } = require('./database/db');

// Repositories
const productRepo = require('./database/repositories/productRepo');
const invoiceRepo = require('./database/repositories/invoiceRepo');
const partyRepo = require('./database/repositories/partyRepo');
const purchaseRepo = require('./database/repositories/purchaseRepo');
const cashRegisterRepo = require('./database/repositories/cashRegisterRepo');
const settingsRepo = require('./database/repositories/settingsRepo');

// Services
const fileOrganizer = require('./services/fileOrganizerService');
const batchEngine = require('./services/batchEngine');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'Jain Hosiery - Billing & Shop Management',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize Database and IPC Handlers
app.whenReady().then(() => {
  try {
    initDatabase();
  } catch (err) {
    console.error('[Main] Database initialization failed:', err);
  }

  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // --- Database Status & Migration ---
  ipcMain.handle('db:getStatus', () => {
    try {
      const database = getDb();
      return {
        connected: !!database,
        dbName: process.env.DB_NAME || 'jain_hosiery.sqlite',
        dbUser: process.env.DB_USER || 'jain_admin',
        dbPath: getDatabasePath(),
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message,
        dbName: process.env.DB_NAME || 'jain_hosiery.sqlite',
      };
    }
  });

  ipcMain.handle('db:getPath', () => getDatabasePath());

  ipcMain.handle('db:openFolder', () => {
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      shell.showItemInFolder(dbPath);
    } else {
      shell.openPath(path.dirname(dbPath));
    }
    return { success: true };
  });

  ipcMain.handle('db:backup', async () => {
    try {
      const srcPath = getDatabasePath();
      const defaultName = `jain_hosiery_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export / Backup SQLite Database (For Laptop Transfer)',
        defaultPath: defaultName,
        filters: [{ name: 'SQLite Database (*.sqlite)', extensions: ['sqlite', 'db'] }],
      });

      if (canceled || !filePath) return { success: false, cancelled: true };

      const database = getDb();
      if (database) {
        try {
          database.pragma('wal_checkpoint(TRUNCATE)');
        } catch (e) {}
      }

      fs.copyFileSync(srcPath, filePath);
      return { success: true, destination: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:restore', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup Database to Restore',
        filters: [{ name: 'SQLite Database (*.sqlite, *.db)', extensions: ['sqlite', 'db'] }],
        properties: ['openFile'],
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const backupFile = filePaths[0];
      const targetPath = getDatabasePath();

      const Database = require('better-sqlite3');
      const testDb = new Database(backupFile, { readonly: true });
      const testCount = testDb.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='products'").get();
      testDb.close();

      if (!testCount || testCount.c === 0) {
        return { success: false, error: 'Selected file is not a valid Jain Hosiery database backup.' };
      }

      const database = getDb();
      if (database) {
        try {
          database.close();
        } catch (e) {}
      }

      if (fs.existsSync(`${targetPath}-wal`)) fs.unlinkSync(`${targetPath}-wal`);
      if (fs.existsSync(`${targetPath}-shm`)) fs.unlinkSync(`${targetPath}-shm`);

      fs.copyFileSync(backupFile, targetPath);
      initDatabase();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // --- Products ---
  ipcMain.handle('products:getAll', () => productRepo.getAllProducts());
  ipcMain.handle('products:search', (_, query) => productRepo.searchProducts(query));
  ipcMain.handle('products:create', (_, data) => productRepo.createProduct(data));
  ipcMain.handle('products:update', (_, id, data) => productRepo.updateProduct(id, data));
  ipcMain.handle('products:delete', (_, id) => productRepo.deleteProduct(id));

  // --- Invoices ---
  ipcMain.handle('invoices:create', (_, data) => invoiceRepo.createInvoice(data));
  ipcMain.handle('invoices:getById', (_, id) => invoiceRepo.getInvoiceById(id));
  ipcMain.handle('invoices:getList', (_, filters) => invoiceRepo.getInvoices(filters));
  ipcMain.handle('invoices:getNextNumber', (_, type) => invoiceRepo.getNextInvoiceNumber(type));
  ipcMain.handle('invoices:cancel', (_, id) => invoiceRepo.cancelInvoice(id));
  ipcMain.handle('invoices:getPrintHtml', (_, id) => {
    const inv = invoiceRepo.getInvoiceById(id);
    const settings = settingsRepo.getSettings();
    return invoiceRepo.generatePrintableHtml(inv, settings);
  });

  // --- Parties ---
  ipcMain.handle('parties:getAll', (_, type) => partyRepo.getAllParties(type));
  ipcMain.handle('parties:getById', (_, id) => partyRepo.getPartyById(id));
  ipcMain.handle('parties:create', (_, data) => partyRepo.createParty(data));
  ipcMain.handle('parties:update', (_, id, data) => partyRepo.updateParty(id, data));
  ipcMain.handle('parties:recordPayment', (_, data) => partyRepo.recordPartyPayment(data));
  ipcMain.handle('parties:getStatement', (_, id) => partyRepo.getPartyStatement(id));

  // --- Purchases ---
  ipcMain.handle('purchases:create', (_, data) => purchaseRepo.createPurchase(data));
  ipcMain.handle('purchases:getById', (_, id) => purchaseRepo.getPurchaseById(id));
  ipcMain.handle('purchases:getAll', (_, limit) => purchaseRepo.getAllPurchases(limit));

  // --- Daily Register ---
  ipcMain.handle('register:getToday', () => cashRegisterRepo.getTodayRegister());
  ipcMain.handle('register:recordExpense', (_, data) => cashRegisterRepo.recordExpense(data));
  ipcMain.handle('register:getExpenses', (_, date) => cashRegisterRepo.getExpenses(date));
  ipcMain.handle('register:updateCashTakenHome', (_, amount) => cashRegisterRepo.updateCashTakenHome(amount));
  ipcMain.handle('register:closeDay', async (_, data) => {
    const closed = cashRegisterRepo.closeDayRegister(data);
    try {
      const db = getDb();
      if (db) {
        db.pragma('wal_checkpoint(TRUNCATE)');
      }
    } catch (walErr) {
      console.error('[Main] WAL checkpoint before backup error:', walErr);
    }

    const backupResult = fileOrganizer.createDailyAutoBackup(closed?.entry_date, getDatabasePath());
    return {
      ...closed,
      autoBackup: backupResult,
    };
  });
  ipcMain.handle('register:getDashboardStats', () => cashRegisterRepo.getDashboardStats());

  // --- Batch GST Generation ---
  ipcMain.handle('batch:generate', async (_, params) => {
    const products = productRepo.getAllProducts();
    const settings = settingsRepo.getSettings();

    return batchEngine.generateBatchInvoices({
      ...params,
      products,
      prefix: settings.invoice_prefix || 'JH/',
      financialYear: settings.financial_year || '2026-27',
      shopState: settings.state || 'Delhi',
      shopStateCode: settings.state_code || '07',
    });
  });

  ipcMain.handle('batch:commit', async (_, batchResult) => {
    const settings = settingsRepo.getSettings();
    const results = [];

    for (const inv of (batchResult.invoices || [])) {
      try {
        const saved = invoiceRepo.createInvoice(inv);
        results.push(saved);
      } catch (err) {
        console.error('[Main] Failed to save batch invoice:', err);
      }
    }

    return {
      success: true,
      savedCount: results.length,
      folderPath: fileOrganizer.getBillsBaseDir(settings.bills_storage_path),
    };
  });

  // --- Settings ---
  ipcMain.handle('settings:get', () => settingsRepo.getSettings());
  ipcMain.handle('settings:update', (_, data) => settingsRepo.updateSettings(data));

  // --- File System & Windows Explorer (Year -> Month -> Date-Name) ---
  ipcMain.handle('files:showInFolder', (_, filePath) => fileOrganizer.showItemInFolder(filePath));
  ipcMain.handle('files:openPath', (_, targetPath) => fileOrganizer.openPath(targetPath));
  ipcMain.handle('files:getBillsBaseDir', () => fileOrganizer.getBillsBaseDir());
  ipcMain.handle('files:getBackupBaseDir', () => fileOrganizer.getBackupBaseDir());
  ipcMain.handle('files:openBackupFolder', () => fileOrganizer.openPath(fileOrganizer.getBackupBaseDir()));

  // --- Native Printing ---
  ipcMain.handle('print:bill', async (_, htmlContent) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve) => {
      printWin.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        printWin.close();
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      });
    });
  });
}
