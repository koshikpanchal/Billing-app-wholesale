# Offline Shop Management & Billing Application (Tally-Lite)
## Project Master Plan & Architecture Specification (`plan.md`)

**Application Name:** Jain Hosiery Billing & Shop Manager  
**Platform:** Windows 10/11 Desktop (Offline-First `.exe` via Electron Forge)  
**Target Environment:** 100% Offline (No cloud database or active internet required)  
**Primary Printer:** A4 Standard Printer (Optional: Slip / Thermal Receipt)  
**Document Storage Rule:** Automatic file saving to directory: `Year / Month / Date-Name_of_customer`

---

## 1. Executive Summary & Core Principles

The goal is to build a fast, lightweight, keyboard-friendly, offline Windows desktop billing and shop-management software tailored specifically for **Jain Hosiery** (retail and wholesale hosiery, garments, and general trade).

### Core Pillars (Incorporating User Decisions):
1. **Ultra-Fast Daily Cash Memos (Default):**  
   Everyday walk-in customers receive an informal Cash Memo created in seconds.
2. **Formal GST Invoices (Strictly Controlled):**  
   Formal GST Tax Invoices are generated **only in two explicit cases**:
   - **On customer demand:** When a customer specifically requests a GST bill at the counter.
   - **On business owner's demand (Batch Run):** When Jain Hosiery initiates a periodic (monthly/quarterly) batch creation/print run to meet target tax turnover (e.g. ₹2,00,000 across 200 invoices).
3. **Streamlined Payments (Cash & Online Only in Rupees ₹):**  
   Strictly two payment modes: **Cash** and **Online** (UPI, QR, GPay, PhonePe, Paytm, Bank Transfer). Currency is Indian Rupees (`₹`). If an order is not fully paid, the unpaid portion is tracked under Customer Khata (Credit).
4. **Bilingual Support (English & Hindi हिंदी) & Theme Modes (Dark & Light):**  
   - Header Language Switcher: Toggle between English and Hindi across all navigation, counters, and cards.
   - Header Theme Switcher: Toggle between sleek Dark Mode and high-contrast Daylight Light Mode.
5. **Structured Local File Saving (`Year -> Month -> Date-Name_of_customer`):**  
   Every finalized bill (Cash Memo, GST Invoice, or Batch Bill) is automatically saved into a clean folder structure on the local hard drive:  
   `Documents/JainHosiery/Bills/<Year>/<Month>/<YYYY-MM-DD>_<Customer_Name>_<BillNumber>.pdf`  
   The app provides a 1-click **"Open in File Explorer"** button to view any bill or folder instantly.
5. **Customer & Merchant Khata (Credit Ledgers):**  
   Track customer credit (Udhar) and payments. Record supplier/merchant purchases, stock received, and balance owed.
6. **Flexible Inventory Onboarding:**  
   Because Jain Hosiery already has a large stock that is hard to count all at once, billing is **never blocked** by stock counts. Items can be entered and billed immediately, with stock tracking activated gradually.
7. **End-of-Day Cash Drawer Reconciliation:**  
   Calculates exact cash in drawer (Opening + Cash Sales + Customer Cash Collections - Cash Expenses - Supplier Cash Paid - Cash Taken Home). Online collections are tracked separately and do not alter the physical drawer.

---

## 2. Technology Stack & System Architecture

```
+-------------------------------------------------------------------------+
|                              React 18 UI                                |
|  - Fast keyboard shortcuts (Enter, F2, F4, Esc)                         |
|  - Cash Memo Billing & GST Invoicing Screen                             |
|  - Product & Inventory Catalog (Flexible Stock)                         |
|  - Customer & Supplier Khata (Ledgers)                                  |
|  - Daily Cash Register (Day End Reconciliation)                         |
|  - Batch GST Generator & Reports Dashboard                              |
+------------------------------------+------------------------------------+
                                     |
               IPC Bridge (contextBridge / preload.js)
             Secure, validated channels (No nodeIntegration)
                                     |
+------------------------------------+------------------------------------+
|                       Electron Main Process                             |
|  - Window Management & Native A4 Printing                               |
|  - SQLite Database Operations (better-sqlite3 / sqlite3)                |
|  - Atomic Transactions (Invoice + Items + Stock + Payment)              |
|  - Automated PDF Exporter & Structured Folder Organizer                 |
|    (Year -> Month -> Date-CustomerName.pdf)                             |
|  - Daily Auto-Backup (.sqlite)                                          |
|  - Smart Batch Allocation Algorithm Engine                              |
+------------------+------------------------------------+-----------------+
                   |                                    |
+------------------+---------------+   +----------------+-----------------+
|        SQLite Database           |   |       Organized Bills Folder     |
| %APPDATA%/jain-hosiery/data.db   |   | Documents/JainHosiery/Bills/     |
| (Transactions, Khata, Products)  |   |   ├── 2026/                      |
|                                  |   |   │   ├── 10-October/            |
|                                  |   |   │   │   ├── 2026-10-18_WalkIn  |
|                                  |   |   │   │   └── 2026-10-18_Sharma  |
+----------------------------------+   +----------------------------------+
```

