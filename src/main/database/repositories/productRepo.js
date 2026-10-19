const { getDb } = require('../db');

function getAllProducts() {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC').all();
}

function searchProducts(query = '') {
  const db = getDb();
  const q = `%${query.trim()}%`;
  return db.prepare(`
    SELECT * FROM products 
    WHERE is_active = 1 AND (name LIKE ? OR item_code LIKE ? OR hsn_code LIKE ?)
    ORDER BY name ASC LIMIT 30
  `).all(q, q, q);
}

function getProductById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function createProduct(product) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO products (
      item_code, name, description, hsn_code, unit, cost_price, 
      selling_price, gst_rate, current_stock, is_stock_tracked, min_stock_alert
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    product.item_code || `JH-${Date.now().toString().slice(-4)}`,
    product.name,
    product.description || '',
    product.hsn_code || '6115',
    product.unit || 'Pcs',
    product.cost_price || 0,
    product.selling_price || 0,
    product.gst_rate !== undefined ? product.gst_rate : 5.0,
    product.current_stock || 0,
    product.is_stock_tracked ? 1 : 0,
    product.min_stock_alert || 5
  );

  return getProductById(info.lastInsertRowid);
}

function updateProduct(id, product) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE products SET
      item_code = ?,
      name = ?,
      description = ?,
      hsn_code = ?,
      unit = ?,
      cost_price = ?,
      selling_price = ?,
      gst_rate = ?,
      current_stock = ?,
      is_stock_tracked = ?,
      min_stock_alert = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    product.item_code,
    product.name,
    product.description || '',
    product.hsn_code || '6115',
    product.unit || 'Pcs',
    product.cost_price || 0,
    product.selling_price || 0,
    product.gst_rate,
    product.current_stock || 0,
    product.is_stock_tracked ? 1 : 0,
    product.min_stock_alert || 5,
    id
  );

  return getProductById(id);
}

function deleteProduct(id) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Unlink foreign keys from line items so historical records remain intact
    db.prepare('UPDATE invoice_items SET product_id = NULL WHERE product_id = ?').run(id);
    db.prepare('UPDATE purchase_items SET product_id = NULL WHERE product_id = ?').run(id);
    // Permanently delete row from products table in SQLite
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
  });
  txn();
  return { success: true };
}

module.exports = {
  getAllProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
