import * as XLSX from 'xlsx';

const calculateOpeningBalanceValue = (entry) => {
  if (!entry) return 0;
  const balance = Number(entry.outstandingBalance) || 0;
  const amount = Number(entry.amount) || 0;

  // Handle voucher entries
  if (entry.isVoucher && entry.voucherType) {
    if (entry.voucherType === 'Payment') {
      // Payment voucher: customer balance decreases
      return balance + amount;
    } else if (entry.voucherType === 'Receipt') {
      // Receipt voucher: customer balance increases
      return balance - amount;
    }
  }

  switch (entry.particulars) {
    case 'SALES':
      return balance - amount;
    case 'BY CASH RECEIPT':
    case 'BY BANK RECEIPT':
    case 'DISCOUNT':
      return balance + amount;
    case 'RECEIPT':
    case 'PAYMENT':
      // These don't change balance in the calculation
      return balance;
    default:
      return balance;
  }
};

export const downloadCustomerLedgerExcel = (ledgerData, customerName) => {
  try {
    // Prepare data for Excel export
    const excelData = ledgerData.map((entry) => {
      const rowBalance =
        typeof entry.outstandingBalance === 'number' ? entry.outstandingBalance : 0;

      // Map voucher particulars for admin panel:
      // Payment voucher: show "RECEIPT"
      // Receipt voucher: show "PAYMENT"
      let particulars = entry.particulars || '';
      if (entry.isVoucher && entry.voucherType) {
        if (entry.voucherType === 'Payment') {
          particulars = 'RECEIPT';
        } else if (entry.voucherType === 'Receipt') {
          particulars = 'PAYMENT';
        }
      }

      const p = particulars;
      const amount = entry.amount || 0;
      const isDebit = ['SALES', 'STOCK_SALE', 'INDIRECT_SALES', 'PAYMENT', 'INDIRECT_PURCHASE', 'STOCK_PURCHASE'].includes(p);
      const isCredit = ['RECEIPT', 'BY CASH RECEIPT', 'BY BANK RECEIPT', 'DISCOUNT'].includes(p);

      return {
        Date: formatDate(entry.date),
        Particulars: particulars,
        'Invoice No': entry.invoiceNo || '',
        Birds: entry.birds || 0,
        Weight: entry.weight || 0,
        Avg: entry.avgWeight
          ? parseFloat(Number(entry.avgWeight).toFixed(2))
          : 0,
        Rate: entry.rate
          ? parseFloat(Number(entry.rate).toFixed(2))
          : 0,
        Debit: isDebit ? amount : 0,
        Credit: isCredit ? amount : 0,
        Balance: rowBalance,
        Product: entry.product || '',
        Supervisor: entry.supervisor || '',
        'Driver Name': entry.driverName || '',
        'Vehicles No': entry.vehiclesNo || ''
      };
    });

    const openingBalanceValue = calculateOpeningBalanceValue(ledgerData[0]);

    const columnHeaders = [
      'Date',
      'Particulars',
      'Invoice No',
      'Birds',
      'Weight',
      'Avg',
      'Rate',
      'Rate',
      'Debit',
      'Credit',
      'Balance',
      'Product',
      'Supervisor',
      'Driver Name',
      'Vehicles No'
    ];

    // Calculate totals
    const totalBirds = ledgerData.reduce((sum, entry) => sum + (entry.birds || 0), 0);
    const totalWeight = ledgerData.reduce((sum, entry) => sum + (entry.weight || 0), 0);

    // Calculate total Debit and Credit
    const totalDebit = excelData.reduce((sum, row) => sum + (row.Debit || 0), 0);
    const totalCredit = excelData.reduce((sum, row) => sum + (row.Credit || 0), 0);
    const lastBalance =
      ledgerData.length > 0
        ? ledgerData[ledgerData.length - 1].outstandingBalance || 0
        : 0;

    const totals = {
      Date: 'TOTAL',
      Particulars: '',
      'Invoice No': '',
      Birds: totalBirds,
      Weight: totalWeight,
      Avg: '',
      Rate: '',
      Debit: totalDebit,
      Credit: totalCredit,
      Balance: lastBalance,
      Product: '',
      Supervisor: '',
      'Driver Name': '',
      'Vehicles No': ''
    };

    const openingRow = columnHeaders.map((header) => {
      if (header === 'Date') return 'Opening Balance';
      if (header === 'Balance') return openingBalanceValue;
      return '';
    });

    const dataRows = excelData.map((row) =>
      columnHeaders.map((header) => (row[header] !== undefined ? row[header] : ''))
    );

    const totalsRow = columnHeaders.map((header) =>
      totals[header] !== undefined ? totals[header] : ''
    );

    const aoa = [columnHeaders, openingRow, ...dataRows, totalsRow];

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Ledger');

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 18 }, // Particulars
      { wch: 15 }, // Invoice No
      { wch: 10 }, // Birds
      { wch: 12 }, // Weight
      { wch: 8 }, // Avg
      { wch: 10 }, // Rate
      { wch: 12 }, // Debit
      { wch: 12 }, // Credit
      { wch: 12 }, // Balance
      { wch: 15 }, // Product
      { wch: 15 }, // Supervisor
      { wch: 15 }, // Driver Name
      { wch: 12 } // Vehicles No
    ];
    ws['!cols'] = colWidths;

    // Style the header row
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E6F3FF" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '' };
      ws[cellAddress].s = headerStyle;
    }

    // Merge Opening Balance label cells (A2:H2)
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({
      s: { r: 1, c: 0 },
      e: { r: 1, c: 7 }
    });

    // Style Opening Balance row
    const openingLabelCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[openingLabelCell]) {
      ws[openingLabelCell].s = {
        font: { bold: true },
        alignment: { horizontal: 'left' }
      };
    }

    const openingBalanceCell = XLSX.utils.encode_cell({ r: 1, c: 9 });
    if (!ws[openingBalanceCell]) {
      ws[openingBalanceCell] = { v: openingBalanceValue };
    }
    ws[openingBalanceCell].s = {
      font: { bold: true }
    };
    ws[openingBalanceCell].z = '#,##0.00';

    // Style totals row
    const totalsRowIndex = aoa.length - 1;
    const totalsStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F0F8FF" } }
    };

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = totalsStyle;
      }
    }

    // Generate filename with current date
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-GB').replace(/\//g, '');
    const filename = `${customerName}_Purchase_Ledger_${dateStr}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

    return true;
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return false;
  }
};

// Helper function to format date as DD-MMM-YY
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
