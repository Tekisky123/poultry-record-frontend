export default function extractExcelData(trip) {
    const data = trip;

    // Extract basic information
    const basic_info = {
        'DATE': data.date ? new Date(data.date).toLocaleDateString() : 'N/A',
        'VEHICLE NO': data.vehicle?.vehicleNumber || 'N/A',
        'SUPERVISOR': data.supervisor?.name || 'N/A',
        'DRIVER': data.driver || 'N/A',
        'LABOUR': data.labour || 'N/A',
        'START LOCATION (ROUTE)': data.route?.from || 'N/A',
        'END LOCATION (ROUTE)': data.route?.to || 'N/A',
    };

    // Extract expenses
    const expenses = {};
    if (data.expenses && Array.isArray(data.expenses)) {
        data.expenses.forEach(expense => {
            if (expense.category && expense.amount !== undefined) {
                expenses[expense.category.toUpperCase()] = expense.amount;
            }
        });
    }

    // Extract diesel information
    // const diesel_info = {
    //     'DIESEL': {
    //         'VOL': data.diesel?.totalVolume || 0,
    //         'RATE': data.diesel?.stations && data.diesel.stations.length > 0
    //             ? data.diesel.stations[0].rate || 0
    //             : 0,
    //         'AMT': data.diesel?.totalAmount || 0
    //     }
    // };
    const diesel_info = {
        'STATIONS': data.diesel?.stations.map(station => ({
            'NAME': station.name || station.stationName || 'N/A',
            'VOL': station.volume?.toFixed(2) || 0,
            'RATE': station?.rate?.toFixed(2) || 0,
            'AMT': station?.amount?.toFixed(2) || 0
        })) || [],
        'TOTAL_VOLUME': (data?.diesel?.totalVolume / data?.diesel?.stations?.length).toFixed(2) || 0,
        'TOTAL_RATE': (data?.diesel?.totalAmount / data?.diesel?.totalVolume).toFixed(2) || 0,
        'TOTAL_AMOUNT': data?.diesel?.totalAmount?.toFixed(2) || 0
    };

    // Extract purchases
    const purchases = (data.purchases || []).map(purchase => ({
        'DRIVER NAME': data.driver || 'N/A',
        'SUP': (data.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-'))
            ? 'Transferred Purchase'
            : (purchase.supplier?.vendorName || 'N/A'),
        'PARTICULOUR': 'PURCHASE',
        'DC NO': purchase.dcNumber || 'N/A',
        'BIRDS': purchase.birds || 0,
        'WEIGHT': purchase.weight || 0,
        'AVG': purchase.avgWeight || (purchase.weight && purchase.birds ? (purchase.weight / purchase.birds) : 0),
        'RATE': purchase.rate || 0,
        'AMOUNT': purchase.amount || 0,
        'LESS TDS': 0,
        'BALANCE': purchase.amount || 0,
        'REMARKS': ''
    }));

    // Extract sales
    const sales = (data.sales || []).map(sale => ({
        'DELIVERY DETAILS': sale.client?.shopName || 'N/A',
        'BILL NO': sale.billNumber || 'N/A',
        'BIRDS': sale.birds || sale.birdsCount || 0,
        'WEIGHT': sale.weight || 0,
        'AVG': sale.avgWeight || (sale.weight && (sale.birds || sale.birdsCount) ? (sale.weight / (sale.birds || sale.birdsCount)) : 0),
        'RATE': sale.rate || sale.ratePerKg || 0,
        'TOTAL': sale.amount || sale.totalAmount || 0,
        'CASH': sale.cashPaid || 0,
        'ONLINE': sale.onlinePaid || 0,
        'DISC': sale.discount || 0,
    }));

    const opening_closing_reading = {
        'OP READING': data.vehicleReadings?.opening || 0,
        'CL READING': data.vehicleReadings?.closing || 0,
        'TOTAL_RUNNING_KM': data.vehicleReadings?.totalDistance || 0,
        'TOTAL_DIESEL_VOL': data.diesel?.totalVolume || 0,
        'VEHICLE_AVERAGE': data.vehicleReadings?.totalDistance && data.diesel?.totalVolume ?
            (data.vehicleReadings.totalDistance / data.diesel.totalVolume).toFixed(2) : '0.00',
        
        'RENT AMT PER KM': data.rentPerKm || 0,
        'GROSS RENT': data.summary.grossRent || 0,
        'LESS DIESEL AMT': (data.summary?.totalDieselAmount || 0).toFixed(2),	
        'NETT RENT': (data.vehicleReadings?.totalDistance 
            ? ((data.vehicleReadings.totalDistance * (data.rentPerKm || 0)) - (data.summary?.totalDieselAmount || 0)) 
            : 0).toFixed(2),	
        'BIRDS PROFIT': data.summary?.birdsProfit || 0,		
        'TOTAL PROFIT': data.summary?.tripProfit || 0,	
        'PROFIT PER KG': data.summary?.totalWeightSold ? (data.summary.tripProfit / data.summary.totalWeightSold).toFixed(2) : '0.00',		

    };

    const naturalWeightLossAmount = data.status === 'completed' ? (trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0) : 0;
    const totalWeightLossKg = (data.summary?.totalWeightLost || 0) + (data.status === 'completed' ? (data.summary?.birdWeightLoss || 0) : 0);
    const mortalityAndWeightLossAmount = (data.summary?.totalLosses || 0) + naturalWeightLossAmount;

    const death_birds_loss = {
        'BIRDS': data.summary?.totalBirdsLost || 0,
        'WEIGHT': data.summary?.totalWeightLost || 0,
        'AVG': data.summary?.totalBirdsPurchased > 0 ? ((data.summary?.totalWeightPurchased / data.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00',
        'RATE': data.summary?.avgPurchaseRate?.toFixed(2) || 0,
        'AMOUNT': (data.summary?.totalLosses || 0).toFixed(2),
    };

    const natural_weight_loss = {
        'BIRDS': '-',
        'WEIGHT': data.status === 'completed' ? (data.summary?.birdWeightLoss || 0).toFixed(2) : '0.00',
        'AVG': data.summary?.totalBirdsPurchased > 0 ? ((data.summary?.totalWeightPurchased / data.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00',
        'RATE': data.summary?.avgPurchaseRate?.toFixed(2) || '0.00',
        'AMOUNT': data.status === 'completed' ? 
        ((data.summary?.birdWeightLoss || 0) * (data.summary?.avgPurchaseRate || 0)).toFixed(2) : '0.00',
    };

    const total_weight_loss = {
        'BIRDS': data.summary?.totalBirdsLost || 0,
        'WEIGHT': totalWeightLossKg.toFixed(2),
        'AVG': data.summary?.totalBirdsPurchased > 0 ? ((data.summary?.totalWeightPurchased / data.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00',
        'RATE': data.summary?.avgPurchaseRate?.toFixed(2) || '0.00',
        'AMOUNT': mortalityAndWeightLossAmount.toFixed(2),
    };

    return { basic_info, expenses, diesel_info, purchases, sales, opening_closing_reading, death_birds_loss, natural_weight_loss, total_weight_loss };
}