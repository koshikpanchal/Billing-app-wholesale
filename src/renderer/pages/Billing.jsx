import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Printer, Check, Search, User, CreditCard, 
  IndianRupee, FileText, FolderOpen, AlertCircle, RefreshCw, X,
  Barcode, Edit3, PackagePlus
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Smart suggested code generator for manual products
 */
function generateSuggestedItemCode(name, existingProducts = []) {
  if (!name || !name.trim()) return `JH-${Date.now().toString().slice(-4)}`;
  const clean = name.trim();
  
  // Check if name has shorthand style like s-20-200 or JH-102
  const firstWord = clean.split(/\s+/)[0];
  if (/^[a-zA-Z]{1,3}[-_]\d+/i.test(firstWord)) {
    const candidate = firstWord.toUpperCase();
    if (!existingProducts.some(p => p.item_code?.toUpperCase() === candidate)) {
      return candidate;
    }
  }

  const letters = clean.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase() || 'JH';
  let counter = 101;
  while (existingProducts.some(p => p.item_code?.toUpperCase() === `${letters}-${counter}`)) {
    counter++;
  }
  return `${letters}-${counter}`;
}

/**
 * Wholesale Product & Pack Search Matcher
 * Parses shorthand like:
 *   "s-20-200" -> Category: Shirt, Size starts with: 20 (e.g. 20/22/24), Price: 200
 *   "s-26-200" -> Matches both 26/28/30 and 26/30 packs @ 200
 */
function searchWholesaleProducts(query, products) {
  if (!query || !query.trim()) return [];
  const clean = query.trim().toLowerCase();

  // 1. Direct code match (e.g. S-20-200 or S-26)
  const codeMatches = products.filter(p => p.item_code && p.item_code.toLowerCase().includes(clean));

  // 2. Shorthand matching (e.g. "s-20-200", "s 20 200", "s-26-200", "s 26")
  const parts = clean.split(/[\s\-_/]+/).filter(Boolean);
  let shorthandMatches = [];
  if (parts.length >= 2) {
    const typeCode = parts[0];
    const sizeCode = parts[1];
    const priceCode = parts[2] ? parseFloat(parts[2]) : null;

    shorthandMatches = products.filter(p => {
      const pCode = (p.item_code || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();

      // Type check
      const typeMatch = pCode.startsWith(typeCode) || 
                        (typeCode === 's' && (pName.includes('shirt') || pCode.startsWith('s-'))) ||
                        (typeCode === 'v' && pName.includes('vest')) ||
                        (typeCode === 'b' && (pName.includes('brief') || pName.includes('baba'))) ||
                        (typeCode === 'p' && (pName.includes('pant') || pName.includes('pajama'))) ||
                        (typeCode === 't' && (pName.includes('t-shirt') || pName.includes('thermal'))) ||
                        (typeCode === 'l' && pName.includes('legging'));

      if (!typeMatch) return false;

      // Size check: matches starting size or size string (e.g. "20" matches 20/22/24; "26" matches 26/28/30 and 26/30)
      const sizeMatch = pCode.includes(sizeCode) || pName.includes(sizeCode) || pDesc.includes(sizeCode);
      if (!sizeMatch) return false;

      // Price check (if price part is provided)
      if (priceCode !== null && !isNaN(priceCode)) {
        if (Math.abs(p.selling_price - priceCode) > 0.01) return false;
      }

      return true;
    });
  }

  // 3. Name & Description matching
  const nameMatches = products.filter(p => 
    p.name.toLowerCase().includes(clean) || 
    (p.description && p.description.toLowerCase().includes(clean))
  );

  // Combine unique items preserving order
  const combined = [];
  const seenIds = new Set();
  for (const item of [...codeMatches, ...shorthandMatches, ...nameMatches]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      combined.push(item);
    }
  }
  return combined;
}