### Stack Components:
- **Renderer (UI):** React 18 + Vite + Lucide Icons + Vanilla CSS / Tailwind CSS.
- **Desktop Shell:** Electron (Runs locally, zero cloud latency, 100% offline).
- **Database:** SQLite (`better-sqlite3` or `sqlite3`) running on Electron Node.js main thread with atomic ACID transactions and WAL mode.
- **File System Organizer:** Node.js `fs` / `path` module automatically creating `Year/Month/` folders on invoice generation and saving PDF prints.
- **Print Engine:** Electron native print dialog & PDF generation for standard A4 templates.
- **Packaging:** Electron Forge / Electron Builder generating an installable Windows `.exe` setup.

---

## 3. Database Schema (SQLite)

```sql
-- 1. Business Configuration & Settings
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    business_name TEXT NOT NULL DEFAULT 'Jain Hosiery',
    trade_name TEXT,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Delhi',
    state_code TEXT NOT NULL DEFAULT '07',
    address_line1 TEXT,
    address_line2 TEXT,
    phone TEXT,
    email TEXT,
    invoice_prefix TEXT DEFAULT 'JH/',
    cash_memo_prefix TEXT DEFAULT 'CM/',
    financial_year TEXT DEFAULT '2026-27',
    terms_and_conditions TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    bank_branch TEXT,
    upi_id TEXT,
    bills_storage_path TEXT, -- Custom folder path (Defaults to ~/Documents/JainHosiery/Bills)
    allow_negative_stock BOOLEAN DEFAULT 1
);

-- 2. Products Catalog & Stock
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    hsn_code TEXT DEFAULT '6115', -- Default HSN for hosiery
    unit TEXT DEFAULT 'Pcs',       -- Pcs, Dozen, Box, Meter
    cost_price REAL DEFAULT 0,
    selling_price REAL NOT NULL,
    gst_rate REAL DEFAULT 5.0,    -- 0, 5, 12, 18
    current_stock REAL DEFAULT 0,
    is_stock_tracked BOOLEAN DEFAULT 0, -- 0 = untracked (allow immediate billing), 1 = strictly tracked
    min_stock_alert REAL DEFAULT 5,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Parties (Customers & Suppliers)
CREATE TABLE parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_type TEXT NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    state TEXT,
    state_code TEXT,
    gstin TEXT,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0, -- Positive = Receivables (Customer owes us), Negative = Payables (We owe supplier)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Invoices & Cash Memos
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type TEXT NOT NULL CHECK (document_type IN ('CASH_MEMO', 'GST_INVOICE', 'BATCH_GST')),
    invoice_number TEXT NOT NULL UNIQUE,
    financial_year TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    party_id INTEGER REFERENCES parties(id),
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_gstin TEXT,
    customer_address TEXT,
    customer_state TEXT,
    customer_state_code TEXT,
    place_of_supply TEXT,
    is_inter_state BOOLEAN DEFAULT 0,
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
    pdf_file_path TEXT,            -- Stored path: Bills/YYYY/MM/YYYY-MM-DD_CustomerName_BillNo.pdf
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED', 'DRAFT')),
    batch_reference_id TEXT,       -- If generated from batch tool
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Invoice Line Items (Historical Snapshots)
CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    item_name TEXT NOT NULL,       -- Frozen snapshot at time of billing
    hsn_code TEXT,
    unit TEXT,
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
CREATE TABLE purchases (
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

CREATE TABLE purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    item_name TEXT NOT NULL,
    hsn_code TEXT,
    quantity REAL NOT NULL,
    unit_cost REAL NOT NULL,
    gst_rate REAL DEFAULT 0,
    total_amount REAL NOT NULL
);

-- 7. Payment Transactions (Ledger Entries for Customer & Supplier settlements)
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_date DATE NOT NULL,
    party_id INTEGER NOT NULL REFERENCES parties(id),
    party_type TEXT CHECK (party_type IN ('CUSTOMER', 'SUPPLIER')),
    transaction_type TEXT CHECK (transaction_type IN ('INVOICE_PAYMENT', 'CREDIT_SETTLEMENT', 'SUPPLIER_PAYMENT')),
    invoice_id INTEGER REFERENCES invoices(id),
    purchase_id INTEGER REFERENCES purchases(id),
    amount REAL NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE')),
    reference_no TEXT, -- UPI UTR / Transaction ID (for Online)
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Stock Movement History (Audit Trail)
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING', 'PURCHASE', 'SALE', 'SALE_RETURN', 'ADJUSTMENT')),
    quantity REAL NOT NULL, -- Positive for in, Negative for out
    reference_id INTEGER,   -- invoice_id or purchase_id
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Daily Expenses (Petty Cash & Shop Overhead)
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL, -- 'Tea & Refreshment', 'Electricity', 'Staff Salary', 'Freight/Transport', 'Maintenance', 'Miscellaneous'
    description TEXT,
    amount REAL NOT NULL,
    payment_mode TEXT DEFAULT 'CASH' CHECK (payment_mode IN ('CASH', 'ONLINE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Daily Cash Register / Day End Reconciliation
CREATE TABLE daily_cash_register (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date DATE NOT NULL UNIQUE,
    opening_cash REAL NOT NULL DEFAULT 0,
    cash_sales REAL NOT NULL DEFAULT 0,
    customer_cash_collections REAL NOT NULL DEFAULT 0,
    cash_expenses REAL NOT NULL DEFAULT 0,
    supplier_cash_payments REAL NOT NULL DEFAULT 0,
    cash_taken_home REAL NOT NULL DEFAULT 0, -- Drawing by shop owner
    expected_closing_cash REAL NOT NULL DEFAULT 0,
    actual_closing_cash REAL,
    variance REAL DEFAULT 0,                 -- Difference between physical count and system
    online_sales_total REAL DEFAULT 0,       -- Tracked for information; doesn't affect drawer
    is_closed BOOLEAN DEFAULT 0,
    closed_at DATETIME,
    notes TEXT
);
```

