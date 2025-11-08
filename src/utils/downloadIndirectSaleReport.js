import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const fmt = (value, digits = 2) => {
  const num = Number(value) || 0;
  return Number(num.toFixed(digits));
};

const write = (ws, r, c, value, style = {}) => {
  const cellAddress = XLSX.utils.encode_cell({ r, c });
  ws[cellAddress] = { v: value, s: style };
};

const merge = (ws, sRow, eRow, sCol, eCol) => {
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: sRow, c: sCol }, e: { r: eRow, c: eCol } });
};

export const downloadIndirectSaleReport = (record) => {
  try {
    if (!record) throw new Error('No data to export');

    const wb = XLSX.utils.book_new();
    const ws = {};

    const headerStyle = {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0F3460' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const sectionHeaderStyle = {
      font: { bold: true, sz: 12, color: { rgb: '0F3460' } },
      fill: { fgColor: { rgb: 'E3F2FD' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const labelStyle = {
      font: { bold: true },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const tableHeaderStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'F5F5F5' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      }
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } }
      }
    };

    let row = 0;
    merge(ws, row, row, 0, 6);
    write(ws, row, 0, 'INDIRECT PURCHASE & SALES REPORT', headerStyle);
    row += 2;

    merge(ws, row, row, 0, 6);
    write(ws, row, 0, 'PERTICULAR', sectionHeaderStyle);
    row += 1;

    const particulars = [
      ['DATE', dayjs(record.date).format('DD/MM/YYYY'), 'CUSTOMER NAME', record.customer?.shopName || 'N/A', 'VENDOR NAME', record.vendor?.vendorName || 'N/A'],
      ['PLACE', record.place || '—', 'VEHICLE NO', record.vehicleNumber || '—', 'DRIVER', record.driver || '—']
    ];

    particulars.forEach(line => {
      for (let col = 0; col < line.length; col += 2) {
        write(ws, row, col, line[col], labelStyle);
        write(ws, row, col + 1, line[col + 1], {});
      }
      row += 1;
    });

    row += 1;
    merge(ws, row, row, 0, 6);
    write(ws, row, 0, 'PURCHASE DETAILS', sectionHeaderStyle);
    row += 1;

    const purchaseHeaders = ['SL NO', 'DC NO', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT'];
    purchaseHeaders.forEach((header, idx) => write(ws, row, idx, header, tableHeaderStyle));
    row += 1;

    record.purchases.forEach((purchase, index) => {
      const data = [
        index + 1,
        purchase.dcNumber || '—',
        fmt(purchase.birds, 0),
        fmt(purchase.weight),
        fmt(purchase.avg),
        fmt(purchase.rate),
        fmt(purchase.amount)
      ];
      data.forEach((value, idx) => write(ws, row, idx, value, cellStyle));
      row += 1;
    });

    const totals = [
      'TOTAL',
      '—',
      fmt(record.summary?.totalPurchaseBirds || 0, 0),
      fmt(record.summary?.totalPurchaseWeight || 0),
      fmt(record.summary?.totalPurchaseAverage || 0),
      fmt(record.summary?.totalPurchaseRate || 0),
      fmt(record.summary?.totalPurchaseAmount || 0)
    ];
    totals.forEach((value, idx) => write(ws, row, idx, value, tableHeaderStyle));
    row += 2;

    merge(ws, row, row, 0, 6);
    write(ws, row, 0, 'MORTALITY DETAILS', sectionHeaderStyle);
    row += 1;

    const mortalityHeaders = ['MORTALITY', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT'];
    mortalityHeaders.forEach((header, idx) => write(ws, row, idx + 1, header, tableHeaderStyle));
    row += 1;

    const mortality = [
      '',
      fmt(record.mortality?.birds || 0, 0),
      fmt(record.mortality?.weight || 0),
      fmt(record.mortality?.avgWeight || 0),
      fmt(record.mortality?.rate || 0),
      fmt(record.mortality?.amount || 0)
    ];
    write(ws, row, 0, 'MORTALITY', tableHeaderStyle);
    mortality.forEach((value, idx) => write(ws, row, idx + 1, value, cellStyle));
    row += 2;

    merge(ws, row, row, 0, 6);
    write(ws, row, 0, 'SALES DETAILS', sectionHeaderStyle);
    row += 1;

    const salesHeaders = ['SALES TO CUSTOMER', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT'];
    salesHeaders.forEach((header, idx) => write(ws, row, idx + 1, header, tableHeaderStyle));
    row += 1;

    const sales = [
      '',
      fmt(record.sales?.birds || 0, 0),
      fmt(record.sales?.weight || 0),
      fmt(record.sales?.avgWeight || 0),
      fmt(record.sales?.rate || 0),
      fmt(record.sales?.amount || 0)
    ];
    write(ws, row, 0, 'SALES TO CUSTOMER', tableHeaderStyle);
    sales.forEach((value, idx) => write(ws, row, idx + 1, value, cellStyle));
    row += 2;

    merge(ws, row, row, 0, 6);
    write(ws, row, 0, 'FINANCIAL SUMMARY', sectionHeaderStyle);
    row += 1;

    const financial = [
      ['SALES AMOUNT', fmt(record.summary?.salesAmount || 0)],
      ['PURCHASE AMOUNT', fmt(record.summary?.purchaseAmount || 0)],
      ['GROSS PROFIT', fmt(record.summary?.grossProfit || 0)],
      ['MORTALITY/W L', fmt(record.summary?.mortalityAmount || 0)],
      ['NETT PROFIT', fmt(record.summary?.netProfit || 0)],
      ['MARGINE', fmt(record.summary?.margin || 0)]
    ];

    financial.forEach(line => {
      write(ws, row, 0, line[0], tableHeaderStyle);
      write(ws, row, 1, line[1], cellStyle);
      row += 1;
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: 6 } });
    ws['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Indirect Report');
    const filename = `Indirect_Sale_Report_${record.invoiceNumber || 'NA'}_${dayjs().format('YYYYMMDD')}.xlsx`;
    XLSX.writeFile(wb, filename);
    return true;
  } catch (error) {
    console.error('Failed to generate indirect sale report', error);
    return false;
  }
};

