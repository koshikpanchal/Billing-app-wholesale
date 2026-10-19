const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Products
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    search: (query) => ipcRenderer.invoke('products:search', query),
    create: (data) => ipcRenderer.invoke('products:create', data),
    update: (id, data) => ipcRenderer.invoke('products:update', id, data),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
  },

  // Invoices & Cash Memos
  invoices: {
    create: (data) => ipcRenderer.invoke('invoices:create', data),
    getById: (id) => ipcRenderer.invoke('invoices:getById', id),
    getList: (filters) => ipcRenderer.invoke('invoices:getList', filters),
    getNextNumber: (type) => ipcRenderer.invoke('invoices:getNextNumber', type),
    cancel: (id) => ipcRenderer.invoke('invoices:cancel', id),
    getPrintHtml: (id) => ipcRenderer.invoke('invoices:getPrintHtml', id),
  },

  // Parties (Customers & Suppliers)
  parties: {
    getAll: (type) => ipcRenderer.invoke('parties:getAll', type),
    getById: (id) => ipcRenderer.invoke('parties:getById', id),
    create: (data) => ipcRenderer.invoke('parties:create', data),
    update: (id, data) => ipcRenderer.invoke('parties:update', id, data),
    recordPayment: (data) => ipcRenderer.invoke('parties:recordPayment', data),
    getStatement: (id) => ipcRenderer.invoke('parties:getStatement', id),
  },

  // Purchases (Merchants)
  purchases: {
    create: (data) => ipcRenderer.invoke('purchases:create', data),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
    getAll: (limit) => ipcRenderer.invoke('purchases:getAll', limit),
  },

  // Daily Cash Register & Reconciliation
  register: {
    getToday: () => ipcRenderer.invoke('register:getToday'),
    recordExpense: (data) => ipcRenderer.invoke('register:recordExpense', data),
    getExpenses: (date) => ipcRenderer.invoke('register:getExpenses', date),
    updateCashTakenHome: (amount) => ipcRenderer.invoke('register:updateCashTakenHome', amount),
    closeDay: (data) => ipcRenderer.invoke('register:closeDay', data),
    getDashboardStats: () => ipcRenderer.invoke('register:getDashboardStats'),
  },

  // Smart Batch GST Generator
  batch: {
    generate: (params) => ipcRenderer.invoke('batch:generate', params),
    commit: (batchData) => ipcRenderer.invoke('batch:commit', batchData),
  },

  // Business Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data) => ipcRenderer.invoke('settings:update', data),
  },

  // File System & Explorer Integration (Year -> Month -> Date-Name)
  files: {
    showInFolder: (filePath) => ipcRenderer.invoke('files:showInFolder', filePath),
    openPath: (targetPath) => ipcRenderer.invoke('files:openPath', targetPath),
    getBillsBaseDir: () => ipcRenderer.invoke('files:getBillsBaseDir'),
  },

  // Printing
  print: {
    printBill: (htmlContent) => ipcRenderer.invoke('print:bill', htmlContent),
  },
});