export default function Billing({ onBillSaved }) {
  const { t } = useApp();

  // Document Type: 'CASH_MEMO' or 'GST_INVOICE'
  const [docType, setDocType] = useState('CASH_MEMO');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // GST Invoice Specific
  const [gstBillRate, setGstBillRate] = useState(5.0); // 5%, 12%, 18%, 0%

  // Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerState, setCustomerState] = useState('Delhi');
  const [customerStateCode, setCustomerStateCode] = useState('07');
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [activeParty, setActiveParty] = useState(null);

  // Customer Autocomplete Suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [highlightedCustIdx, setHighlightedCustIdx] = useState(0);

  // Available Master Data
  const [productList, setProductList] = useState([]);
  const [partyList, setPartyList] = useState([]);
  const [settings, setSettings] = useState(null);

  // Item Entry Mode: 'code' (By Product Code / Search) vs 'manual' (Manual Item Entry)
  const [entryMode, setEntryMode] = useState('code');

  // Method 1: Product Code / Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState('');
  const [itemDiscount, setItemDiscount] = useState(0);

  // Method 2: Manual Item Process State
  const [manualItemName, setManualItemName] = useState('');
  const [manualUnit, setManualUnit] = useState('Set');
  const [manualQty, setManualQty] = useState(1);
  const [manualPrice, setManualPrice] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0);

  // Prompt / Modal State for Adding Manual Product to Master
  const [showManualPromptModal, setShowManualPromptModal] = useState(false);
  const [pendingManualItem, setPendingManualItem] = useState(null);
  const [manualSavedNotice, setManualSavedNotice] = useState(null);

  // Product Autocomplete & Clash Dropdown
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [highlightedProdIdx, setHighlightedProdIdx] = useState(0);

  // Bill Line Items
  const [items, setItems] = useState([]);

  // Payment State: Strictly CASH or ONLINE
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');

  // UI state
  const [savedBillResult, setSavedBillResult] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const customerInputRef = useRef(null);
  const manualNameRef = useRef(null);
  const manualQtyRef = useRef(null);
  const manualPriceRef = useRef(null);
  const codePromptInputRef = useRef(null);

  // Load Initial Data
  const loadInitial = async () => {
    try {
      if (window.api) {
        const [prods, parties, stt, nextNum] = await Promise.all([
          window.api.products.getAll(),
          window.api.parties.getAll('CUSTOMER'),
          window.api.settings.get(),
          window.api.invoices.getNextNumber(docType),
        ]);

        setProductList(prods || []);
        setPartyList(parties || []);
        setSettings(stt || {});
        setInvoiceNumber(nextNum);
      }
    } catch (err) {
      console.error('Failed to load billing initial data:', err);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [docType]);

  // Switch Document Type (Cash Memo vs GST Invoice)
  const handleToggleDocType = async (type) => {
    setDocType(type);
    if (window.api) {
      const nextNum = await window.api.invoices.getNextNumber(type);
      setInvoiceNumber(nextNum);
    }
  };

  // --- Customer Search & Auto Pop-Up Handlers ---
  const handleCustomerNameChange = (val) => {
    setCustomerName(val);
    if (!val.trim() || val === 'Walk-in Customer') {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      setSelectedPartyId(null);
      setActiveParty(null);
      return;
    }

    const clean = val.toLowerCase();
    const matches = partyList.filter(p => 
      p.name.toLowerCase().includes(clean) || 
      (p.phone && p.phone.includes(clean))
    );
    setCustomerSuggestions(matches);
    setShowCustomerDropdown(matches.length > 0);
    setHighlightedCustIdx(0);

    // Exact name match
    const exact = partyList.find(p => p.name.toLowerCase() === clean);
    if (exact) {
      applyCustomer(exact);
    }
  };

  const applyCustomer = (party) => {
    setCustomerName(party.name);
    setCustomerPhone(party.phone || '');
    setCustomerGstin(party.gstin || '');
    setCustomerAddress(party.address || '');
    setCustomerState(party.state || 'Delhi');
    setCustomerStateCode(party.state_code || '07');
    setSelectedPartyId(party.id);
    setActiveParty(party);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerGstin('');
    setCustomerAddress('');
    setSelectedPartyId(null);
    setActiveParty(null);
    setShowCustomerDropdown(false);
  };

  const handleCustomerPhoneChange = (val) => {
    setCustomerPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 6) {
      const matched = partyList.find(p => p.phone && p.phone.replace(/\D/g, '').includes(clean));
      if (matched && matched.id !== selectedPartyId) {
        applyCustomer(matched);
      }
    }
  };

  // --- Product Search & Wholesale Shorthand Handlers ---
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setSelectedProduct(null);

    if (!val.trim()) {
      setProductSuggestions([]);
      setShowProductDropdown(false);
      return;
    }

    const matches = searchWholesaleProducts(val, productList);
    setProductSuggestions(matches);
    setShowProductDropdown(matches.length > 0);
    setHighlightedProdIdx(0);

    // If single exact match on code
    const exactCode = productList.find(p => p.item_code.toLowerCase() === val.trim().toLowerCase());
    if (exactCode) {
      selectProductItem(exactCode);
    }
  };

  const selectProductItem = (prod) => {
    setSelectedProduct(prod);
    setSearchQuery(`${prod.name} [${prod.item_code}]`);
    setItemPrice(prod.selling_price);
    setItemQty(1);
    setShowProductDropdown(false);
    setProductSuggestions([]);

    if (qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  };

  // Handle Keyboard Navigation for Product Search Dropdown
  const handleProductKeyDown = (e) => {
    if (showProductDropdown && productSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedProdIdx(prev => (prev + 1) % productSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedProdIdx(prev => (prev - 1 + productSuggestions.length) % productSuggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = productSuggestions[highlightedProdIdx];
        if (chosen) {
          selectProductItem(chosen);
        } else {
          handleAddItem();
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowProductDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  // Helper: Commit a line item to the bill
  const commitLineItem = ({ productId, name, unitPrice, qty, discAmt, unit, hsn }) => {
    const appliedGst = docType === 'GST_INVOICE' ? (parseFloat(gstBillRate) || 5.0) : 0.0;
    const rawTotal = unitPrice * qty;
    const taxable = Math.max(0, rawTotal - discAmt);
    const isInterState = docType === 'GST_INVOICE' && customerState.toLowerCase() !== (settings?.state || 'delhi').toLowerCase();
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (docType === 'GST_INVOICE' && appliedGst > 0) {
      const taxAmt = (taxable * appliedGst) / 100;
      if (isInterState) {
        igst = Math.round(taxAmt * 100) / 100;
      } else {
        cgst = Math.round((taxAmt / 2) * 100) / 100;
        sgst = Math.round((taxAmt - cgst) * 100) / 100;
      }
    }

    const lineTotal = taxable + cgst + sgst + igst;

    const newItem = {
      product_id: productId || null,
      item_name: name,
      hsn_code: hsn || '6115',
      unit: unit || 'Set',
      quantity: qty,
      unit_price: unitPrice,
      discount_amount: discAmt,
      discount_percent: rawTotal > 0 ? (discAmt / rawTotal) * 100 : 0,
      taxable_value: taxable,
      gst_rate: appliedGst,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: lineTotal,
    };

    setItems(prev => [...prev, newItem]);
  };

  // Add Item to Bill (Method 1: From Product Code / Search)
  const handleAddItem = () => {
    if (!selectedProduct && !searchQuery.trim()) {
      alert('Please enter product code or item name');
      return;
    }

    // 1. If catalog product is chosen
    if (selectedProduct) {
      const prodName = selectedProduct.name;
      const unitPrice = parseFloat(itemPrice) || selectedProduct.selling_price || 0;
      const qty = parseFloat(itemQty) || 1;
      const discAmt = docType === 'GST_INVOICE' ? (parseFloat(itemDiscount) || 0) : 0;
      
      commitLineItem({
        productId: selectedProduct.id,
        name: prodName,
        unitPrice,
        qty,
        discAmt,
        unit: selectedProduct.unit || 'Set',
        hsn: selectedProduct.hsn_code || '6115',
      });

      setSelectedProduct(null);
      setSearchQuery('');
      setItemQty(1);
      setItemPrice('');
      setItemDiscount(0);
      setShowProductDropdown(false);
      if (searchInputRef.current) searchInputRef.current.focus();
      return;
    }

    // 2. If user typed a manual item in search bar without selecting an existing product
    const cleanName = searchQuery.trim();
    const unitPrice = parseFloat(itemPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert('Please enter a valid selling price for this manual item');
      return;
    }

    const qty = parseFloat(itemQty) || 1;
    const discAmt = docType === 'GST_INVOICE' ? (parseFloat(itemDiscount) || 0) : 0;
    const suggestedCode = generateSuggestedItemCode(cleanName, productList);

    setPendingManualItem({
      name: cleanName,
      price: unitPrice,
      unit: 'Set',
      qty: qty,
      discAmt: discAmt,
      item_code: suggestedCode,
      fromMode: 'code',
    });
    setShowManualPromptModal(true);
  };

  // Add Item to Bill (Method 2: Manual Item Entry Process)
  const handleAddManualItem = () => {
    if (!manualItemName.trim()) {
      alert('Please enter item name');
      manualNameRef.current?.focus();
      return;
    }
    const price = parseFloat(manualPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid selling price');
      manualPriceRef.current?.focus();
      return;
    }

    const cleanName = manualItemName.trim();
    const discAmt = docType === 'GST_INVOICE' ? (parseFloat(manualDiscount) || 0) : 0;
    const qty = parseFloat(manualQty) || 1;
    const suggestedCode = generateSuggestedItemCode(cleanName, productList);

    setPendingManualItem({
      name: cleanName,
      price: price,
      unit: manualUnit || 'Set',
      qty: qty,
      discAmt: discAmt,
      item_code: suggestedCode,
      fromMode: 'manual',
    });
    setShowManualPromptModal(true);
  };

  // Handle User Response to Prompt: "Add this product directly into Products & Stock?"
  const handleConfirmManualAdd = async (saveToMaster) => {
    if (!pendingManualItem) return;
    const p = pendingManualItem;
    let finalProductId = null;

    if (saveToMaster) {
      try {
        const code = p.item_code?.trim() || generateSuggestedItemCode(p.name, productList);
        const created = await window.api.products.create({
          name: p.name,
          item_code: code,
          selling_price: p.price,
          cost_price: 0,
          unit: p.unit || 'Set',
          hsn_code: '6115',
          gst_rate: docType === 'GST_INVOICE' ? (parseFloat(gstBillRate) || 5.0) : 5.0,
          is_stock_tracked: 0,
          current_stock: 0,
          min_stock_alert: 0,
        });

        if (created && created.id) {
          finalProductId = created.id;
          setProductList(prev => [...prev, created]);
          setManualSavedNotice(`✓ "${created.name}" [${created.item_code}] saved to Products & Stock!`);
          setTimeout(() => setManualSavedNotice(null), 4000);
        }
      } catch (err) {
        console.error('Failed to save manual product to master:', err);
        alert('Could not save to Products catalog: ' + err.message);
      }
    }

    commitLineItem({
      productId: finalProductId,
      name: p.name,
      unitPrice: p.price,
      qty: p.qty,
      discAmt: p.discAmt,
      unit: p.unit,
      hsn: '6115',
    });

    // Reset fields in whichever mode added it
    if (p.fromMode === 'code') {
      setSelectedProduct(null);
      setSearchQuery('');
      setItemQty(1);
      setItemPrice('');
      setItemDiscount(0);
      setShowProductDropdown(false);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setManualItemName('');
      setManualQty(1);
      setManualPrice('');
      setManualDiscount(0);
      setTimeout(() => manualNameRef.current?.focus(), 50);
    }

    setPendingManualItem(null);
    setShowManualPromptModal(false);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Bill Totals Calculations
  const subtotal = items.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
  const totalDiscount = items.reduce((acc, it) => acc + it.discount_amount, 0);
  const taxableAmount = items.reduce((acc, it) => acc + it.taxable_value, 0);
  const cgstAmount = items.reduce((acc, it) => acc + it.cgst_amount, 0);
  const sgstAmount = items.reduce((acc, it) => acc + it.sgst_amount, 0);
  const igstAmount = items.reduce((acc, it) => acc + it.igst_amount, 0);

  const rawGrandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;

  const currentPaid = paidAmount === '' ? roundedGrandTotal : (parseFloat(paidAmount) || 0);
  const balanceDue = Math.max(0, roundedGrandTotal - currentPaid);

  // Save Invoice
  const handleSaveInvoice = async (triggerPrint = false) => {
    if (items.length === 0) {
      alert('Please add at least one item to the bill.');
      return;
    }

    if (balanceDue > 0 && !selectedPartyId && customerName === 'Walk-in Customer') {
      alert('Please select or specify a Customer name before saving an unpaid/credit (Udhar) bill.');
      return;
    }

    setIsSaving(true);
    try {
      const isInterState = docType === 'GST_INVOICE' && customerState.toLowerCase() !== (settings?.state || 'delhi').toLowerCase();

      const invoicePayload = {
        document_type: docType,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        party_id: selectedPartyId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_gstin: customerGstin,
        customer_address: customerAddress,
        customer_state: customerState,
        customer_state_code: customerStateCode,
        place_of_supply: `${customerState} (${customerStateCode})`,
        is_inter_state: isInterState ? 1 : 0,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: Math.round(totalDiscount * 100) / 100,
        taxable_amount: Math.round(taxableAmount * 100) / 100,
        cgst_amount: Math.round(cgstAmount * 100) / 100,
        sgst_amount: Math.round(sgstAmount * 100) / 100,
        igst_amount: Math.round(igstAmount * 100) / 100,
        round_off: roundOff,
        grand_total: roundedGrandTotal,
        paid_amount: currentPaid,
        balance_amount: balanceDue,
        payment_mode: paymentMode, // Strictly CASH or ONLINE
        items: items,
      };

      const saved = await window.api.invoices.create(invoicePayload);
      setSavedBillResult(saved);

      // Load dual-copy printable HTML
      const html = await window.api.invoices.getPrintHtml(saved.id);
      setPreviewHtml(html);
      setShowPreviewModal(true);

      if (triggerPrint) {
        window.api.print.printBill(html);
      }

      if (onBillSaved) onBillSaved(saved);
    } catch (err) {
      alert('Error saving bill: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = async () => {
    setItems([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerGstin('');
    setCustomerAddress('');
    setSelectedPartyId(null);
    setActiveParty(null);
    setPaidAmount('');
    setSavedBillResult(null);
    setShowPreviewModal(false);
    setSearchQuery('');
    setSelectedProduct(null);
    setItemQty(1);
    setItemPrice('');
    setItemDiscount(0);
    setManualItemName('');
    setManualUnit('Set');
    setManualQty(1);
    setManualPrice('');
    setManualDiscount(0);
    setPendingManualItem(null);
    setShowManualPromptModal(false);

    if (window.api) {
      const nextNum = await window.api.invoices.getNextNumber(docType);
      setInvoiceNumber(nextNum);
    }
  };

  const handleRevealInExplorer = async () => {
    if (savedBillResult?.pdf_file_path && window.api?.files) {
      await window.api.files.showInFolder(savedBillResult.pdf_file_path);
    }
  };

  const handlePrintCurrent = () => {
    if (previewHtml && window.api?.print) {
      window.api.print.printBill(previewHtml);
    }
  };

  // Keyboard shortcut listener for F2 (New), F4 (Toggle GST)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        handleToggleDocType(docType === 'CASH_MEMO' ? 'GST_INVOICE' : 'CASH_MEMO');
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleResetForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docType]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Document Header */}
      <div className="card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Document Type Toggle Tabs */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="tab-group" style={{ display: 'flex', background: 'var(--bg-main)', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${docType === 'CASH_MEMO' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 700 }}
                onClick={() => handleToggleDocType('CASH_MEMO')}
              >
                {t('cashMemoTab')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${docType === 'GST_INVOICE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 700 }}
                onClick={() => handleToggleDocType('GST_INVOICE')}
              >
                {t('gstInvoiceTab')} <span className="kbd" style={{ marginLeft: 4 }}>F4</span>
              </button>
            </div>
          </div>

          {/* Invoice Number & Date */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('billNo')}: </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text-main)' }}>
                {invoiceNumber || (docType === 'GST_INVOICE' ? 'JH/2026-27/0001' : 'CM/2026-27/0001')}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('date')}:</span>
              <input 
                type="date" 
                className="input input-mono" 
                style={{ padding: '4px 8px', fontSize: 13 }}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: 16 }}>
        {/* Left Column: Customer details + Item Entry + Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer Card */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={15} /> {t('customerDetails')}
              </span>
              {docType === 'GST_INVOICE' && (
                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>
                  GST Tax Invoice Mode
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: docType === 'GST_INVOICE' ? 'repeat(auto-fit, minmax(170px, 1fr))' : '1.4fr 1fr', gap: 10, alignItems: 'flex-start' }}>
              {/* Customer Name with Autocomplete */}
              <div className="form-group autocomplete-wrapper">
                <label className="form-label">{t('customerName')}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    ref={customerInputRef}
                    type="text" 
                    className="input" 
                    placeholder="Type name (e.g. Sharma Cloth House)"
                    value={customerName}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    onFocus={() => {
                      if (customerSuggestions.length > 0) setShowCustomerDropdown(true);
                    }}
                  />
                  {selectedPartyId && (
                    <button 
                      type="button"
                      onClick={handleClearCustomer}
                      style={{ position: 'absolute', right: 8, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                      title="Clear Customer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Customer Autocomplete Dropdown */}
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <ul className="autocomplete-dropdown">
                    {customerSuggestions.map((party, idx) => (
                      <li 
                        key={party.id}
                        className={`autocomplete-item ${idx === highlightedCustIdx ? 'active' : ''}`}
                        onClick={() => applyCustomer(party)}
                      >
                        <div className="autocomplete-item-left">
                          <div>
                            <div className="autocomplete-name">{party.name}</div>
                            <div className="autocomplete-desc">
                              {party.phone ? `Ph: ${party.phone}` : 'No phone'} {party.address ? `• ${party.address}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 11, color: party.current_balance > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
                            {party.current_balance > 0 ? `Udhar: ₹${party.current_balance}` : 'No Due'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Mobile Number with Auto Pop-Up */}
              <div className="form-group">
                <label className="form-label">{t('mobileNumber')}</label>
                <input 
                  type="text" 
                  className="input input-mono" 
                  placeholder="10-digit mobile"
                  value={customerPhone}
                  onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                />
              </div>

              {/* GST Invoice Specific Fields */}
              {docType === 'GST_INVOICE' && (
                <>
                  <div className="form-group">
                    <label className="form-label">GST Tax Rate</label>
                    <select 
                      className="select"
                      value={gstBillRate}
                      onChange={(e) => setGstBillRate(parseFloat(e.target.value))}
                    >
                      <option value={5.0}>5% GST (2.5% CGST + 2.5% SGST)</option>
                      <option value={12.0}>12% GST (6.0% CGST + 6.0% SGST)</option>
                      <option value={18.0}>18% GST (9.0% CGST + 9.0% SGST)</option>
                      <option value={0.0}>0% GST (Exempt)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('customerGstin')}</label>
                    <input 
                      type="text" 
                      className="input input-mono" 
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('placeOfSupply')}</label>
                    <select 
                      className="select"
                      value={customerState}
                      onChange={(e) => {
                        setCustomerState(e.target.value);
                        setCustomerStateCode(e.target.value === 'Delhi' ? '07' : '09');
                      }}
                    >
                      <option value="Delhi">Delhi (07 - Intra-state CGST+SGST)</option>
                      <option value="Uttar Pradesh">Uttar Pradesh (09 - Inter-state IGST)</option>
                      <option value="Haryana">Haryana (06 - Inter-state IGST)</option>
                      <option value="Punjab">Punjab (03 - Inter-state IGST)</option>
                      <option value="Rajasthan">Rajasthan (08 - Inter-state IGST)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Active Customer Status Chip */}
            {activeParty && (
              <div className="customer-chip-badge">
                <Check size={13} color="var(--primary)" />
                <span>Registered Party: <strong>{activeParty.name}</strong></span>
                {activeParty.phone && <span>• Ph: {activeParty.phone}</span>}
                {activeParty.current_balance > 0 ? (
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>• Pending Credit (Udhar): ₹{activeParty.current_balance}</span>
                ) : (
                  <span style={{ color: 'var(--success)' }}>• Clean Account</span>
                )}
              </div>
            )}
          </div>

          {/* Item Fast-Entry Box (Dual Method: Product Code vs Manual Entry) */}
          <div className="card" style={{ padding: 16 }}>
            {/* Mode Switcher Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'inline-flex', background: 'var(--bg-main, #0f172a)', padding: 3, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${entryMode === 'code' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, borderRadius: 6 }}
                  onClick={() => {
                    setEntryMode('code');
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                >
                  <Barcode size={15} /> {t('byProductCode')}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${entryMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, borderRadius: 6 }}
                  onClick={() => {
                    setEntryMode('manual');
                    setTimeout(() => manualNameRef.current?.focus(), 50);
                  }}
                >
                  <Edit3 size={15} /> {t('manualItemEntry')}
                </button>
              </div>

              <span style={{ fontSize: 11.5, color: entryMode === 'code' ? 'var(--primary)' : '#38bdf8', fontWeight: 600 }}>
                {entryMode === 'code' ? (
                  <>Wholesale codes: <code>s-20-200</code>, <code>s-26-200</code>, <code>JH-101</code></>
                ) : (
                  <>{t('manualEntrySub')}</>
                )}
              </span>
            </div>

            {/* Notification when manual product was saved into Products & Stock */}
            {manualSavedNotice && (
              <div style={{
                marginBottom: 10,
                padding: '7px 12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                borderRadius: 6,
                color: '#34d399',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Check size={14} /> {manualSavedNotice}
              </div>
            )}

            {/* METHOD 1: By Product Code / Search */}
            {entryMode === 'code' ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: docType === 'GST_INVOICE' ? '2.2fr 80px 105px 85px 95px' : '2.4fr 85px 110px 95px', 
                gap: 10, 
                alignItems: 'flex-end' 
              }}>
                {/* Product Autocomplete Search Input */}
                <div className="form-group autocomplete-wrapper">
                  <label className="form-label">{t('searchProductPlaceholder')}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      className="input"
                      placeholder="Type code like s-20-200 or product name..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={handleProductKeyDown}
                      onFocus={() => {
                        if (productSuggestions.length > 0) setShowProductDropdown(true);
                      }}
                    />
                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setSearchQuery('');
                          setItemPrice('');
                          setShowProductDropdown(false);
                        }}
                        style={{ position: 'absolute', right: 8, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                        title="Clear"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Wholesale Clash Autocomplete Dropdown List */}
                  {showProductDropdown && productSuggestions.length > 0 && (
                    <ul className="autocomplete-dropdown">
                      {productSuggestions.map((prod, idx) => (
                        <li 
                          key={prod.id}
                          className={`autocomplete-item ${idx === highlightedProdIdx ? 'active' : ''}`}
                          onClick={() => selectProductItem(prod)}
                        >
                          <div className="autocomplete-item-left">
                            <span className="autocomplete-code-badge">{prod.item_code}</span>
                            <div>
                              <div className="autocomplete-name">{prod.name}</div>
                              {prod.description && <div className="autocomplete-desc">{prod.description}</div>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="autocomplete-price">₹{prod.selling_price.toFixed(2)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{prod.unit || 'Set'}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">{t('qty')}</label>
                  <input 
                    ref={qtyInputRef}
                    type="number" 
                    className="input input-mono"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                  />
                </div>

                {/* Price */}
                <div className="form-group">
                  <label className="form-label">{t('price')} (₹)</label>
                  <input 
                    type="number" 
                    className="input input-mono" 
                    placeholder="Price"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                  />
                </div>

                {/* Discount Field (GST Invoice mode only) */}
                {docType === 'GST_INVOICE' && (
                  <div className="form-group">
                    <label className="form-label">{t('disc')} (₹)</label>
                    <input 
                      type="number" 
                      className="input input-mono" 
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                    />
                  </div>
                )}

                {/* Add Button */}
                <button className="btn btn-primary" onClick={handleAddItem} style={{ height: 40, fontWeight: 700 }}>
                  <Plus size={16} /> {t('addBtn')}
                </button>
              </div>
            ) : (
              /* METHOD 2: Manual Item Entry Process (For unentered shop stock) */
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: docType === 'GST_INVOICE' ? '2fr 85px 75px 105px 85px 95px' : '2.3fr 90px 80px 110px 95px', 
                gap: 10, 
                alignItems: 'flex-end' 
              }}>
                {/* Manual Item Name */}
                <div className="form-group">
                  <label className="form-label">{t('itemName')}</label>
                  <input 
                    ref={manualNameRef}
                    type="text" 
                    className="input"
                    placeholder={t('manualItemNamePlaceholder')}
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualItem(); }}
                  />
                </div>

                {/* Unit Selector */}
                <div className="form-group">
                  <label className="form-label">{t('unit')}</label>
                  <select 
                    className="select"
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                  >
                    <option value="Set">Set</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Box">Box</option>
                    <option value="Mtr">Mtr</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">{t('qty')}</label>
                  <input 
                    ref={manualQtyRef}
                    type="number" 
                    className="input input-mono"
                    min="1"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualItem(); }}
                  />
                </div>

                {/* Price */}
                <div className="form-group">
                  <label className="form-label">{t('price')} (₹)</label>
                  <input 
                    ref={manualPriceRef}
                    type="number" 
                    className="input input-mono" 
                    placeholder="Rate"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualItem(); }}
                  />
                </div>

                {/* Discount Field (GST Invoice mode only) */}
                {docType === 'GST_INVOICE' && (
                  <div className="form-group">
                    <label className="form-label">{t('disc')} (₹)</label>
                    <input 
                      type="number" 
                      className="input input-mono" 
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualItem(); }}
                    />
                  </div>
                )}

                {/* Add Button */}
                <button className="btn btn-primary" onClick={handleAddManualItem} style={{ height: 40, fontWeight: 700 }}>
                  <Plus size={16} /> {t('addBtn')}
                </button>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30, textAlign: 'center' }}>#</th>
                  <th>Item Description</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 95, textAlign: 'right' }}>Rate</th>
                  {/* Disc column only visible in GST mode */}
                  {docType === 'GST_INVOICE' && (
                    <th style={{ width: 65, textAlign: 'right' }}>Disc</th>
                  )}
                  {docType === 'GST_INVOICE' && (
                    <th style={{ width: 55, textAlign: 'center' }}>GST</th>
                  )}
                  <th style={{ width: 95, textAlign: 'right' }}>Total</th>
                  <th style={{ width: 40, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={docType === 'GST_INVOICE' ? 8 : 6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}>
                      No items added yet. Type wholesale code (e.g. <code>s-20-200</code>) above to add items.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-dim)', textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>{it.item_name}</strong>
                        {!it.product_id && (
                          <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontWeight: 600 }}>
                            Manual
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {it.quantity} {it.unit}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        ₹{it.unit_price.toFixed(2)}
                      </td>
                      {docType === 'GST_INVOICE' && (
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                          {it.discount_amount > 0 ? `₹${it.discount_amount}` : '-'}
                        </td>
                      )}
                      {docType === 'GST_INVOICE' && (
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>
                          {it.gst_rate}%
                        </td>
                      )}
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{it.total_amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '4px 6px' }}
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Payment, Summary & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              Payment & Bill Summary
            </h3>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>{t('subtotal')} ({items.length} items):</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Total Discount ONLY in GST mode */}
              {docType === 'GST_INVOICE' && totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                  <span>{t('totalDiscount')}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}

              {/* GST Breakdown ONLY in GST mode */}
              {docType === 'GST_INVOICE' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>{t('taxableAmount')}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>₹{taxableAmount.toFixed(2)}</span>
                  </div>
                  {cgstAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                      <span>CGST:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>+₹{cgstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {sgstAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                      <span>SGST:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>+₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {igstAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                      <span>IGST:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>+₹{igstAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: 12 }}>
                  <span>{t('roundOff')}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                </div>
              )}

              {/* Grand Total Display */}
              <div style={{ 
                borderTop: '2px solid var(--border-color)', 
                paddingTop: 12, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'baseline' 
              }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{t('grandTotal')}:</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{roundedGrandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector: Strictly CASH or ONLINE */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                {t('paymentMethod')}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`btn ${paymentMode === 'CASH' ? 'btn-success' : 'btn-secondary'}`}
                  style={{ height: 44, fontWeight: 700 }}
                  onClick={() => setPaymentMode('CASH')}
                >
                  <IndianRupee size={17} /> {t('cash')}
                </button>

                <button
                  type="button"
                  className={`btn ${paymentMode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ height: 44, fontWeight: 700 }}
                  onClick={() => setPaymentMode('ONLINE')}
                >
                  <CreditCard size={17} /> {t('online')}
                </button>
              </div>

              {/* Paid Amount & Credit Split */}
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">{t('amountPaidNow')}</label>
                <input 
                  type="number" 
                  className="input input-mono" 
                  placeholder={`Full Amount: ₹${roundedGrandTotal}`}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              {balanceDue > 0 && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  borderRadius: 8, 
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10
                }}>
                  <span style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 700 }}>
                    Credit Due (Udhar Khata):
                  </span>
                  <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>
                    ₹{balanceDue.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ height: 46, fontSize: 15, fontWeight: 800 }}
                  onClick={() => handleSaveInvoice(true)}
                  disabled={isSaving}
                >
                  <Printer size={18} /> {isSaving ? 'Processing...' : t('savePrintBill')}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleSaveInvoice(false)}
                    disabled={isSaving}
                  >
                    <Check size={15} /> {t('saveOnly')}
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    onClick={handleResetForm}
                  >
                    <RefreshCw size={15} /> {t('reset')}
                  </button>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 4 }}>
                  Dual Copy A4 auto-saves to: <code>Documents/JainHosiery/Bills/Year/Month/</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Copy Print Preview & Success Modal */}
      {showPreviewModal && savedBillResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 840, maxHeight: '92vh' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={18} color="var(--success)" />
                <span className="modal-title">
                  {t('billSavedSuccess')} ({savedBillResult.invoice_number}) — 2 Copies (Customer + Merchant)
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPreviewModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: 16, background: '#1e293b' }}>
              <div style={{
                background: '#fff',
                color: '#000',
                borderRadius: 8,
                padding: 12,
                maxHeight: 500,
                overflowY: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              />

              {savedBillResult.pdf_file_path && (
                <div style={{ 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  border: '1px solid #334155', 
                  borderRadius: 8, 
                  padding: '10px 14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: '#94a3b8',
                  marginTop: 10
                }}>
                  <div>
                    {t('savedTo')}: <code style={{ color: '#38bdf8' }}>{savedBillResult.pdf_file_path}</code>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleRevealInExplorer}>
                    <FolderOpen size={14} /> {t('revealInExplorer')}
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handlePrintCurrent}>
                <Printer size={16} /> {t('printAgain')}
              </button>
              <button className="btn btn-success" onClick={handleResetForm}>
                {t('newBillKey')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Prompt: Ask user if they want to save manual product directly into Products & Stock */}
      {showManualPromptModal && pendingManualItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 490 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PackagePlus size={18} color="var(--primary)" />
                <span className="modal-title">
                  {t('saveToCatalogTitle')}
                </span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleConfirmManualAdd(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                You entered a manual product: <strong style={{ color: '#fff' }}>"{pendingManualItem.name}"</strong> at <strong style={{ color: '#38bdf8' }}>₹{pendingManualItem.price.toFixed(2)}</strong>.
                <br /><br />
                Do you want to add this product directly into <strong>Products & Stock</strong> master so you can search and bill it by code next time?
              </p>

              <div style={{ 
                background: 'var(--bg-main, #0f172a)', 
                padding: 12, 
                borderRadius: 8, 
                border: '1px solid var(--border-color)', 
                display: 'grid', 
                gridTemplateColumns: '1.3fr 1fr', 
                gap: 10 
              }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Item Code</label>
                  <input 
                    ref={codePromptInputRef}
                    type="text" 
                    className="input input-mono" 
                    value={pendingManualItem.item_code}
                    onChange={(e) => setPendingManualItem(prev => ({ ...prev, item_code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. S-20-200 or JH-105"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmManualAdd(true);
                      if (e.key === 'Escape') handleConfirmManualAdd(false);
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Unit</label>
                  <select 
                    className="select"
                    value={pendingManualItem.unit}
                    onChange={(e) => setPendingManualItem(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    <option value="Set">Set</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Box">Box</option>
                    <option value="Mtr">Mtr</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleConfirmManualAdd(false)}
              >
                {t('noJustBill')}
              </button>

              <button 
                type="button" 
                className="btn btn-success" 
                style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => handleConfirmManualAdd(true)}
                autoFocus
              >
                <Check size={16} /> {t('yesSaveProduct')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