---

## 4. Key Functional Modules & Business Logic

### Module 1: Dual Billing Engine & Physical File Organization
1. **Everyday Walk-in Mode (Cash Memo by Default):**
   - Super-fast item lookup by name or code.
   - No mandatory GSTIN or address needed.
   - Serial sequence: `CM/2026-27/0001`.
   - Payment mode: **Cash** or **Online**.
2. **Formal GST Tax Invoice (Strictly Controlled):**
   - Issued **ONLY** when:
     - Customer requests a GST bill at the counter (`[F4]` toggle), OR
     - Generated in batch on demand by Jain Hosiery.
   - Calculates CGST + SGST (intra-state) or IGST (inter-state).
   - Serial sequence: `JH/2026-27/0001`.
   - Full A4 standard Tax Invoice with HSN breakdown, amount in words, bank details, and signature box.
3. **Automatic File System Saving (`Year -> Month -> Date-Name_of_customer`):**
   - On saving any bill, Electron writes a PDF copy to:
     ```
     <Bills_Base_Dir>/
     └── 2026/
         └── 10-October/
             ├── 2026-10-18_Walk-in_CM-0001.pdf
             ├── 2026-10-18_RajeshGupta_CM-0002.pdf
             └── 2026-10-18_SharmaTextiles_JH-0001.pdf
     ```
   - If a customer name has spaces or special characters, it is safely sanitized.
   - A single click on the Invoice History screen or print dialog opens the exact file in Windows File Explorer.

---

### Module 2: Smart Batch GST Generator (Owner On-Demand)
- **Purpose:** On business owner demand (e.g. at month-end or quarter-end), create a verified batch of compliant GST invoices to reach a required sales target (e.g., ₹2,00,000 over 200 bills).
- **Inputs:**
  - Target Sales Amount (e.g., ₹2,00,000)
  - Number of Bills (e.g., 200)
  - Date Range (e.g., 1st Oct to 31st Oct)
  - Catalog Selection (e.g., Vests, Undergarments, Socks, Handkerchiefs)
