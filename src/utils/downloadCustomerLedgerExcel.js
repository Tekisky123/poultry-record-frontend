import * as XLSX from 'xlsx';

export const downloadCustomerLedgerExcel = (ledgerData, customerName) => {
  try {
    // Prepare data for Excel export
    const excelData = ledgerData.map(entry => ({
      'Date': formatDate(entry.date),
      'Vehicles No': entry.vehiclesNo,
      'Driver Name': entry.driverName,
      'Supervisor': entry.supervisor,
      'Product': entry.product,
      'Particulars': entry.particulars,
      'Invoice No': entry.invoiceNo,
      'Birds': entry.birds,
      'Weight': entry.weight,
      'Avg': entry.avgWeight,
      'Rate': entry.rate,
      'Amount': entry.amount,
      'Balance': entry.openingBalance
    }));

    // Calculate totals
    const totals = {
      'Date': 'TOTAL',
      'Vehicles No': '',
      'Driver Name': '',
      'Supervisor': '',
      'Product': '',
      'Particulars': '',
      'Invoice No': '',
      'Birds': ledgerData.reduce((sum, entry) => sum + entry.birds, 0),
      'Weight': ledgerData.reduce((sum, entry) => sum + entry.weight, 0),
      'Avg': '',
      'Rate': '',
      'Amount': ledgerData.reduce((sum, entry) => sum + entry.amount, 0),
      'Balance': ledgerData[ledgerData.length - 1]?.openingBalance || 0
    };

    // Add totals row
    excelData.push(totals);

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Ledger');

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 12 }, // Vehicles No
      { wch: 12 }, // Driver Name
      { wch: 12 }, // Supervisor
      { wch: 12 }, // Product
      { wch: 12 }, // Particulars
      { wch: 15 }, // Invoice No
      { wch: 8 },  // Birds
      { wch: 12 }, // Weight
      { wch: 8 },  // Avg
      { wch: 10 }, // Rate
      { wch: 12 }, // Amount
      { wch: 12 }  // Balance
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

    // Style totals row
    const totalsRowIndex = excelData.length - 1;
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
