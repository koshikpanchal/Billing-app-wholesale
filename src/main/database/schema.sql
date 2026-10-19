-- Jain Hosiery Database Schema

-- 1. Business Configuration & Settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    business_name TEXT NOT NULL DEFAULT 'Jain Hosiery',
    trade_name TEXT DEFAULT 'Wholesale & Retail Hosiery',
    gstin TEXT DEFAULT '07AAAAA0000A1Z5',
    state TEXT NOT NULL DEFAULT 'Delhi',
    state_code TEXT NOT NULL DEFAULT '07',
    address_line1 TEXT DEFAULT 'Gandhi Nagar, Main Road',
    address_line2 TEXT DEFAULT 'Delhi - 110031',
    phone TEXT DEFAULT '+91 98765 43210',
    email TEXT DEFAULT 'info@jainhosiery.com',
    invoice_prefix TEXT DEFAULT 'JH/',
    cash_memo_prefix TEXT DEFAULT 'CM/',
    financial_year TEXT DEFAULT '2026-27',
    terms_and_conditions TEXT DEFAULT '1. Goods once sold will not be taken back without bill. 2. Subject to Delhi jurisdiction.',
    bank_name TEXT DEFAULT 'State Bank of India',
    bank_account_no TEXT DEFAULT '12345678901',
    bank_ifsc TEXT DEFAULT 'SBIN0001234',
    bank_branch TEXT DEFAULT 'Gandhi Nagar Branch',
    upi_id TEXT DEFAULT 'jainhosiery@upi',
    bills_storage_path TEXT,
    allow_negative_stock INTEGER DEFAULT 1
);

-- Insert default row if not exists
INSERT OR IGNORE INTO settings (id, business_name, state, state_code) 
VALUES (1, 'Jain Hosiery', 'Delhi', '07');

-- 2. Products Catalog & Stock
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    hsn_code TEXT DEFAULT '6115',
    unit TEXT DEFAULT 'Pcs',
    cost_price REAL DEFAULT 0,
    selling_price REAL NOT NULL,
    gst_rate REAL DEFAULT 5.0,
    current_stock REAL DEFAULT 0,
    is_stock_tracked INTEGER DEFAULT 0, -- 0: allow billing without stock limits, 1: strictly tracked
    min_stock_alert REAL DEFAULT 5,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Parties (Customers & Suppliers)
CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_type TEXT NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    state TEXT DEFAULT 'Delhi',
    state_code TEXT DEFAULT '07',
    gstin TEXT,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0, -- Positive: Customer owes us, Negative: We owe supplier
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Invoices & Cash Memos
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type TEXT NOT NULL CHECK (document_type IN ('CASH_MEMO', 'GST_INVOICE', 'BATCH_GST')),
    invoice_number TEXT NOT NULL UNIQUE,
    financial_year TEXT NOT NULL DEFAULT '2026-27',
    invoice_date DATE NOT NULL,
    party_id INTEGER REFERENCES parties(id),
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_gstin TEXT,
    customer_address TEXT,
    customer_state TEXT DEFAULT 'Delhi',
    customer_state_code TEXT DEFAULT '07',
    place_of_supply TEXT DEFAULT 'Delhi (07)',
    is_inter_state INTEGER DEFAULT 0,
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    taxable_amount REAL NOT NULL,
    cgst_amount REAL DEFAULT 0,
    sgst_amount REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    round_off REAL DEFAULT 0,
    grand_total REAL NOT NULL,
    paid_amount REAL NOT NULL,
    balance_amount REAL DEFAULT 0, -- Credit given
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE', 'CREDIT')),
    pdf_file_path TEXT,
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED', 'DRAFT')),
    batch_reference_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    item_name TEXT NOT NULL,
    hsn_code TEXT,
    unit TEXT DEFAULT 'Pcs',
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    taxable_value REAL NOT NULL,
    gst_rate REAL NOT NULL,
    cgst_amount REAL DEFAULT 0,
    sgst_amount REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL
);

-- 6. Purchases from Merchants / Suppliers
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES parties(id),
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL,
    balance_amount REAL DEFAULT 0,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE', 'CREDIT')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    item_name TEXT NOT NULL,
    hsn_code TEXT,
    quantity REAL NOT NULL,
    unit_cost REAL NOT NULL,
    gst_rate REAL DEFAULT 5.0,
    total_amount REAL NOT NULL
);

-- 7. Payment Transactions (Ledger Entries)
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_date DATE NOT NULL,
    party_id INTEGER NOT NULL REFERENCES parties(id),
    party_type TEXT CHECK (party_type IN ('CUSTOMER', 'SUPPLIER')),
    transaction_type TEXT CHECK (transaction_type IN ('INVOICE_PAYMENT', 'CREDIT_SETTLEMENT', 'SUPPLIER_PAYMENT')),
    invoice_id INTEGER REFERENCES invoices(id),
    purchase_id INTEGER REFERENCES purchases(id),
    amount REAL NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE')),
    reference_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Stock Movement History
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING', 'PURCHASE', 'SALE', 'SALE_RETURN', 'ADJUSTMENT')),
    quantity REAL NOT NULL,
    reference_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Daily Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    payment_mode TEXT DEFAULT 'CASH' CHECK (payment_mode IN ('CASH', 'ONLINE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Daily Cash Register
CREATE TABLE IF NOT EXISTS daily_cash_register (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date DATE NOT NULL UNIQUE,
    opening_cash REAL NOT NULL DEFAULT 0,
    cash_sales REAL NOT NULL DEFAULT 0,
    customer_cash_collections REAL NOT NULL DEFAULT 0,
    cash_expenses REAL NOT NULL DEFAULT 0,
    supplier_cash_payments REAL NOT NULL DEFAULT 0,
    cash_taken_home REAL NOT NULL DEFAULT 0,
    expected_closing_cash REAL NOT NULL DEFAULT 0,
    actual_closing_cash REAL,
    variance REAL DEFAULT 0,
    online_sales_total REAL DEFAULT 0,
    is_closed INTEGER DEFAULT 0,
    closed_at DATETIME,
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(document_type);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(item_code);
CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(party_type);
