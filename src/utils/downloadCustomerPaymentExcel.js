import * as XLSX from 'xlsx';

export const downloadCustomerPaymentExcel = (paymentData, customerName) => {
  try {
    // Prepare data for Excel export
    const excelData = paymentData.map(payment => ({
      'Date': formatDate(payment.createdAt),
      'Payment Method': payment.paymentMethod,
      'Amount': payment.amount,
      'Status': payment.status,
      'Transaction ID': payment.verificationDetails?.transactionId || '',
      'Reference Number': payment.verificationDetails?.referenceNumber || '',
      'Bank Name': payment.verificationDetails?.bankName || '',
      'Payment Date': payment.verificationDetails?.paymentDate ? formatDate(payment.verificationDetails.paymentDate) : '',
      'Notes': payment.verificationDetails?.notes || '',
      'Admin Notes': payment.adminNotes || ''
    }));

    // Calculate totals
    const totals = {
      'Date': 'TOTAL',
      'Payment Method': '',
      'Amount': paymentData.reduce((sum, payment) => sum + payment.amount, 0),
      'Status': '',
      'Transaction ID': '',
      'Reference Number': '',
      'Bank Name': '',
      'Payment Date': '',
      'Notes': '',
      'Admin Notes': ''
    };

    // Add totals row
    excelData.push(totals);

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Records');

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Payment Method
      { wch: 12 }, // Amount
      { wch: 12 }, // Status
      { wch: 20 }, // Transaction ID
      { wch: 18 }, // Reference Number
      { wch: 15 }, // Bank Name
      { wch: 12 }, // Payment Date
      { wch: 20 }, // Notes
      { wch: 20 }  // Admin Notes
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
    const filename = `${customerName}_Payment_Records_${dateStr}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

    return true;
  } catch (error) {
    console.error('Error generating payment Excel file:', error);
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