- **Algorithm:**
  - Generates realistic varied totals around ₹1,000 (e.g. ₹920, ₹1,050, ₹1,110, ₹890, ₹980).
  - Selects actual product catalog names, prices, and quantities (1, 2, 3, 5 pcs).
  - Distributes bills chronologically across shop hours (10:30 AM to 8:30 PM).
  - Computes exact CGST + SGST (or IGST) and adjusts round-offs so that the **grand total matches ₹2,00,000.00 to the exact paisa**.
  - Tags records as `document_type = 'BATCH_GST'` so they do **not** double-count daily cash drawer money or distort physical inventory.
  - Automatically saves all generated bills to `Year -> Month -> Date-Name` folders and allows 1-click bulk print or Excel/CSV export for the CA.

---

### Module 3: Streamlined Payment System (Cash & Online Only)
- Payment options in billing and ledger settlements:
  1. **Cash:** Directly affects the physical cash drawer.
  2. **Online:** Recorded with optional reference/UTR number. Does **not** affect the physical cash drawer; tracked separately in daily accounts.
  3. **Credit (Customer Khata):** For trusted customers where payment is deferred or partially paid.

---

### Module 4: Customer & Supplier Khata (Credit Ledgers)
- **Customer Khata (Receivables):**
  - Instant balance view: who owes money and how much.
  - Full statement: Bill dates, bill amounts, payments made (Cash/Online), and running balance.
  - "Receive Payment" modal: Record payment in Cash or Online with instant printable voucher.
- **Supplier / Merchant Khata (Payables):**
  - Merchant purchase entry: record invoice number, items purchased, cost price, and GST.
  - Updates stock.
  - Tracks amount owed, amount paid (Cash/Online), and pending balance.
  - "Pay Supplier" modal: Deducts from daily cash drawer (if paid in cash) or bank, and updates merchant balance.

---

### Module 5: Flexible Stock Onboarding
- **Transition Strategy:**
  - Jain Hosiery's existing inventory can remain untracked initially (`is_stock_tracked = false`).
  - Shopkeeper can bill without any "Out of Stock" blockers.
  - As new shipments arrive from merchants or products are counted, stock tracking is enabled item-by-item.

---

