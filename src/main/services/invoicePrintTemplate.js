/**
 * Printable Invoice HTML Generator
 * Generates two copies (Customer Copy & Merchant Copy) on a single A4 page
 * Designed for Indian Wholesale & Retail Hosiery shops
 */

function renderSingleCopy(inv, settings, copyLabel) {
  const isGst = inv.document_type === 'GST_INVOICE' || inv.document_type === 'BATCH_GST';
  const docTitle = isGst ? 'TAX INVOICE' : 'CASH MEMO / ESTIMATE';

  const rows = (inv.items || []).map((it, idx) => `
    <tr>
      <td style="border: 1px solid #94a3b8; padding: 3px 5px; text-align: center;">${idx + 1}</td>
      <td style="border: 1px solid #94a3b8; padding: 3px 5px;">
        <strong>${it.item_name}</strong>
      </td>
      <td style="border: 1px solid #94a3b8; padding: 3px 5px; text-align: center;">${it.quantity} ${it.unit || 'Pcs'}</td>
      <td style="border: 1px solid #94a3b8; padding: 3px 5px; text-align: right;">₹${Number(it.unit_price).toFixed(2)}</td>
      ${isGst ? `<td style="border: 1px solid #94a3b8; padding: 3px 5px; text-align: center;">${it.gst_rate || 5}%</td>` : ''}
      <td style="border: 1px solid #94a3b8; padding: 3px 5px; text-align: right; font-weight: 700;">₹${Number(it.total_amount).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div class="copy-container">
      <div class="header-table">
        <div class="header-left">
          <div class="biz-name">${settings.business_name || 'JAIN HOSIERY'}</div>
          <div class="biz-sub">${settings.trade_name || 'Wholesale & Retail Hosiery Specialist'}</div>
          <div class="biz-address">${settings.address_line1 || 'Gandhi Nagar, Main Road'}, ${settings.address_line2 || 'Delhi - 110031'} | Ph: ${settings.phone || '+91 98765 43210'}</div>
          ${isGst && settings.gstin ? `<div class="biz-gstin"><strong>GSTIN:</strong> ${settings.gstin} | <strong>State:</strong> ${settings.state || 'Delhi'} (${settings.state_code || '07'})</div>` : ''}
        </div>
        <div class="header-right">
          <div class="copy-badge">${copyLabel}</div>
          <div class="doc-title">${docTitle}</div>
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-box customer-box">
          <div class="meta-box-title">Billed To:</div>
          <div class="cust-name">${inv.customer_name || 'Walk-in Customer'}</div>
          ${inv.customer_phone ? `<div><strong>Phone:</strong> ${inv.customer_phone}</div>` : ''}
          ${inv.customer_address ? `<div><strong>Address:</strong> ${inv.customer_address}</div>` : ''}
          ${isGst && inv.customer_gstin ? `<div><strong>GSTIN:</strong> ${inv.customer_gstin}</div>` : ''}
          ${isGst ? `<div><strong>Place of Supply:</strong> ${inv.place_of_supply || inv.customer_state || 'Delhi (07)'}</div>` : ''}
        </div>
        <div class="meta-box invoice-box">
          <div><strong>Bill No:</strong> <span style="font-family: monospace; font-weight: 700;">${inv.invoice_number}</span></div>
          <div><strong>Date:</strong> ${inv.invoice_date}</div>
          <div><strong>Payment Mode:</strong> <span class="pay-badge">${inv.payment_mode || 'CASH'}</span></div>
          <div><strong>Status:</strong> ${inv.status || 'PAID'}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 28px; text-align: center;">#</th>
            <th>Item Description</th>
            <th style="width: 75px; text-align: center;">Qty</th>
            <th style="width: 85px; text-align: right;">Rate</th>
            ${isGst ? '<th style="width: 55px; text-align: center;">GST</th>' : ''}
            <th style="width: 95px; text-align: right;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="bottom-section">
        <div class="bank-note-section">
          ${isGst && settings.bank_account_no ? `
            <div style="font-size: 9.5px; color: #334155; line-height: 1.45;">
              <strong>Bank Details for Payment:</strong><br>
              <strong>Bank:</strong> ${settings.bank_name || 'State Bank of India'}<br>
              <strong>A/c No:</strong> ${settings.bank_account_no}<br>
              <strong>IFSC:</strong> ${settings.bank_ifsc || ''}
            </div>
          ` : `
            <div style="font-size: 10px; color: #64748b; font-style: italic; padding: 6px 2px;">
              Thank you for your business!
            </div>
          `}
        </div>

        <div class="totals-section">
          <div class="tot-row"><span>Subtotal:</span><span>₹${Number(inv.subtotal || 0).toFixed(2)}</span></div>
          ${inv.discount_amount > 0 ? `<div class="tot-row"><span>Discount:</span><span>-₹${Number(inv.discount_amount).toFixed(2)}</span></div>` : ''}
          ${isGst ? `
            <div class="tot-row"><span>Taxable:</span><span>₹${Number(inv.taxable_amount || 0).toFixed(2)}</span></div>
            ${inv.cgst_amount > 0 ? `<div class="tot-row"><span>CGST:</span><span>₹${Number(inv.cgst_amount).toFixed(2)}</span></div>` : ''}
            ${inv.sgst_amount > 0 ? `<div class="tot-row"><span>SGST:</span><span>₹${Number(inv.sgst_amount).toFixed(2)}</span></div>` : ''}
            ${inv.igst_amount > 0 ? `<div class="tot-row"><span>IGST:</span><span>₹${Number(inv.igst_amount).toFixed(2)}</span></div>` : ''}
          ` : ''}
          ${inv.round_off && inv.round_off !== 0 ? `<div class="tot-row"><span>Round Off:</span><span>${inv.round_off > 0 ? '+' : ''}₹${Number(inv.round_off).toFixed(2)}</span></div>` : ''}
          <div class="tot-grand"><span>Grand Total:</span><span>₹${Number(inv.grand_total || 0).toFixed(2)}</span></div>
          <div class="tot-row" style="color: #166534; font-weight: 700;"><span>Paid Amount:</span><span>₹${Number(inv.paid_amount || 0).toFixed(2)}</span></div>
          ${inv.balance_amount > 0 ? `<div class="tot-row" style="color: #991b1b; font-weight: 700;"><span>Balance Due (Udhar):</span><span>₹${Number(inv.balance_amount).toFixed(2)}</span></div>` : ''}
        </div>
      </div>

      <div class="sign-row">
        <div style="font-size: 10px; color: #64748b;">This is a computer generated document.</div>
        <div class="sign-box">For ${settings.business_name || 'Jain Hosiery'}<br><br>Authorized Signatory</div>
      </div>
    </div>
  `;
}

function generateDualCopyPrintableHtml(inv, settings = {}) {
  const isGst = inv.document_type === 'GST_INVOICE' || inv.document_type === 'BATCH_GST';
  const docTitle = isGst ? 'TAX INVOICE' : 'CASH MEMO';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${docTitle} - ${inv.invoice_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.25;
    }
    .print-page {
      display: flex;
      flex-direction: column;
      height: 285mm;
      max-height: 285mm;
      justify-content: space-between;
    }
    .copy-container {
      border: 1px solid #94a3b8;
      border-radius: 4px;
      padding: 8px 12px;
      background: #ffffff;
      height: 136mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 6px;
    }
    .biz-name {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .biz-sub {
      font-size: 10.5px;
      color: #334155;
      font-weight: 600;
    }
    .biz-address, .biz-gstin {
      font-size: 10px;
      color: #475569;
    }
    .header-right {
      text-align: right;
    }
    .copy-badge {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 800;
      background: #e2e8f0;
      color: #0f172a;
      border: 1px solid #94a3b8;
      padding: 2px 8px;
      border-radius: 3px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .meta-row {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .meta-box {
      flex: 1;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      background: #f8fafc;
      font-size: 10px;
      line-height: 1.35;
    }
    .meta-box-title {
      font-weight: 700;
      color: #475569;
      font-size: 9.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .cust-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .pay-badge {
      display: inline-block;
      background: #0f172a;
      color: #fff;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 9px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 10.5px;
    }
    .items-table th {
      background: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 4px;
      font-weight: 700;
      color: #0f172a;
      text-align: left;
    }
    .bottom-section {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-top: 2px;
    }
    .bank-note-section {
      flex: 1.2;
      font-size: 9px;
      color: #475569;
      line-height: 1.35;
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      border-radius: 3px;
      background: #fafafa;
    }
    .totals-section {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 4px 8px;
      background: #f8fafc;
      font-size: 10px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      padding: 1.5px 0;
    }
    .tot-grand {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 12.5px;
      font-weight: 800;
      border-top: 1.5px solid #0f172a;
      margin-top: 2px;
      color: #0f172a;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 3px;
      padding-top: 2px;
    }
    .sign-box {
      text-align: right;
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .divider-strip {
      height: 12mm;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .divider-line {
      width: 100%;
      border-top: 1.5px dashed #64748b;
      position: absolute;
      top: 50%;
    }
    .divider-label {
      background: #ffffff;
      padding: 0 14px;
      color: #475569;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 1px;
      position: relative;
      z-index: 2;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-page">
    <!-- Top Half: Customer Copy -->
    ${renderSingleCopy(inv, settings, 'CUSTOMER COPY (ORIGINAL)')}

    <!-- Center Cut Line / Perforation -->
    <div class="divider-strip">
      <div class="divider-line"></div>
      <div class="divider-label">✂ - - - - - - - - - - - - CUT HERE - - - - - - - - - - - - ✂</div>
    </div>

    <!-- Bottom Half: Merchant Copy -->
    ${renderSingleCopy(inv, settings, 'MERCHANT COPY (DUPLICATE / SHOP RECORD)')}
  </div>
</body>
</html>`;
}

module.exports = {
  generateDualCopyPrintableHtml,
};
