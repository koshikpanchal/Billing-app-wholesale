/**
 * Smart Batch GST Invoice Allocation Engine
 * Solves the exact turnover allocation problem with realistic product selections and price variations.
 */

const SAMPLE_CUSTOMER_NAMES = [
  'Walk-in Retail Customer', 'Mehta Brothers', 'Agarwal General Store',
  'Shri Ram Hosiery', 'Gupta Garments', 'Kisan Handloom',
  'Singhal Traders', 'Bansal Textiles', 'Jai Ambe Readymade',
  'Modern Hosiery Mart', 'Royal Collection', 'Goyal Undergarments',
  'Pooja Cloth Store', 'Maheshwari & Sons', 'Pawan Putra Garments',
  'Aggarwal Uniforms', 'Shyam Fancy Store', 'Navkar Readymade',
  'Vardhman Retailers', 'Arihant Hosiery Store'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate dates distributed evenly across a range with realistic business hours
 */
function generateDates(startDateStr, endDateStr, count) {
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  const step = (end - start) / Math.max(count - 1, 1);
  const dates = [];

  for (let i = 0; i < count; i++) {
    // Add small random jitter within the step
    const jitter = (Math.random() - 0.5) * step * 0.4;
    const time = Math.min(Math.max(start + (i * step) + jitter, start), end);
    const d = new Date(time);

    // Business hours between 10:30 AM and 8:30 PM (10 to 20 hrs)
    d.setHours(getRandomInt(10, 20), getRandomInt(5, 55), getRandomInt(10, 50));
    dates.push(d);
  }

  // Sort chronologically
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates;
}

/**
 * Main Batch Allocation Generator
 */
function generateBatchInvoices({
  targetTotal = 200000,
  billCount = 200,
  startDate = '2026-10-01',
  endDate = '2026-10-31',
  products = [],
  startInvoiceNumber = 1,
  prefix = 'JH/',
  financialYear = '2026-27',
  shopState = 'Delhi',
  shopStateCode = '07',
  gstRate = 5.0,
}) {
  if (billCount <= 0) throw new Error('Bill count must be greater than 0');
  if (targetTotal <= 0) throw new Error('Target total must be greater than 0');
  if (!products || products.length === 0) throw new Error('Product catalog cannot be empty');

  const averageTarget = targetTotal / billCount;
  const dates = generateDates(startDate, endDate, billCount);

  // 1. Generate target amounts with natural Gaussian-like variance (±18% around average)
  const rawTargets = [];
  let rawSum = 0;

  for (let i = 0; i < billCount; i++) {
    // Variance between 0.82 and 1.18
    const factor = getRandomBetween(0.82, 1.18);
    const target = averageTarget * factor;
    rawTargets.push(target);
    rawSum += target;
  }

  // Normalize targets so their sum equals targetTotal exactly
  const normalizedTargets = rawTargets.map(t => (t / rawSum) * targetTotal);

  const batchInvoices = [];
  let accumulatedGrandTotal = 0;

  // 2. Build line items for each invoice
  for (let i = 0; i < billCount; i++) {
    const isLastBill = (i === billCount - 1);
    const targetBillAmount = isLastBill 
      ? Math.round((targetTotal - accumulatedGrandTotal) * 100) / 100 
      : normalizedTargets[i];

    const invoiceDate = dates[i].toISOString().split('T')[0];
    const invoiceNumStr = `${prefix}${financialYear}/B${(startInvoiceNumber + i).toString().padStart(4, '0')}`;
    const customerName = getRandomItem(SAMPLE_CUSTOMER_NAMES);
    const paymentMode = Math.random() > 0.4 ? 'ONLINE' : 'CASH';

    // Pick 1 to 3 distinct products
    const numItems = getRandomInt(1, Math.min(3, products.length));
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, numItems);

    const items = [];
    let billSubtotal = 0;
    let billTaxable = 0;
    let billCgst = 0;
    let billSgst = 0;

    // Distribute the targetBillAmount across selected items
    const perItemTarget = targetBillAmount / numItems;

    for (let j = 0; j < selectedProducts.length; j++) {
      const prod = selectedProducts[j];
      const appliedGst = gstRate !== undefined ? gstRate : (prod.gst_rate || 5.0);
      const unitPrice = prod.selling_price;

      // Calculate quantity that gets closest to perItemTarget
      const approxQty = Math.max(1, Math.round(perItemTarget / (unitPrice * (1 + appliedGst / 100))));
      const lineTaxable = Math.round(unitPrice * approxQty * 100) / 100;
      const lineTax = Math.round(lineTaxable * (appliedGst / 100) * 100) / 100;
      const lineTotal = lineTaxable + lineTax;

      const cgst = Math.round((lineTax / 2) * 100) / 100;
      const sgst = lineTax - cgst; // avoid rounding loss

      items.push({
        product_id: prod.id,
        item_name: prod.name,
        hsn_code: prod.hsn_code || '6115',
        unit: prod.unit || 'Pcs',
        quantity: approxQty,
        unit_price: unitPrice,
        discount_percent: 0,
        discount_amount: 0,
        taxable_value: lineTaxable,
        gst_rate: appliedGst,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: 0,
        total_amount: lineTotal,
      });

      billSubtotal += lineTaxable;
      billTaxable += lineTaxable;
      billCgst += cgst;
      billSgst += sgst;
    }

    let calculatedGrandTotal = Math.round((billTaxable + billCgst + billSgst) * 100) / 100;
    let roundOff = 0;

    // On the last bill, calibrate round_off or discount to hit targetTotal to the exact paisa
    if (isLastBill) {
      const remainingTarget = Math.round((targetTotal - accumulatedGrandTotal) * 100) / 100;
      const diff = Math.round((remainingTarget - calculatedGrandTotal) * 100) / 100;
      roundOff = diff;
      calculatedGrandTotal = remainingTarget;
    }

    accumulatedGrandTotal += calculatedGrandTotal;

    batchInvoices.push({
      document_type: 'BATCH_GST',
      invoice_number: invoiceNumStr,
      financial_year: financialYear,
      invoice_date: invoiceDate,
      customer_name: customerName,
      customer_phone: '',
      customer_gstin: '',
      customer_state: shopState,
      customer_state_code: shopStateCode,
      place_of_supply: `${shopState} (${shopStateCode})`,
      is_inter_state: 0,
      subtotal: Math.round(billSubtotal * 100) / 100,
      discount_amount: 0,
      taxable_amount: Math.round(billTaxable * 100) / 100,
      cgst_amount: Math.round(billCgst * 100) / 100,
      sgst_amount: Math.round(billSgst * 100) / 100,
      igst_amount: 0,
      round_off: roundOff,
      grand_total: calculatedGrandTotal,
      paid_amount: calculatedGrandTotal,
      balance_amount: 0,
      payment_mode: paymentMode,
      items: items,
      notes: 'Generated via Jain Hosiery Batch Allocator',
    });
  }

  // Ensure absolute equality to targetTotal
  const finalSum = batchInvoices.reduce((acc, b) => acc + b.grand_total, 0);
  console.log(`[BatchEngine] Generated ${batchInvoices.length} bills. Target: ₹${targetTotal}, Actual Sum: ₹${finalSum.toFixed(2)}`);

  return {
    targetTotal,
    actualTotal: Math.round(finalSum * 100) / 100,
    billCount: batchInvoices.length,
    invoices: batchInvoices,
  };
}

module.exports = {
  generateBatchInvoices,
};
