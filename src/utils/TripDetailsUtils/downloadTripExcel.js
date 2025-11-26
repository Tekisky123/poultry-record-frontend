import ExcelJS from 'exceljs';

export default function downloadTripExcel(trip) {
    if (!trip) return;

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Trip Report', {
        views: [{ showGridLines: false }]
    });

    // Set column widths to match reference
    worksheet.columns = [
        { width: 9 },    // A
        { width: 4.27 },   // B
        { width: 4.91 },   // C
        { width: 6 },   // D
        { width: 2.91 },   // E
        { width: 15.18 },   // F
        { width: 6.55 },   // G
        { width: 5.73 },   // H
        { width: 6.91 },   // I
        { width: 6.45 },   // J
        { width: 6 },   // K
        { width: 7.82},   // L
        { width: 6.91 },   // M
        { width: 7.81 },   // N
        { width: 4.91 },   // O
        { width: 10 },   // P
        { width: 10 }    // Q
    ];

    // Styles
    const headerStyle = {
        font: { bold: true, size: 12 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: { top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const subHeaderStyle = {
        font: { bold: true, size: 11 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D3D3D3' } }
    };

    const totalStyle = {
        font: { bold: true, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } },
        color: { argb: 'FFFFFF' }
    };

    const yellowHighlight = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }
    };

    // PARTICULARS Section (Top section)
    worksheet.mergeCells('B1:D1');
    const particularsCell = worksheet.getCell('B1');
    particularsCell.value = 'PARTICULARS';
    particularsCell.style = { font: { bold: true, size: 14 } };

    // Row 2: DATE | VEHICLE NO | START LOCATION ( ROUTE ) | END LOCATION ( ROUTE )
    worksheet.mergeCells('A2:B2');
    worksheet.getCell('A2').value = 'DATE';
    worksheet.getCell('A2').style = subHeaderStyle;

    worksheet.mergeCells('C2:D2');
    worksheet.getCell('C2').value = new Date(trip.date || trip.createdAt).toLocaleDateString();
    worksheet.getCell('C2').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('E2:F2');
    worksheet.getCell('E2').value = 'VEHICLE NO';
    worksheet.getCell('E2').style = subHeaderStyle;

    worksheet.mergeCells('G2:H2');
    worksheet.getCell('G2').value = trip.vehicle?.vehicleNumber || 'N/A';
    worksheet.getCell('G2').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('I2:J2');
    worksheet.getCell('I2').value = 'START LOCATION (ROUTE)';
    worksheet.getCell('I2').style = subHeaderStyle;

    worksheet.mergeCells('K2:L2');
    worksheet.getCell('K2').value = trip.route?.from || 'N/A';
    worksheet.getCell('K2').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('M2:N2');
    worksheet.getCell('M2').value = 'END LOCATION (ROUTE)';
    worksheet.getCell('M2').style = subHeaderStyle;

    worksheet.mergeCells('O2:P2');
    worksheet.getCell('O2').value = trip.route?.to || 'N/A';
    worksheet.getCell('O2').style = { alignment: { horizontal: 'left' } };

    // Row 3: SUPERVISOR | DRIVER | LABOUR
    worksheet.mergeCells('A3:B3');
    worksheet.getCell('A3').value = 'SUPERVISOR';
    worksheet.getCell('A3').style = subHeaderStyle;

    worksheet.mergeCells('C3:D3');
    worksheet.getCell('C3').value = trip.supervisor?.name || 'N/A';
    worksheet.getCell('C3').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('E3:F3');
    worksheet.getCell('E3').value = 'DRIVER';
    worksheet.getCell('E3').style = subHeaderStyle;

    worksheet.mergeCells('G3:H3');
    worksheet.getCell('G3').value = trip.driver || 'N/A';
    worksheet.getCell('G3').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('I3:J3');
    worksheet.getCell('I3').value = 'LABOUR';
    worksheet.getCell('I3').style = subHeaderStyle;

    worksheet.mergeCells('K3:L3');
    worksheet.getCell('K3').value = trip.labour || 'N/A';
    worksheet.getCell('K3').style = { alignment: { horizontal: 'left' } };

    // Column headers for purchases (now at row 5 since we added row 3)
    const headers = [
        { col: 'A', value: 'S N', width: 5 },
        { col: 'B', value: 'SUPPLIERS', width: 15 },
        { col: 'D', value: 'DC NO', width: 10 },
        { col: 'F', value: 'BIRDS', width: 10 },
        { col: 'H', value: 'WEIGHT', width: 10 },
        { col: 'J', value: 'AVG', width: 10 },
        { col: 'K', value: 'RATE', width: 10 },
        { col: 'L', value: 'AMOUNT', width: 12 },
        { col: 'N', value: 'PART', width: 12 },
        { col: 'O', value: 'AMOUNT', width: 10 }
    ];

    headers.forEach(h => {
        worksheet.getCell(`${h.col}5`).value = h.value;
        worksheet.getCell(`${h.col}5`).style = subHeaderStyle;
        worksheet.getColumn(h.col).width = h.width;
    });

    // Merge cells for multi-column headers
    worksheet.mergeCells('B5:C5');
    worksheet.mergeCells('D5:E5');
    worksheet.mergeCells('F5:G5');
    worksheet.mergeCells('H5:I5');
    worksheet.mergeCells('M5:N5');

    // Add purchase data
    let currentRow = 6;
    (trip.purchases || []).forEach((purchase, index) => {
        worksheet.getCell(`A${currentRow}`).value = index + 1;
        worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = (trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-')) 
          ? 'Transferred Purchase' 
          : (purchase.supplier?.vendorName || 'N/A');

        worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
        worksheet.getCell(`D${currentRow}`).value = purchase.dcNumber || 'N/A';
        worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
        worksheet.getCell(`F${currentRow}`).value = purchase.birds || 0;
        worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
        worksheet.getCell(`H${currentRow}`).value = purchase.weight || 0;
        worksheet.getCell(`H${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`J${currentRow}`).value = purchase.weight && purchase.birds ?
            (purchase.weight / purchase.birds).toFixed(2) : '0.00';
        worksheet.getCell(`J${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`K${currentRow}`).value = purchase.rate || 0;
        worksheet.getCell(`K${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`L${currentRow}`).value = purchase.amount || 0;
        worksheet.getCell(`L${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.mergeCells(`M${currentRow}:N${currentRow}`);
        worksheet.getCell(`M${currentRow}`).value = 'SUSP';
        worksheet.getCell(`M${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.getCell(`O${currentRow}`).value = purchase.amount || 0;
        worksheet.getCell(`O${currentRow}`).style = { alignment: { horizontal: 'right' } };

        currentRow++;
    });

    // Total row for purchases
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).style = totalStyle;

    worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
    worksheet.getCell(`D${currentRow}`).style = totalStyle;

    worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
    worksheet.getCell(`F${currentRow}`).value = trip.summary?.totalBirdsPurchased || 0;
    worksheet.getCell(`F${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
    worksheet.getCell(`H${currentRow}`).value = trip.summary?.totalWeightPurchased || 0;
    worksheet.getCell(`H${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`J${currentRow}`).value = trip.summary?.totalBirdsPurchased && trip.summary?.totalWeightPurchased ?
        (trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased).toFixed(2) : '0.00';
    worksheet.getCell(`J${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`K${currentRow}`).style = totalStyle;
    worksheet.getCell(`L${currentRow}`).style = totalStyle;

    worksheet.mergeCells(`M${currentRow}:N${currentRow}`);
    worksheet.getCell(`M${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`M${currentRow}`).style = totalStyle;

    worksheet.getCell(`O${currentRow}`).value = trip.summary?.totalPurchaseAmount || 0;
    worksheet.getCell(`O${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    currentRow += 2;

    // VEHICLE EXP Section
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const vehicleExpCell = worksheet.getCell(`A${currentRow}`);
    vehicleExpCell.value = 'VEHICLE EXP';
    vehicleExpCell.style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } },
        alignment: { horizontal: 'left' }
    };
    currentRow++;

    // Vehicle exp headers
    worksheet.getCell(`A${currentRow}`).value = 'S N';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'NCRBIRDS DETAILBILL';
    worksheet.getCell(`B${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`D${currentRow}`).value = 'WEIGHT';
    worksheet.getCell(`D${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`E${currentRow}`).value = 'AVG';
    worksheet.getCell(`E${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`F${currentRow}`).value = 'RATE';
    worksheet.getCell(`F${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`G${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`G${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`H${currentRow}`).value = 'CASH';
    worksheet.getCell(`H${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`I${currentRow}`).value = 'ONLINE';
    worksheet.getCell(`I${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`J${currentRow}`).value = 'DISC';
    worksheet.getCell(`J${currentRow}`).style = subHeaderStyle;

    currentRow++;

    // Add sales data
    (trip.sales || []).forEach((sale, index) => {
        worksheet.getCell(`A${currentRow}`).value = index + 1;
        worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = sale.client?.shopName || 'N/A';

        worksheet.getCell(`D${currentRow}`).value = sale.weight || 0;
        worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`E${currentRow}`).value = sale.weight && (sale.birdsCount || sale.birds) ?
            (sale.weight / (sale.birdsCount || sale.birds)).toFixed(2) : '0.00';
        worksheet.getCell(`E${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`F${currentRow}`).value = sale.ratePerKg || sale.rate || 0;
        worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`G${currentRow}`).value = sale.totalAmount || sale.amount || 0;
        worksheet.getCell(`G${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`H${currentRow}`).value = sale.cashPayment || 0; // || (sale.paymentMode === 'cash' ? sale.amount : 0) || 0;
        worksheet.getCell(`H${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`I${currentRow}`).value = sale.onlinePayment || 0; // || (sale.paymentMode === 'online' ? sale.amount : 0) || 0;
        worksheet.getCell(`I${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`J${currentRow}`).value = sale.discount || 0;
        worksheet.getCell(`J${currentRow}`).style = { alignment: { horizontal: 'right' } };

        currentRow++;
    });

    // Total sales row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).style = { font: { bold: true } };

    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    worksheet.getCell(`B${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`D${currentRow}`).value = trip.summary?.totalWeightSold || 0;
    worksheet.getCell(`D${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.totalBirdsSold && trip.summary?.totalWeightSold ?
        (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) : '0.00';
    worksheet.getCell(`E${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = trip.summary?.averageRate || 0;
    worksheet.getCell(`F${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`G${currentRow}`).value = trip.summary?.totalSalesAmount || 0;
    worksheet.getCell(`G${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`H${currentRow}`).value = trip.summary?.totalCashPayment || 0;
    worksheet.getCell(`H${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`I${currentRow}`).value = trip.summary?.totalOnlinePayment || 0;
    worksheet.getCell(`I${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`J${currentRow}`).value = trip.summary?.totalDiscount || 0;
    worksheet.getCell(`J${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    currentRow += 2;

    // DIESEL Section
    worksheet.getCell(`A${currentRow}`).value = 'DIESEL';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = 'VOL';
    worksheet.getCell(`B${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`C${currentRow}`).value = 'RATE';
    worksheet.getCell(`C${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`D${currentRow}`).value = 'AMT';
    worksheet.getCell(`D${currentRow}`).style = subHeaderStyle;

    currentRow++;

    // Add diesel data
    if (trip.diesel?.stations) {
        trip.diesel.stations.forEach(station => {
            worksheet.getCell(`A${currentRow}`).value = getDieselStationName(station);
            worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'left' } };

            worksheet.getCell(`B${currentRow}`).value = station.volume || 0;
            worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

            worksheet.getCell(`C${currentRow}`).value = station.rate || 0;
            worksheet.getCell(`C${currentRow}`).style = { alignment: { horizontal: 'right' } };

            worksheet.getCell(`D${currentRow}`).value = station.amount || 0;
            worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

            currentRow++;
        });
    }

    // Total diesel row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`B${currentRow}`).value = trip.diesel?.totalVolume || 0;
    worksheet.getCell(`B${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = '';
    worksheet.getCell(`C${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`D${currentRow}`).value = trip.diesel?.totalAmount || 0;
    worksheet.getCell(`D${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    currentRow += 2;

    // OP READING and other metrics
    worksheet.getCell(`A${currentRow}`).value = 'OP READING';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.opening || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'CL READING';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.closing || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL RUNNING KM';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.totalDistance || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL DIESEL VOL';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.diesel?.totalVolume || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'VEHICLE AVERAGE';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.totalDistance && trip.diesel?.totalVolume ?
        (trip.vehicleReadings.totalDistance / trip.diesel.totalVolume).toFixed(2) : '0.00';
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow += 2;

    // PROFIT & LOSS SUMMARY
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const profitLossCell = worksheet.getCell(`A${currentRow}`);
    profitLossCell.value = 'PROFIT & LOSS SUMMARY';
    profitLossCell.style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } },
        alignment: { horizontal: 'left' }
    };
    currentRow++;

    // Financial breakdown
    worksheet.getCell(`A${currentRow}`).value = 'RENT AMT PER KM';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.rentPerKm || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'GROSS RENT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.totalKm ? (trip.totalKm * (trip.rentPerKm || 0)) : 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'LESS DIESEL AMT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.dieselAmount || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'NETT RENT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.totalKm ?
        ((trip.totalKm * (trip.rentPerKm || 0)) - (trip.dieselAmount || 0)) : 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'BIRDS PROFIT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.birdsProfit || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PROFIT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.tripProfit || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'PROFIT PER KG';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.totalWeightSold ?
        (trip.summary.netProfit / trip.summary.totalWeightSold).toFixed(2) : '0.00';
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow += 2;

    // WEIGHT LOSS TRACKING
    worksheet.getCell(`A${currentRow}`).value = '';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = 'BIRDS';
    worksheet.getCell(`B${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`C${currentRow}`).value = 'WEIGHT';
    worksheet.getCell(`C${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`D${currentRow}`).value = 'AVG';
    worksheet.getCell(`D${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`E${currentRow}`).value = 'RATE';
    worksheet.getCell(`E${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`F${currentRow}`).value = 'AMOUNT';
    worksheet.getCell(`F${currentRow}`).style = subHeaderStyle;

    currentRow++;

    // Death birds row
    worksheet.getCell(`A${currentRow}`).value = 'DEATH BIRDS';
    worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'left' } };

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.totalBirdsLost || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = (trip.summary?.totalWeightLost || 0).toFixed(2);
    worksheet.getCell(`C${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`D${currentRow}`).value = trip.summary?.totalBirdsPurchased > 0 ?
        ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00';
    worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.avgPurchaseRate?.toFixed(2) || 0;
    worksheet.getCell(`E${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = (trip.summary?.totalLosses || 0).toFixed(2);
    worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    // Natural weight loss row
    worksheet.getCell(`A${currentRow}`).value = 'NATURAL WEIGHT LOSS';
    worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'left' } };

    worksheet.getCell(`B${currentRow}`).value = '-';
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = trip.status === 'completed' ?
        (trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00';
    worksheet.getCell(`C${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`D${currentRow}`).value = trip.summary?.totalBirdsPurchased > 0 ?
        ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00';
    worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00';
    worksheet.getCell(`E${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = trip.status === 'completed' ?
        ((trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)).toFixed(2) : '0.00';
    worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    // Total weight loss row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL W LOSS';
    worksheet.getCell(`A${currentRow}`).style = totalStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.totalBirdsLost || 0;
    worksheet.getCell(`B${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = ((trip.summary?.totalWeightLost || 0) +
        (trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0) : 0)).toFixed(2);
    worksheet.getCell(`C${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`D${currentRow}`).value = '-';
    worksheet.getCell(`D${currentRow}`).style = totalStyle;

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00';
    worksheet.getCell(`E${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = ((trip.summary?.totalLosses || 0) +
        (trip.status === 'completed' ? ((trip.summary?.birdWeightLoss || 0) *
        (trip.summary?.avgPurchaseRate || 0)) : 0)).toFixed(2);
    worksheet.getCell(`F${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    // Add borders to all cells
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Generate Excel file
    workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = `Trip_${trip.tripId}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(blob, fileName);
    });
};