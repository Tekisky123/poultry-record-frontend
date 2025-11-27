import * as XLSX from 'xlsx';

const calculateOpeningBalanceValue = (entry) => {
  if (!entry) return 0;
  const balance = Number(entry.outstandingBalance) || 0;
  const amount = Number(entry.amount) || 0;

  switch (entry.particulars) {
    case 'SALES':
      return balance - amount;
    case 'BY CASH RECEIPT':
    case 'BY BANK RECEIPT':
    case 'DISCOUNT':
      return balance + amount;
    default:
      return balance;
  }
};

export const downloadCustomerLedgerExcelCustomer = (ledgerData, customerName) => {
  try {
    const excelData = ledgerData.map((entry) => {
      const rowBalance =
        typeof entry.outstandingBalance === 'number' ? entry.outstandingBalance : 0;

      return {
        Date: formatDate(entry.date),
        Particulars: entry.particulars || '',
        'Invoice No': entry.invoiceNo || '',
        Birds: entry.birds || 0,
        Weight: entry.weight || 0,
        Avg: entry.avgWeight
          ? parseFloat(Number(entry.avgWeight).toFixed(2))
          : 0,
        Rate: entry.rate
          ? parseFloat(Number(entry.rate).toFixed(2))
          : 0,
        Amount: entry.amount || 0,
        Balance: rowBalance,
        Product: entry.product || '',
        Supervisor: entry.supervisor || '',
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
      'Amount',
      'Balance',
      'Product',
      'Supervisor',
      'Vehicles No'
    ];

    const totals = {
      Date: 'TOTAL',
      Particulars: '',
      'Invoice No': '',
      Birds: ledgerData.reduce((sum, entry) => sum + (entry.birds || 0), 0),
      Weight: ledgerData.reduce((sum, entry) => sum + (entry.weight || 0), 0),
      Avg: '',
      Rate: '',
      Amount: ledgerData.reduce((sum, entry) => sum + (entry.amount || 0), 0),
      Balance: ledgerData.length > 0
        ? ledgerData[ledgerData.length - 1].outstandingBalance || 0
        : 0,
      Product: '',
      Supervisor: '',
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

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Ledger');

    ws['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 }
    ];

    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E6F3FF' } },
      alignment: { horizontal: 'center' }
    };

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '' };
      ws[cellAddress].s = headerStyle;
    }

    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({
      s: { r: 1, c: 0 },
      e: { r: 1, c: 7 }
    });

    const openingLabelCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[openingLabelCell]) {
      ws[openingLabelCell].s = {
        font: { bold: true },
        alignment: { horizontal: 'left' }
      };
    }

    const openingBalanceCell = XLSX.utils.encode_cell({ r: 1, c: 8 });
    if (!ws[openingBalanceCell]) {
      ws[openingBalanceCell] = { v: openingBalanceValue };
    }
    ws[openingBalanceCell].s = {
      font: { bold: true }
    };
    ws[openingBalanceCell].z = '#,##0.00';

    const totalsRowIndex = aoa.length - 1;
    const totalsStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'F0F8FF' } }
    };

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = totalsStyle;
      }
    }

    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-GB').replace(/\//g, '');
    const filename = `${customerName}_Purchase_Ledger_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);

    return true;
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return false;
  }
};

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

