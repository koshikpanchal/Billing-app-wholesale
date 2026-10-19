require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;

function getDatabasePath() {
  const dbFileName = process.env.DB_NAME || 'jain_hosiery.sqlite';
  let userDataPath = path.join(process.cwd(), '.data');
  if (process.versions && process.versions.electron) {
    try {
      const electron = require('electron');
      const app = electron?.app || electron;
      if (app && typeof app.getPath === 'function') {
        userDataPath = app.getPath('userData');
      }
    } catch (err) {}
  }

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, dbFileName);
}

function initDatabase() {
  if (db) return db;

  const dbPath = getDatabasePath();
  console.log('[Database] Connecting to SQLite at:', dbPath);

  db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? null : null });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Read and execute schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Seed sample products if table is empty
  seedInitialData(db);

  return db;
}

function seedInitialData(db) {
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0) {
    console.log('[Database] Seeding initial hosiery products & settings...');
    const insertProduct = db.prepare(`
      INSERT INTO products (item_code, name, description, hsn_code, unit, cost_price, selling_price, gst_rate, current_stock, is_stock_tracked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialProducts = [
      ['JH-101', 'Men Cotton Vest R.N. (Size 85)', 'Super combed premium cotton vest', '6109', 'Pcs', 80, 110, 5.0, 120, 1],
      ['JH-102', 'Men Cotton Vest R.N. (Size 90)', 'Super combed premium cotton vest', '6109', 'Pcs', 85, 120, 5.0, 100, 1],
      ['JH-103', 'Men Cotton Brief (Size 85)', 'Elastic waistband combed cotton brief', '6107', 'Pcs', 75, 105, 5.0, 150, 1],
      ['JH-104', 'Men Cotton Brief (Size 90)', 'Elastic waistband combed cotton brief', '6107', 'Pcs', 80, 115, 5.0, 140, 1],
      ['JH-201', 'Women Cotton Leggings (Free Size)', '4-way stretch premium churidar leggings', '6115', 'Pcs', 190, 290, 5.0, 80, 1],
      ['JH-202', 'Women Cotton Camisole Slip', 'Pure soft cotton inner slip', '6212', 'Pcs', 95, 150, 5.0, 90, 1],
      ['JH-301', 'School Cotton Socks (Pack of 3)', 'Durable cushioned everyday school socks', '6115', 'Box', 85, 135, 5.0, 200, 1],
      ['JH-302', 'Ankle Length Sports Socks', 'Breathable athletic terry socks', '6115', 'Pcs', 40, 70, 5.0, 160, 1],
      ['JH-401', 'Cotton Handkerchief (Box of 6)', 'Soft woven absorbent gent hankies', '6213', 'Box', 110, 180, 5.0, 75, 1],
      ['JH-501', 'Kids Cotton Bloomers / Shorts', 'Pure bio-wash infant daily wear', '6111', 'Pcs', 50, 85, 5.0, 110, 1],
      ['JH-601', 'Thermal Inner Top (Winter)', 'Warm fleece-lined thermal innerwear', '6107', 'Pcs', 280, 420, 5.0, 60, 1],
      ['JH-602', 'Thermal Lower Pajama (Winter)', 'Warm fleece-lined thermal bottoms', '6107', 'Pcs', 280, 420, 5.0, 60, 1],
      ['S-20-120', 'Shirt (Size: 20/22/24)', 'Wholesale Pack of 3 (Sizes 20, 22, 24)', '6105', 'Set', 90, 120, 5.0, 50, 1],
      ['S-20-150', 'Shirt (Size: 20/22/24)', 'Wholesale Pack of 3 (Sizes 20, 22, 24)', '6105', 'Set', 115, 150, 5.0, 40, 1],
      ['S-20-200', 'Shirt (Size: 20/22/24)', 'Wholesale Pack of 3 (Sizes 20, 22, 24)', '6105', 'Set', 150, 200, 5.0, 60, 1],
      ['S-26-200', 'Shirt (Size: 26/28/30)', 'Wholesale Pack of 3 (Sizes 26, 28, 30)', '6105', 'Set', 155, 200, 5.0, 45, 1],
      ['S-26/30-200', 'Shirt (Size: 26/30)', 'Wholesale Pack of 2 (Sizes 26, 30)', '6105', 'Set', 160, 200, 5.0, 35, 1]
    ];

    const insertMany = db.transaction((products) => {
      for (const p of products) insertProduct.run(...p);
    });
    insertMany(initialProducts);

    // Seed sample supplier and customer
    const insertParty = db.prepare(`
      INSERT INTO parties (party_type, name, phone, address, state, state_code, gstin, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertParty.run('SUPPLIER', 'Vardhman Knitting Mills', '+91 98111 22233', 'Ludhiana, Punjab', 'Punjab', '03', '03ABCDE1234F1Z5', -45000);
    insertParty.run('SUPPLIER', 'Rupa & Co Distributors', '+91 98222 33344', 'Surat, Gujarat', 'Gujarat', '24', '24AAACR1234M1Z2', -28000);
    insertParty.run('CUSTOMER', 'Rajesh Sharma (Sharma Garments)', '+91 98999 11122', 'Karol Bagh, Delhi', 'Delhi', '07', '', 3500);
    insertParty.run('CUSTOMER', 'Deepak Hosiery Store', '+91 98777 44455', 'Noida, UP', 'Uttar Pradesh', '09', '09AAACD5678K1Z9', 7200);

    // Seed today's opening register if not present
    const today = new Date().toISOString().split('T')[0];
    const checkRegister = db.prepare('SELECT id FROM daily_cash_register WHERE entry_date = ?').get(today);
    if (!checkRegister) {
      db.prepare(`
        INSERT INTO daily_cash_register (entry_date, opening_cash, cash_sales, customer_cash_collections, cash_expenses, supplier_cash_payments, cash_taken_home, expected_closing_cash, online_sales_total, is_closed)
        VALUES (?, 10000, 0, 0, 0, 0, 0, 10000, 0, 0)
      `).run(today);
    }
  }
}

function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

module.exports = {
  initDatabase,
  getDb,
  getDatabasePath,
};
