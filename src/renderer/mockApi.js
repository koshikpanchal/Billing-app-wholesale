// Browser Persistent Storage Fallback Mock for window.api when running outside Electron
if (typeof window !== 'undefined' && !window.api) {
  console.log('[DevMock] Initializing browser persistent localStorage fallback for window.api');

  // Storage Helpers
  const getStorage = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const setStorage = (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('[DevMock] Failed to save to localStorage:', e);
    }
  };

  // Seed default data if localStorage is empty
  const defaultProducts = [
    { id: 1, item_code: 'JH-101', name: 'Men Cotton Vest R.N. (Size 85)', hsn_code: '6109', unit: 'Pcs', cost_price: 80, selling_price: 110, gst_rate: 5.0, current_stock: 120, is_stock_tracked: 1 },
    { id: 2, item_code: 'JH-102', name: 'Men Cotton Vest R.N. (Size 90)', hsn_code: '6109', unit: 'Pcs', cost_price: 85, selling_price: 120, gst_rate: 5.0, current_stock: 100, is_stock_tracked: 1 },
    { id: 3, item_code: 'JH-103', name: 'Men Cotton Brief (Size 85)', hsn_code: '6107', unit: 'Pcs', cost_price: 75, selling_price: 105, gst_rate: 5.0, current_stock: 150, is_stock_tracked: 1 },
    { id: 4, item_code: 'JH-201', name: 'Women Cotton Leggings (Free Size)', hsn_code: '6115', unit: 'Pcs', cost_price: 190, selling_price: 290, gst_rate: 5.0, current_stock: 80, is_stock_tracked: 1 },
    { id: 5, item_code: 'JH-301', name: 'School Cotton Socks (Pack of 3)', hsn_code: '6115', unit: 'Box', cost_price: 85, selling_price: 135, gst_rate: 5.0, current_stock: 200, is_stock_tracked: 1 },
    { id: 6, item_code: 'S-20-120', name: 'Shirt (Size: 20/22/24)', description: 'Wholesale Pack of 3 (Sizes 20, 22, 24)', hsn_code: '6105', unit: 'Set', cost_price: 90, selling_price: 120, gst_rate: 5.0, current_stock: 50, is_stock_tracked: 1 },
    { id: 7, item_code: 'S-20-150', name: 'Shirt (Size: 20/22/24)', description: 'Wholesale Pack of 3 (Sizes 20, 22, 24)', hsn_code: '6105', unit: 'Set', cost_price: 115, selling_price: 150, gst_rate: 5.0, current_stock: 40, is_stock_tracked: 1 },
    { id: 8, item_code: 'S-20-200', name: 'Shirt (Size: 20/22/24)', description: 'Wholesale Pack of 3 (Sizes 20, 22, 24)', hsn_code: '6105', unit: 'Set', cost_price: 150, selling_price: 200, gst_rate: 5.0, current_stock: 60, is_stock_tracked: 1 },
    { id: 9, item_code: 'S-26-200', name: 'Shirt (Size: 26/28/30)', description: 'Wholesale Pack of 3 (Sizes 26, 28, 30)', hsn_code: '6105', unit: 'Set', cost_price: 155, selling_price: 200, gst_rate: 5.0, current_stock: 45, is_stock_tracked: 1 },
    { id: 10, item_code: 'S-26/30-200', name: 'Shirt (Size: 26/30)', description: 'Wholesale Pack of 2 (Sizes 26, 30)', hsn_code: '6105', unit: 'Set', cost_price: 160, selling_price: 200, gst_rate: 5.0, current_stock: 35, is_stock_tracked: 1 }
  ];

  const defaultParties = [
    { id: 1, party_type: 'CUSTOMER', name: 'Rajesh Sharma (Sharma Garments)', phone: '+91 98999 11122', current_balance: 3500 },
    { id: 2, party_type: 'CUSTOMER', name: 'Deepak Hosiery Store', phone: '+91 98777 44455', current_balance: 7200 },
    { id: 3, party_type: 'SUPPLIER', name: 'Vardhman Knitting Mills', phone: '+91 98111 22233', current_balance: -45000 }
  ];

  const defaultRegister = {
    id: 1,
    entry_date: new Date().toISOString().split('T')[0],
    opening_cash: 10000,
    cash_sales: 0,
    customer_cash_collections: 0,
    cash_expenses: 0,
    supplier_cash_payments: 0,
    cash_taken_home: 0,
    expected_closing_cash: 10000,
    actual_closing_cash: null,
    variance: 0,
    online_sales_total: 0,
    is_closed: 0
  };

  const defaultSettings = {
    business_name: 'Jain Hosiery',
    trade_name: 'Wholesale & Retail Hosiery',
    gstin: '07AAAAA0000A1Z5',
    state: 'Delhi',
    state_code: '07',
    address_line1: 'Gandhi Nagar, Main Road',
    address_line2: 'Delhi - 110031',
    phone: '+91 98765 43210',
    invoice_prefix: 'JH/',
    cash_memo_prefix: 'CM/',
    financial_year: '2026-27',
    terms_and_conditions: '1. Goods once sold will not be taken back without bill.',
    bank_name: 'State Bank of India',
    bank_account_no: '12345678901',
    bank_ifsc: 'SBIN0001234',
    upi_id: 'jainhosiery@upi'
  };

  window.api = {
    _isMock: true,

    products: {
      getAll: async () => {
        let list = getStorage('jh_mock_products', null);
        if (!list) {
          list = [...defaultProducts];
          setStorage('jh_mock_products', list);
        } else {
          let updated = false;
          for (const dp of defaultProducts) {
            if (!list.some(p => p.item_code === dp.item_code)) {
              list.push(dp);
              updated = true;
            }
          }
          if (updated) setStorage('jh_mock_products', list);
        }
        return list;
      },
      search: async (q) => {
        const list = getStorage('jh_mock_products', defaultProducts);
        return list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.item_code.toLowerCase().includes(q.toLowerCase()));
      },
      create: async (data) => {
        const list = getStorage('jh_mock_products', defaultProducts);
        const item = { ...data, id: Date.now() };
        list.push(item);
        setStorage('jh_mock_products', list);
        return item;
      },
      update: async (id, data) => {
        const list = getStorage('jh_mock_products', defaultProducts);
        const idx = list.findIndex(p => p.id === id);
        if (idx !== -1) list[idx] = { ...list[idx], ...data };
        setStorage('jh_mock_products', list);
        return list[idx];
      },
      delete: async (id) => {
        let list = getStorage('jh_mock_products', defaultProducts);
        list = list.filter(p => p.id !== id);
        setStorage('jh_mock_products', list);
        return { success: true };
      }
    },

    invoices: {
      create: async (data) => {
        const list = getStorage('jh_mock_invoices', []);
        const nextId = Date.now();
        const inv = { 
          ...data, 
          id: nextId, 
          pdf_file_path: `Documents/JainHosiery/Bills/2026/10-October/${data.invoice_date}_${data.customer_name}_${data.invoice_number}.html` 
        };
        list.unshift(inv);
        setStorage('jh_mock_invoices', list);

        // Update register
        const reg = getStorage('jh_mock_register', defaultRegister);
        if (data.payment_mode === 'CASH') {
          reg.cash_sales += (data.paid_amount || data.grand_total);
          reg.expected_closing_cash += (data.paid_amount || data.grand_total);
        } else if (data.payment_mode === 'ONLINE') {
          reg.online_sales_total += (data.paid_amount || data.grand_total);
        }
        setStorage('jh_mock_register', reg);

        return inv;
      },
      getById: async (id) => {
        const list = getStorage('jh_mock_invoices', []);
        return list.find(i => i.id === id);
      },
      getList: async (filters = {}) => {
        let list = getStorage('jh_mock_invoices', []);
        if (filters.type) {
          list = list.filter(i => i.document_type === filters.type);
        }
        if (filters.query && filters.query.trim()) {
          const q = filters.query.toLowerCase();
          list = list.filter(i => (i.customer_name && i.customer_name.toLowerCase().includes(q)) || (i.invoice_number && i.invoice_number.toLowerCase().includes(q)));
        }
        return list;
      },
      getNextNumber: async (type) => {
        const list = getStorage('jh_mock_invoices', []);
        const prefix = type === 'GST_INVOICE' ? 'JH/2026-27/' : 'CM/2026-27/';
        return `${prefix}${(list.length + 1).toString().padStart(4, '0')}`;
      },
      cancel: async (id) => {
        const list = getStorage('jh_mock_invoices', []);
        const inv = list.find(i => i.id === id);
        if (inv) inv.status = 'CANCELLED';
        setStorage('jh_mock_invoices', list);
        return inv;
      },
      getPrintHtml: async (id) => {
        const list = getStorage('jh_mock_invoices', []);
        const inv = list.find(i => i.id === id) || list[0] || {};
        const stt = getStorage('jh_mock_settings', defaultSettings);
        
        const renderCopy = (label) => `
          <div style="border: 1px solid #94a3b8; border-radius: 4px; padding: 8px 12px; height: 136mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1.5px solid #0f172a; padding-bottom: 5px;">
              <div>
                <div style="font-size: 17px; font-weight: 800; color: #0f172a;">${stt.business_name || 'JAIN HOSIERY'}</div>
                <div style="font-size: 10px; color: #334155;">${stt.trade_name || 'Wholesale & Retail Hosiery Specialist'}</div>
                <div style="font-size: 9.5px; color: #475569;">${stt.address_line1 || 'Gandhi Nagar'}, ${stt.address_line2 || 'Delhi - 110031'} | Ph: ${stt.phone || '+91 98765 43210'}</div>
                ${inv.document_type === 'GST_INVOICE' ? `<div style="font-size: 9.5px; color: #475569;"><strong>GSTIN:</strong> ${stt.gstin} | State: ${stt.state} (${stt.state_code})</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="background: #e2e8f0; border: 1px solid #94a3b8; padding: 2px 8px; font-size: 9px; font-weight: 800; border-radius: 3px; display: inline-block;">${label}</div>
                <div style="font-size: 13px; font-weight: 800; margin-top: 3px;">${inv.document_type === 'GST_INVOICE' ? 'TAX INVOICE' : 'CASH MEMO'}</div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin: 4px 0;">
              <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 3px; padding: 4px 8px; background: #f8fafc; font-size: 10px;">
                <strong style="text-transform: uppercase; color: #64748b; font-size: 9px;">Billed To:</strong><br>
                <span style="font-size: 12px; font-weight: 700;">${inv.customer_name || 'Walk-in Customer'}</span><br>
                ${inv.customer_phone ? `Phone: ${inv.customer_phone}<br>` : ''}
                ${inv.customer_gstin ? `GSTIN: ${inv.customer_gstin}` : ''}
              </div>
              <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 3px; padding: 4px 8px; background: #f8fafc; font-size: 10px;">
                <strong>Bill No:</strong> <span style="font-family: monospace; font-weight: 700;">${inv.invoice_number || 'CM/2026-27/0001'}</span><br>
                <strong>Date:</strong> ${inv.invoice_date || '2026-10-19'}<br>
                <strong>Payment Mode:</strong> <span style="background: #0f172a; color: #fff; padding: 1px 4px; border-radius: 2px; font-weight: 700;">${inv.payment_mode || 'CASH'}</span>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="border: 1px solid #94a3b8; padding: 3px; width: 25px; text-align: center;">#</th>
                  <th style="border: 1px solid #94a3b8; padding: 3px; text-align: left;">Item Description</th>
                  <th style="border: 1px solid #94a3b8; padding: 3px; width: 50px; text-align: center;">HSN</th>
                  <th style="border: 1px solid #94a3b8; padding: 3px; width: 55px; text-align: center;">Qty</th>
                  <th style="border: 1px solid #94a3b8; padding: 3px; width: 65px; text-align: right;">Rate</th>
                  <th style="border: 1px solid #94a3b8; padding: 3px; width: 75px; text-align: right;">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${(inv.items || [{ item_name: 'Men Cotton Vest', hsn_code: '6109', quantity: 1, unit: 'Pcs', unit_price: inv.grand_total || 110, total_amount: inv.grand_total || 110 }]).map((it, idx) => `
                  <tr>
                    <td style="border: 1px solid #94a3b8; padding: 3px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #94a3b8; padding: 3px;"><strong>${it.item_name}</strong></td>
                    <td style="border: 1px solid #94a3b8; padding: 3px; text-align: center;">${it.hsn_code || '6115'}</td>
                    <td style="border: 1px solid #94a3b8; padding: 3px; text-align: center;">${it.quantity} ${it.unit || 'Pcs'}</td>
                    <td style="border: 1px solid #94a3b8; padding: 3px; text-align: right;">₹${Number(it.unit_price).toFixed(2)}</td>
                    <td style="border: 1px solid #94a3b8; padding: 3px; text-align: right; font-weight: 700;">₹${Number(it.total_amount).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="display: flex; gap: 8px; justify-content: space-between; align-items: flex-start; margin-top: 2px;">
              <div style="flex: 1.2; font-size: 9px; color: #475569; border: 1px solid #e2e8f0; padding: 4px 6px; border-radius: 3px;">
                <strong>Terms:</strong> 1. Goods once sold will not be taken back without bill. 2. Subject to Delhi jurisdiction.
              </div>
              <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 3px; padding: 3px 6px; background: #f8fafc; font-size: 10px;">
                <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${Number(inv.subtotal || inv.grand_total || 0).toFixed(2)}</span></div>
                ${inv.document_type === 'GST_INVOICE' ? `<div style="display: flex; justify-content: space-between;"><span>GST:</span><span>₹${Number((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)).toFixed(2)}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: 800; border-top: 1px solid #0f172a; margin-top: 2px; padding-top: 2px; font-size: 12px;"><span>Grand Total:</span><span>₹${Number(inv.grand_total || 0).toFixed(2)}</span></div>
                <div style="display: flex; justify-content: space-between; color: #166534; font-weight: 700;"><span>Paid Amount:</span><span>₹${Number(inv.paid_amount || inv.grand_total || 0).toFixed(2)}</span></div>
                ${(inv.balance_amount || 0) > 0 ? `<div style="display: flex; justify-content: space-between; color: #991b1b; font-weight: 700;"><span>Balance (Udhar):</span><span>₹${Number(inv.balance_amount).toFixed(2)}</span></div>` : ''}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2px; font-size: 9.5px;">
              <div style="color: #64748b;">Computer Generated Invoice</div>
              <div style="text-align: right; font-weight: 700;">For ${stt.business_name || 'Jain Hosiery'}<br><br>Authorized Signatory</div>
            </div>
          </div>
        `;

        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill - ${inv.invoice_number}</title><style>@page { size: A4 portrait; margin: 6mm 8mm; } * { box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #fff; } .print-page { display: flex; flex-direction: column; height: 285mm; justify-content: space-between; } .divider { height: 11mm; display: flex; align-items: center; justify-content: center; position: relative; } .divider-line { width: 100%; border-top: 1.5px dashed #64748b; position: absolute; } .divider-text { background: #fff; padding: 0 10px; font-size: 9.5px; font-weight: 700; color: #475569; position: relative; z-index: 1; } @media print { body { margin: 0; } }</style></head><body><div class="print-page">${renderCopy('CUSTOMER COPY (ORIGINAL)')}<div class="divider"><div class="divider-line"></div><div class="divider-text">✂ - - - - - - - - - - CUT HERE - - - - - - - - - - ✂</div></div>${renderCopy('MERCHANT COPY (DUPLICATE / SHOP RECORD)')}</div></body></html>`;
      }
    },

    parties: {
      getAll: async (type) => {
        const list = getStorage('jh_mock_parties', defaultParties);
        return type ? list.filter(p => p.party_type === type) : list;
      },
      getById: async (id) => {
        const list = getStorage('jh_mock_parties', defaultParties);
        return list.find(p => p.id === id);
      },
      create: async (data) => {
        const list = getStorage('jh_mock_parties', defaultParties);
        const party = { ...data, id: Date.now() };
        list.push(party);
        setStorage('jh_mock_parties', list);
        return party;
      },
      update: async (id, data) => {
        const list = getStorage('jh_mock_parties', defaultParties);
        const idx = list.findIndex(p => p.id === id);
        if (idx !== -1) list[idx] = { ...list[idx], ...data };
        setStorage('jh_mock_parties', list);
        return list[idx];
      },
      recordPayment: async ({ partyId, amount, paymentMode }) => {
        const list = getStorage('jh_mock_parties', defaultParties);
        const party = list.find(p => p.id === partyId);
        if (party) {
          if (party.party_type === 'CUSTOMER') party.current_balance -= amount;
          else party.current_balance += amount;
          setStorage('jh_mock_parties', list);
        }

        if (paymentMode === 'CASH') {
          const reg = getStorage('jh_mock_register', defaultRegister);
          if (party?.party_type === 'CUSTOMER') {
            reg.customer_cash_collections += amount;
            reg.expected_closing_cash += amount;
          } else {
            reg.supplier_cash_payments += amount;
            reg.expected_closing_cash -= amount;
          }
          setStorage('jh_mock_register', reg);
        }
        return party;
      },
      getStatement: async (id) => {
        const list = getStorage('jh_mock_parties', defaultParties);
        const party = list.find(p => p.id === id);
        const invoices = getStorage('jh_mock_invoices', []).filter(i => i.party_id === id);
        return {
          party,
          history: invoices.map(i => ({
            date: i.invoice_date,
            type: 'SALE',
            ref_no: i.invoice_number,
            amount: i.grand_total,
            payment_mode: i.payment_mode
          }))
        };
      }
    },

    purchases: {
      create: async (data) => {
        const list = getStorage('jh_mock_purchases', []);
        const item = { ...data, id: Date.now() };
        list.push(item);
        setStorage('jh_mock_purchases', list);
        return { success: true, ...item };
      },
      getById: async () => null,
      getAll: async () => getStorage('jh_mock_purchases', [])
    },

    register: {
      getToday: async () => getStorage('jh_mock_register', defaultRegister),
      recordExpense: async (exp) => {
        const reg = getStorage('jh_mock_register', defaultRegister);
        if (exp.payment_mode === 'CASH') {
          reg.cash_expenses += exp.amount;
          reg.expected_closing_cash -= exp.amount;
        }
        setStorage('jh_mock_register', reg);

        const expList = getStorage('jh_mock_expenses', []);
        expList.unshift({ ...exp, id: Date.now() });
        setStorage('jh_mock_expenses', expList);

        return { success: true };
      },
      getExpenses: async () => getStorage('jh_mock_expenses', []),
      updateCashTakenHome: async (amt) => {
        const reg = getStorage('jh_mock_register', defaultRegister);
        reg.cash_taken_home = amt;
        reg.expected_closing_cash = reg.opening_cash + reg.cash_sales + reg.customer_cash_collections - reg.cash_expenses - reg.supplier_cash_payments - amt;
        setStorage('jh_mock_register', reg);
        return reg;
      },
      closeDay: async ({ actualCash, notes }) => {
        const reg = getStorage('jh_mock_register', defaultRegister);
        reg.actual_closing_cash = actualCash;
        reg.variance = actualCash - reg.expected_closing_cash;
        reg.is_closed = 1;
        reg.notes = notes;
        setStorage('jh_mock_register', reg);
        return reg;
      },
      getDashboardStats: async () => {
        const reg = getStorage('jh_mock_register', defaultRegister);
        const invoices = getStorage('jh_mock_invoices', []);
        const parties = getStorage('jh_mock_parties', defaultParties);

        const custDues = parties.filter(p => p.party_type === 'CUSTOMER').reduce((acc, p) => acc + (p.current_balance > 0 ? p.current_balance : 0), 0);
        const suppDues = parties.filter(p => p.party_type === 'SUPPLIER').reduce((acc, p) => acc + (p.current_balance < 0 ? Math.abs(p.current_balance) : 0), 0);

        return {
          todaySales: reg.cash_sales + reg.online_sales_total,
          todayBillCount: invoices.length,
          cashSales: reg.cash_sales,
          onlineSales: reg.online_sales_total,
          customerReceivables: custDues,
          supplierPayables: suppDues,
          register: reg,
          recentInvoices: invoices.slice(0, 8)
        };
      }
    },

    batch: {
      generate: async ({ targetTotal, billCount, startDate, endDate }) => {
        const count = billCount || 200;
        const total = targetTotal || 200000;
        const avg = total / count;
        const products = getStorage('jh_mock_products', defaultProducts);
        const invoices = [];

        for (let i = 0; i < count; i++) {
          const prod = products[i % products.length];
          const isLast = (i === count - 1);
          const amt = isLast 
            ? Math.round((total - invoices.reduce((acc, x) => acc + x.grand_total, 0)) * 100) / 100 
            : Math.round((avg * (0.85 + Math.random() * 0.3)) * 100) / 100;
          
          const taxable = Math.round((amt / 1.05) * 100) / 100;
          const tax = Math.round((amt - taxable) * 100) / 100;
          const cgst = Math.round((tax / 2) * 100) / 100;
          const sgst = tax - cgst;

          invoices.push({
            invoice_number: `JH/2026-27/B${(i + 1).toString().padStart(4, '0')}`,
            invoice_date: startDate || new Date().toISOString().split('T')[0],
            customer_name: `Retail Customer #${i + 1}`,
            items: [{ item_name: prod.name, quantity: 1, unit_price: amt, total_amount: amt }],
            taxable_amount: taxable,
            cgst_amount: cgst,
            sgst_amount: sgst,
            grand_total: amt,
            payment_mode: Math.random() > 0.5 ? 'ONLINE' : 'CASH'
          });
        }

        const actualSum = Math.round(invoices.reduce((acc, x) => acc + x.grand_total, 0) * 100) / 100;

        return {
          targetTotal: total,
          actualTotal: actualSum,
          billCount: count,
          invoices
        };
      },
      commit: async (batchData) => {
        const list = getStorage('jh_mock_invoices', []);
        const toAdd = (batchData.invoices || []).map((b, idx) => ({
          ...b,
          id: Date.now() + idx,
          document_type: 'BATCH_GST',
          status: 'COMPLETED',
          pdf_file_path: `Documents/JainHosiery/Bills/2026/10-October/${b.invoice_date}_${b.customer_name}_${b.invoice_number}.html`
        }));
        setStorage('jh_mock_invoices', [...toAdd, ...list]);

        return {
          success: true,
          savedCount: toAdd.length,
          folderPath: 'Documents/JainHosiery/Bills/'
        };
      }
    },

    settings: {
      get: async () => getStorage('jh_mock_settings', defaultSettings),
      update: async (stt) => {
        const cur = getStorage('jh_mock_settings', defaultSettings);
        const updated = { ...cur, ...stt };
        setStorage('jh_mock_settings', updated);
        return updated;
      }
    },

    files: {
      showInFolder: async (path) => {
        alert('File is stored at:\n' + path + '\n\nIn the Desktop App, this reveals the file directly in Windows File Explorer.');
        return { success: true, path };
      },
      openPath: async (path) => {
        alert('Opening folder:\n' + path + '\n\nIn the Desktop App, this opens Windows File Explorer.');
        return { success: true, path };
      },
      getBillsBaseDir: async () => 'Documents/JainHosiery/Bills'
    },

    print: {
      printBill: async (html) => {
        const printWin = window.open('', '_blank', 'width=800,height=900');
        if (printWin) {
          printWin.document.write(html);
          printWin.document.close();
          printWin.focus();
          setTimeout(() => {
            printWin.print();
          }, 300);
        }
        return { success: true };
      }
    }
  };
}
