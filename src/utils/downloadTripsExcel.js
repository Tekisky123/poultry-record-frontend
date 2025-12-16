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

    // Initialize totals tracking
    const totals = new Array(columns.length).fill(0);
    const isColumnNumeric = new Array(columns.length).fill(false);
    const columnFormats = new Array(columns.length).fill(null);

    // Helper to parse value and detect format
    const parseValue = (val) => {
      if (!val || val === '-') return { num: 0, isNum: false, format: null };
      const str = val.toString();

      let format = null;
      if (str.includes('₹')) format = 'currency';
      else if (str.includes('km/L')) format = 'km/L';
      else if (str.includes('km')) format = 'km';
      else if (str.includes('kg')) format = 'kg';
      else if (str.includes('L')) format = 'L';

      // Clean string for parsing
      let clean = str.replace(/[₹, ]/g, '').toLowerCase();
      clean = clean.replace(/km\/l|km|kg|l/g, ''); // Remove units

      // If it contains letters after cleaning, it's not a pure number (e.g. date, alphanumeric id)
      if (/[a-z]/.test(clean)) return { num: 0, isNum: false, format };

      const parsed = parseFloat(clean);
      return {
        num: isNaN(parsed) ? 0 : parsed,
        isNum: !isNaN(parsed),
        format
      };
    };

    // Prepare data rows and calculate totals
    const dataRows = trips.map((trip, index) => {
      const row = [index + 1]; // SL NO

      columns.forEach((column, colIndex) => {
        const value = column.render ? column.render(trip, index) : '-';
        row.push(value);

        // Accumulate totals
        const result = parseValue(value);
        if (result.isNum) {
          totals[colIndex] += result.num;
          isColumnNumeric[colIndex] = true;
          if (result.format && !columnFormats[colIndex]) {
            columnFormats[colIndex] = result.format;
          }
        }
      });

      return row;
    });

    // Create Total Row
    const totalRow = ['Total'];
    columns.forEach((_, index) => {
      if (isColumnNumeric[index]) {
        const sum = totals[index];
        const format = columnFormats[index];

        // Format the sum similar to the column data
        let formattedSum = sum.toLocaleString('en-IN', { maximumFractionDigits: 2 });

        if (format === 'currency') formattedSum = `₹${formattedSum}`;
        else if (format === 'kg') formattedSum = `${formattedSum} kg`;
        else if (format === 'km') formattedSum = `${formattedSum} km`;
        else if (format === 'L') formattedSum = `${formattedSum} L`;
        else if (format === 'km/L') formattedSum = `${formattedSum} km/L`;

        totalRow.push(formattedSum);
      } else {
        totalRow.push('-'); // or empty string
      }
    });

    // Append Total Row
    dataRows.push(totalRow);

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

    // Styles
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E6F3FF" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const totalRowStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F0F0F0" } }, // Light gray for total
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Apply header and total row styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      // Header (Row 0)
      const headerAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[headerAddress]) ws[headerAddress] = { v: '' };
      ws[headerAddress].s = headerStyle;

      // Total Row (Last Row)
      const totalRowIndex = range.e.r; // Last row index
      const totalAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
      if (!ws[totalAddress]) ws[totalAddress] = { v: '' };
      // Preserve existing value, just add style
      if (!ws[totalAddress].s) ws[totalAddress].s = {};
      Object.assign(ws[totalAddress].s, totalRowStyle);
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
