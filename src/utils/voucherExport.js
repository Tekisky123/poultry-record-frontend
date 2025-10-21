// Utility functions for voucher export functionality

export const exportVouchersToExcel = (vouchers, filename = 'vouchers') => {
  // Create CSV content
  const headers = [
    'Voucher Number',
    'Date',
    'Voucher Type',
    'Party Name',
    'Total Debit',
    'Total Credit',
    'Narration',
    'Status',
    'Created By',
    'Created At'
  ];

  const csvContent = [
    headers.join(','),
    ...vouchers.map(voucher => [
      voucher.voucherNumber || '',
      new Date(voucher.date).toLocaleDateString(),
      voucher.voucherType || '',
      voucher.partyName || '',
      voucher.totalDebit || 0,
      voucher.totalCredit || 0,
      `"${(voucher.narration || '').replace(/"/g, '""')}"`, // Escape quotes in narration
      voucher.status || '',
      voucher.createdBy?.name || '',
      new Date(voucher.createdAt).toLocaleDateString()
    ].join(','))
  ].join('\n');

  // Download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportVoucherToPDF = (voucher) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Voucher - ${voucher.voucherNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .company-subtitle {
          font-size: 14px;
          color: #666;
        }
        .voucher-title {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0;
        }
        .voucher-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-section {
          flex: 1;
        }
        .info-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .info-value {
          margin-bottom: 10px;
        }
        .entries-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .entries-table th,
        .entries-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
        }
        .entries-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .entries-table .amount {
          text-align: right;
        }
        .totals {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          font-weight: bold;
        }
        .narration {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #333;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">RCC AND TRADING COMPANY</div>
        <div class="company-subtitle">Poultry Record Management System</div>
      </div>
      
      <div class="voucher-title">${voucher.voucherType} Voucher</div>
      
      <div class="voucher-info">
        <div class="info-section">
          <div class="info-label">Voucher Number:</div>
          <div class="info-value">${voucher.voucherNumber}</div>
          
          <div class="info-label">Date:</div>
          <div class="info-value">${new Date(voucher.date).toLocaleDateString()}</div>
          
          <div class="info-label">Status:</div>
          <div class="info-value">${voucher.status}</div>
        </div>
        
        <div class="info-section">
          <div class="info-label">Party:</div>
          <div class="info-value">${voucher.partyName || 'N/A'}</div>
          
          <div class="info-label">Created By:</div>
          <div class="info-value">${voucher.createdBy?.name || 'N/A'}</div>
          
          <div class="info-label">Created At:</div>
          <div class="info-value">${new Date(voucher.createdAt).toLocaleString()}</div>
        </div>
      </div>
      
      <table class="entries-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Debit Amount</th>
            <th>Credit Amount</th>
            <th>Narration</th>
          </tr>
        </thead>
        <tbody>
          ${voucher.entries.map(entry => `
            <tr>
              <td>${entry.account}</td>
              <td class="amount">${entry.debitAmount > 0 ? `₹${entry.debitAmount.toLocaleString()}` : '-'}</td>
              <td class="amount">${entry.creditAmount > 0 ? `₹${entry.creditAmount.toLocaleString()}` : '-'}</td>
              <td>${entry.narration || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold; background-color: #f5f5f5;">
            <td>Total</td>
            <td class="amount">₹${voucher.totalDebit.toLocaleString()}</td>
            <td class="amount">₹${voucher.totalCredit.toLocaleString()}</td>
            <td>${Math.abs(voucher.totalDebit - voucher.totalCredit) <= 0.01 ? 'Balanced' : 'Not Balanced'}</td>
          </tr>
        </tfoot>
      </table>
      
      ${voucher.narration ? `
        <div class="narration">
          <strong>Narration:</strong><br>
          ${voucher.narration}
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>This is a computer-generated voucher.</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
};

export const exportVouchersToPDF = (vouchers, filename = 'vouchers') => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vouchers Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .company-subtitle {
          font-size: 14px;
          color: #666;
        }
        .report-title {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 5px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 18px;
          font-weight: bold;
        }
        .vouchers-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .vouchers-table th,
        .vouchers-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
        }
        .vouchers-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .vouchers-table .amount {
          text-align: right;
        }
        .page-break {
          page-break-before: always;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">RCC AND TRADING COMPANY</div>
        <div class="company-subtitle">Poultry Record Management System</div>
      </div>
      
      <div class="report-title">Vouchers Report</div>
      
      <div class="summary">
        <div class="summary-item">
          <div class="summary-label">Total Vouchers</div>
          <div class="summary-value">${vouchers.length}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Total Debit</div>
          <div class="summary-value">₹${vouchers.reduce((sum, v) => sum + v.totalDebit, 0).toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Total Credit</div>
          <div class="summary-value">₹${vouchers.reduce((sum, v) => sum + v.totalCredit, 0).toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Balance</div>
          <div class="summary-value">₹${Math.abs(vouchers.reduce((sum, v) => sum + v.totalDebit - v.totalCredit, 0)).toLocaleString()}</div>
        </div>
      </div>
      
      <table class="vouchers-table">
        <thead>
          <tr>
            <th>Voucher No</th>
            <th>Date</th>
            <th>Type</th>
            <th>Party</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${vouchers.map((voucher, index) => `
            ${index > 0 && index % 20 === 0 ? '<tr class="page-break"><td colspan="7"></td></tr>' : ''}
            <tr>
              <td>${voucher.voucherNumber}</td>
              <td>${new Date(voucher.date).toLocaleDateString()}</td>
              <td>${voucher.voucherType}</td>
              <td>${voucher.partyName || 'N/A'}</td>
              <td class="amount">₹${voucher.totalDebit.toLocaleString()}</td>
              <td class="amount">₹${voucher.totalCredit.toLocaleString()}</td>
              <td>${voucher.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>This is a computer-generated report.</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
};
