import * as XLSX from 'xlsx';

// Helper function to format date as DD-MMM-YY
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        return `${day}-${month}-${year}`;
    } catch (error) {
        return dateString;
    }
};

export const downloadVendorLedgerExcel = (ledgerData, vendorName) => {
    try {
        // Prepare data for Excel export
        const excelData = ledgerData.map((entry) => {
            // Handle Opening Balance row specifically if needed, or just map it
            const isOpening = entry.type === 'OPENING';

            const isDebit = entry.amountType === 'debit';
            const isCredit = entry.type === 'PURCHASE' || entry.amountType === 'credit';

            return {
                'Lifting Date': formatDate(entry.liftingDate || entry.date),
                'Delivery Date': isOpening ? '-' : formatDate(entry.deliveryDate),
                'Vehicle No': entry.vehicleNo || '-',
                'Driver Name': entry.driverName || '-',
                'Supervisor': entry.supervisor || '-',
                'Particulars': entry.particulars || '',
                'DC NO': entry.dcNumber || '-',
                'Birds': isOpening ? '-' : (entry.birds || 0),
                'Weight': isOpening ? '-' : (Number(entry.weight) || 0),
                'Avg': isOpening ? '-' : (Number(entry.avgWeight) || 0),
                'Rate': isOpening ? '-' : (Number(entry.rate) || 0),
                'Debit': (isOpening || !isDebit) ? '-' : (Number(entry.amount) || 0),
                'Credit': (isOpening || !isCredit) ? '-' : (Number(entry.amount) || 0),
                'Less TDS': isOpening ? '-' : (Number(entry.lessTDS) || 0),
                'Balance': (Number(entry.balance) || 0),
                'Trip ID': entry.tripId || '-',
                'Voucher No': entry.voucherNo || '-'
            };
        });

        const columnHeaders = [
            'Lifting Date',
            'Delivery Date',
            'Vehicle No',
            'Driver Name',
            'Supervisor',
            'Particulars',
            'DC NO',
            'Birds',
            'Weight',
            'Avg',
            'Rate',
            'Debit',
            'Credit',
            'Less TDS',
            'Balance',
            'Trip ID',
            'Voucher No'
        ];

        // Calculate totals from ledgerData (excluding Opening Balance for sums)
        const transactionEntries = ledgerData.filter(entry => entry.type !== 'OPENING');

        const totalBirds = transactionEntries.reduce((sum, entry) => sum + (entry.birds || 0), 0);
        const totalWeight = transactionEntries.reduce((sum, entry) => sum + (Number(entry.weight) || 0), 0);
        const totalDebit = transactionEntries.reduce((sum, entry) => {
            const isDebit = entry.amountType === 'debit';
            return sum + (isDebit ? (Number(entry.amount) || 0) : 0);
        }, 0);
        const totalCredit = transactionEntries.reduce((sum, entry) => {
            const isCredit = entry.type === 'PURCHASE' || entry.amountType === 'credit';
            return sum + (isCredit ? (Number(entry.amount) || 0) : 0);
        }, 0);
        const totalLessTDS = transactionEntries.reduce((sum, entry) => sum + (Number(entry.lessTDS) || 0), 0);

        // Balance total doesn't make sense, it's a running balance. 
        // The last row's balance is the final balance.
        const lastBalance = ledgerData.length > 0
            ? ledgerData[ledgerData.length - 1].balance || 0
            : 0;

        const totals = {
            'Lifting Date': 'TOTAL',
            'Delivery Date': '',
            'Vehicle No': '',
            'Driver Name': '',
            'Supervisor': '',
            'Particulars': '',
            'DC NO': '',
            'Birds': totalBirds,
            'Weight': totalWeight,
            'Avg': '',
            'Rate': '',
            'Debit': totalDebit,
            'Credit': totalCredit,
            'Less TDS': totalLessTDS,
            'Balance': lastBalance,
            'Trip ID': '',
            'Voucher No': ''
        };

        const dataRows = excelData.map((row) =>
            columnHeaders.map((header) => (row[header] !== undefined ? row[header] : ''))
        );

        const totalsRow = columnHeaders.map((header) =>
            totals[header] !== undefined ? totals[header] : ''
        );

        const aoa = [columnHeaders, ...dataRows, totalsRow];

        // Create workbook and worksheet
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Vendor Ledger');

        // Set column widths
        const colWidths = [
            { wch: 12 }, // Lifting Date
            { wch: 12 }, // Delivery Date
            { wch: 12 }, // Vehicle No
            { wch: 20 }, // Driver Name
            { wch: 15 }, // Supervisor
            { wch: 20 }, // Particulars
            { wch: 10 }, // DC NO
            { wch: 10 }, // Birds
            { wch: 12 }, // Weight
            { wch: 8 },  // Avg
            { wch: 10 }, // Rate
            { wch: 12 }, // Debit
            { wch: 12 }, // Credit
            { wch: 12 }, // Less TDS
            { wch: 15 }, // Balance
            { wch: 15 }, // Trip ID
            { wch: 15 }  // Voucher No
        ];
        ws['!cols'] = colWidths;

        // Style the header row
        // Note: Simple objects for styling work with SheetJS Pro, 
        // but basic CE version ignores 's' property. 
        // Assuming the project uses a version that supports it or just providing structural data.
        // If styling doesn't work, at least data is there.

        // Generate filename with current date
        const currentDate = new Date();
        const dateStr = currentDate.toLocaleDateString('en-GB').replace(/\//g, '');
        const filename = `${vendorName}_Vendor_Ledger_${dateStr}.xlsx`;

        // Download the file
        XLSX.writeFile(wb, filename);

        return true;
    } catch (error) {
        console.error('Error generating Excel file:', error);
        return false;
    }
};
