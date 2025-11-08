import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const makeHeaderRow = (worksheet, rowIndex, values, style) => {
  values.forEach((value, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    worksheet[cellAddress] = worksheet[cellAddress] || {};
    worksheet[cellAddress].v = value;
    worksheet[cellAddress].s = style;
  });
};

const writeRow = (worksheet, rowIndex, values, style) => {
  values.forEach((value, colIndex) => {
    if (value === undefined || value === null) return;
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    worksheet[cellAddress] = {
      v: value,
      s: style
    };
  });
};

const formatNumber = (value, digits = 2) => {
  const num = Number(value) || 0;
  return Number(num.toFixed(digits));
};

export const downloadIndirectSaleInvoice = (record) => {
  try {
    if (!record) throw new Error('No indirect sale record provided');

    const workbook = XLSX.utils.book_new();
    const worksheet = {};

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
      fill: { fgColor: { rgb: '0F3460' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const subHeaderStyle = {
      font: { bold: true, color: { rgb: '0F3460' }, sz: 12 },
      fill: { fgColor: { rgb: 'E3F2FD' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const labelStyle = {
      font: { bold: true },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const valueStyle = {
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    let row = 0;

    // Title
    makeHeaderRow(worksheet, row, ['RCC AND TRADING COMPANY'], headerStyle);
    row += 1;
    makeHeaderRow(worksheet, row, ['BILL OF SUPPLY'], headerStyle);
    row += 1;
    makeHeaderRow(
      worksheet,
      row,
      [`CUSTOMER NAME : ${record.customer?.shopName || 'N/A'}`],
      subHeaderStyle
    );
    row += 1;

    // Particulars
    const particulars = [
      ['DATE', dayjs(record.date).format('DD/MM/YYYY'), 'BIRDS', formatNumber(record.sales?.birds || 0, 0)],
      ['INVOICE NO', record.invoiceNumber || '—', 'WEIGHT', formatNumber(record.sales?.weight || 0)],
      ['PLACE', record.place || '—', 'AVG', formatNumber(record.sales?.avgWeight || 0)],
      ['PRODUCT', record.vendor?.vendorName || '—', 'RATE', formatNumber(record.sales?.rate || 0)],
      ['VEHICLE NO', record.vehicleNumber || '—', 'AMOUNT', formatNumber(record.sales?.amount || 0)],
      ['DRIVER', record.driver || '—', 'TDS-0.1%', ''],
      ['ADMIN', record.createdBy?.name || '—', 'BALANCE', '']
    ];

    const customerHasTds = record.customer?.tdsApplicable;
    const tdsAmount = customerHasTds ? (record.sales?.amount || 0) * 0.1 / 100 : 0;
    const balance = (record.sales?.amount || 0) - tdsAmount;

    particulars.forEach((line, index) => {
      const values = [...line];
      if (index === 5) {
        values[3] = formatNumber(tdsAmount);
      }
      if (index === 6) {
        values[3] = formatNumber(balance);
      }
      writeRow(worksheet, row, values, valueStyle);
      worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })].s = labelStyle;
      worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })].s = labelStyle;
      row += 1;
    });

    // Notes about TDS
    if (customerHasTds) {
      const note = `TDS IF APPLICABLE 0.1% ON SALES AMOUNT - ${formatNumber((record.sales?.amount || 0) - tdsAmount)}`;
      writeRow(worksheet, row, ['', '', '', '', note], valueStyle);
    }

    const range = {
      s: { r: 0, c: 0 },
      e: { r: row + 1, c: 4 }
    };
    worksheet['!ref'] = XLSX.utils.encode_range(range);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 24 },
      { wch: 15 },
      { wch: 15 },
      { wch: 45 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');

    const filename = `Indirect_Sale_Invoice_${record.invoiceNumber || 'NA'}_${dayjs().format('YYYYMMDD')}.xlsx`;
    XLSX.writeFile(workbook, filename);
    return true;
  } catch (error) {
    console.error('Failed to generate indirect sale invoice', error);
    return false;
  }
};

