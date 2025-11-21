import * as XLSX from 'xlsx';

/**
 * Downloads trips data to Excel file
 * @param {Array} trips - Array of trip objects
 * @param {Array} columns - Array of column definitions from REPORT_COLUMNS
 * @param {String} filename - Optional filename (default: 'trips_report')
 */
export const downloadTripsExcel = (trips, columns, filename = 'trips_report') => {
  try {
    if (!trips || trips.length === 0) {
      alert('No trips data available to download');
      return false;
    }

    // Prepare data for Excel export
    // Get headers from columns (excluding Action column which is not in REPORT_COLUMNS)
    const headers = ['SL NO', ...columns.map(col => col.label)];

    // Prepare data rows
    const dataRows = trips.map((trip, index) => {
      const row = [index + 1]; // SL NO
      
      // Add data for each column using the render function
      columns.forEach(column => {
        const value = column.render ? column.render(trip, index) : '-';
        // Remove currency symbols and formatting for numeric values in Excel
        // Keep the formatted string as is for display
        row.push(value);
      });
      
      return row;
    });

    // Combine headers and data
    const aoa = [headers, ...dataRows];

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trips Report');

    // Set column widths
    const colWidths = [
      { wch: 8 }, // SL NO
      ...columns.map(() => ({ wch: 15 })) // All other columns
    ];
    ws['!cols'] = colWidths;

    // Style the header row
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E6F3FF" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '' };
      ws[cellAddress].s = headerStyle;
    }

    // Generate filename with current date
    const currentDate = new Date();
    const dateStr = currentDate.toISOString().split('T')[0];
    const finalFilename = `${filename}_${dateStr}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, finalFilename);

    return true;
  } catch (error) {
    console.error('Error generating Excel file:', error);
    alert('Error generating Excel file. Please try again.');
    return false;
  }
};