### Module 6: Daily Cash Register & Day-End Reconciliation (Cashbook)
$$\begin{aligned}
\text{Expected Drawer Cash} = &\ \text{Opening Cash (from yesterday's closing)} \\
& + \text{Today's Cash Sales} \\
& + \text{Today's Cash Collections from Credit Customers} \\
& - \text{Today's Cash Expenses (Tea, snacks, electricity, etc.)} \\
& - \text{Today's Cash Paid to Suppliers} \\
& - \text{Cash Taken Home by Owner (Drawing)}
\end{aligned}$$

- **Daily Closing Screen:**
  - Calculates Expected Drawer Cash.
  - Shopkeeper enters physical counted cash.
  - Shows variance (difference, if any).
  - Clicking **"Close Register for Today"** locks the day and sets tomorrow's opening balance automatically!
  - **Online Collections:** Reported separately on the screen so the shopkeeper can cross-verify their UPI/bank statement.

---

## 5. Project Folder Structure

```
jain-hosiery/
├── package.json
├── vite.config.js
├── forge.config.js
├── index.html
├── src/
│   ├── main/
│   │   ├── main.js                  # Electron main entry point
│   │   ├── preload.js               # ContextBridge IPC APIs
│   │   ├── database/
│   │   │   ├── db.js                # SQLite connection & WAL mode
│   │   │   ├── schema.sql           # Tables & initial default settings
│   │   │   ├── migrations.js        # Safe schema versioning
│   │   │   └── repositories/
│   │   │       ├── productRepo.js   # Product & stock queries
│   │   │       ├── invoiceRepo.js   # Invoices & line items (transactional)
│   │   │       ├── partyRepo.js     # Customers & Suppliers
│   │   │       ├── purchaseRepo.js  # Supplier purchase & dues
│   │   │       ├── cashRegisterRepo.js # Daily drawer & expenses
│   │   │       └── batchGenRepo.js  # Batch GST generation engine
│   │   └── services/
│   │       ├── printService.js      # A4 print window & printer dialog
│   │       ├── fileOrganizerService.js # Year -> Month -> Date-CustomerName.pdf saver
│   │       ├── backupService.js     # Database backup & restore (.sqlite)
│   │       └── batchEngine.js       # Smart target allocation algorithm
│   └── renderer/
│       ├── main.jsx                 # React root
│       ├── App.jsx                  # Navigation & layout
│       ├── index.css                # Clean retail design system
│       ├── context/
│       │   ├── SettingsContext.jsx  # Shop settings (GSTIN, name, bills folder)
│       │   └── DrawerContext.jsx    # Current day drawer state
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── Navbar.jsx
│       │   │   └── Sidebar.jsx
│       │   ├── Common/
│       │   │   ├── Modal.jsx
│       │   │   ├── StatCard.jsx
│       │   │   └── SearchInput.jsx
│       │   └── Print/
│       │       ├── A4InvoicePrint.jsx    # Printable GST Invoice Layout
│       │       └── CashMemoPrint.jsx     # Printable Cash Memo Layout
│       └── pages/
│           ├── Dashboard.jsx            # Daily summary, quick stats
│           ├── Billing.jsx              # Fast Cash Memo & GST billing
│           ├── InvoiceHistory.jsx       # Search, view, reprint, open folder
│           ├── BatchGSTGenerator.jsx    # Smart Target & Count generator
│           ├── Products.jsx             # Stock, price, HSN management
│           ├── CustomersKhata.jsx       # Customer credit & statements
│           ├── SuppliersKhata.jsx       # Merchant purchases & dues
│           ├── DailyRegister.jsx        # Cashbook, expenses & day closing
│           └── Settings.jsx             # Business details, backup & folder setup
```

---

## 6. Implementation Roadmap

```
Phase 1: Project Scaffolding & Desktop Shell
├── Initialize Vite + React 18 + Electron + SQLite (better-sqlite3)
├── Configure Electron Forge, preload scripts, and safe IPC bridge
└── Set up file organizer service (Year -> Month -> Date-Name.pdf generator)

Phase 2: Database Layer & Business Settings
├── Run SQLite schema initialization with foreign keys & WAL mode
├── Default business settings setup (Jain Hosiery, Delhi/State, GSTIN, FY 2026-27)
└── Automated backup & bills folder configuration

Phase 3: Product Master & Flexible Stock Management
├── Add, edit, search products with HSN, GST rate, selling & cost prices
├── Flexible stock mode (allow billing with uncounted stock / negative stock)
└── Quick lookup by product name or item code

Phase 4: Fast Billing Engine & A4 Print Templates
├── Ultra-fast keyboard-driven Cash Memo interface
├── Instant toggle to GST Tax Invoice (auto CGST/SGST vs IGST)
├── Strict Cash and Online payment handling
├── Automated PDF saving to Year -> Month -> Date-Name.pdf
└── Pixel-perfect A4 printable GST Invoice & Cash Memo templates

Phase 5: Customer & Supplier Khata (Credit Ledgers)
├── Customer ledger: Outstanding balance, purchase history, Cash/Online settlements
├── Supplier ledger: Purchases, accounts payable, payment recording
└── Printable account statements & ledger vouchers

Phase 6: Daily Cash Register & Expense Tracker
├── Opening cash carryover from previous day
├── Cash inflows (sales + customer collections) & Outflows (expenses + supplier payments + cash taken home)
├── Variance detection & Day Closing workflow
└── Independent online/UPI collections tracker

Phase 7: Smart Batch GST Invoice Generator (Owner On-Demand)
├── Target amount (e.g. ₹2,00,000) & bill count (e.g. 200) allocation engine
├── Catalog-based item selection with natural price variation (920, 1050, etc.)
├── Exact-to-the-paisa GST calculation & date spreading across month/quarter
├── Automatic batch file export to Year -> Month -> Date-Name folders
└── Bulk A4 printing & CA Excel/CSV export

Phase 8: Polish, Packaging & Production Build
├── Keyboard shortcuts throughout the app ([F2] Bill, [F3] History, [F4] GST, [Enter] Add item)
├── End-to-end testing with sample business transactions
└── Package standalone Windows setup `.exe` via Electron Forge
```
