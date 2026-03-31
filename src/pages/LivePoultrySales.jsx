import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, TrendingUp, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function LivePoultrySales() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // We'll store normalized sale records here
    const [saleRecords, setSaleRecords] = useState([]);

    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1; // 1-12

    useEffect(() => {
        fetchData();
    }, [year, month]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            // Get the first and last day of the selected month
            const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

            let combinedRecords = [];

            // 1. Fetch Inventory Stocks (type = 'sale')
            const invRes = await api.get('/inventory-stock', {
                params: {
                    startDate: startOfMonth,
                    endDate: endOfMonth,
                    type: 'sale'
                }
            });

            if (invRes.data.success && invRes.data.data) {
                invRes.data.data.forEach(stock => {
                    // It's a sale, so vendorId is irrelevant, we look for customerId
                    const customerName = stock.customerId?.shopName || stock.customerId?.ownerName || stock.customerId?.name || 'N/A';
                    
                    let typeLabel = 'stock sale';
                    if (stock.inventoryType === 'bird') {
                        typeLabel = 'birds stock sale';
                    } else if (stock.inventoryType === 'feed') {
                        typeLabel = 'feed stock sale';
                    }

                    const weight = Number(stock.weight) || 0;
                    const amount = Number(stock.amount) || 0;
                    const rate = Number(stock.rate) || (weight > 0 ? amount / weight : 0);

                    combinedRecords.push({
                        id: stock._id,
                        date: new Date(stock.date),
                        particular: customerName,
                        type: typeLabel,
                        quantity: weight,
                        rate: rate,
                        amount: amount
                    });
                });
            }

            // 2. Fetch Trip Sales
            let tripPage = 1;
            let tripTotalPages = 1;
            do {
                const tripsRes = await api.get('/trip', {
                    params: {
                        startDate: startOfMonth,
                        endDate: endOfMonth,
                        page: tripPage,
                        limit: 50
                    }
                });
                if (tripsRes.data.success && tripsRes.data.data && tripsRes.data.data.trips) {
                    const trips = tripsRes.data.data.trips;
                    trips.forEach(trip => {
                        if (trip.sales && Array.isArray(trip.sales)) {
                            trip.sales.forEach(sale => {
                                const customerName = sale.client?.shopName || sale.client?.ownerName || sale.client?.name || 'N/A';
                                const weight = Number(sale.weight) || 0;
                                const amount = Number(sale.amount) || 0;
                                const rate = Number(sale.rate) || 0;

                                // Note: We use the embedded timestamp if available, fallback to trip date
                                const saleDate = sale.timestamp ? new Date(sale.timestamp) : new Date(trip.date);

                                // Filter to ensure we only include sales from this exact month
                                const sYear = saleDate.getFullYear();
                                const sMonth = saleDate.getMonth() + 1;
                                
                                if (sYear === year && sMonth === month) {
                                    combinedRecords.push({
                                        id: sale._id || `${trip._id}-${Math.random()}`,
                                        date: saleDate,
                                        particular: customerName,
                                        type: 'trip sale',
                                        quantity: weight,
                                        rate: rate,
                                        amount: amount
                                    });
                                }
                            });
                        }
                    });
                    tripTotalPages = tripsRes.data.data.pagination?.pages || 1;
                } else {
                    break;
                }
                tripPage++;
            } while (tripPage <= tripTotalPages && tripPage <= 20);

            // 3. Fetch Indirect Sales (contains indirect sales)
            let indPage = 1;
            let indTotalPages = 1;
            do {
                const indRes = await api.get('/indirect-sales', {
                    params: {
                        startDate: startOfMonth,
                        endDate: endOfMonth,
                        page: indPage,
                        limit: 50
                    }
                });
                
                if (indRes.data.success && indRes.data.data) {
                    const records = indRes.data.data.records || [];
                    records.forEach(indSale => {
                        const customerName = indSale.customer?.shopName || indSale.customer?.ownerName || 'N/A';
                        
                        // IndirectSale has a single `.sales` object
                        if (indSale.sales) {
                            const weight = Number(indSale.sales.weight) || 0;
                            const amount = Number(indSale.sales.amount) || 0;
                            const rate = Number(indSale.sales.rate) || 0;

                            if (weight > 0 || amount > 0) {
                                combinedRecords.push({
                                    id: indSale._id,
                                    date: new Date(indSale.date), 
                                    particular: customerName,
                                    type: 'indirect sale',
                                    quantity: weight,
                                    rate: rate,
                                    amount: amount
                                });
                            }
                        }
                    });
                    indTotalPages = indRes.data.data.pagination?.totalPages || 1;
                } else {
                    break;
                }
                indPage++;
            } while (indPage <= indTotalPages && indPage <= 20);

            // Sort chronologically
            combinedRecords.sort((a, b) => a.date - b.date);

            setSaleRecords(combinedRecords);
        } catch (err) {
            console.error('Error fetching sales data:', err);
            setError(err.response?.data?.message || 'Failed to fetch sales data');
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = () => {
        if (!saleRecords.length) return;

        const exportData = saleRecords.map(record => ({
            'Date': record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-'),
            'Particular': record.particular,
            'Type': record.type,
            'Quantity (kg)': record.quantity,
            'Rate': record.rate.toFixed(2),
            'Amount': record.amount
        }));

        const totalQty = saleRecords.reduce((sum, r) => sum + r.quantity, 0);
        const totalAmount = saleRecords.reduce((sum, r) => sum + r.amount, 0);

        exportData.push({
            'Date': 'Total',
            'Particular': '',
            'Type': '',
            'Quantity (kg)': totalQty,
            'Rate': '',
            'Amount': totalAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Sales");
        
        const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
        XLSX.writeFile(wb, `Live_Poultry_Sales_${monthName}_${year}.xlsx`);
    };

    // Helper for changing the selected month
    const handleMonthChange = (e) => {
        const [y, m] = e.target.value.split('-');
        navigate(`/live-poultry-sales/monthly-summary?year=${y}&month=${m}`);
    };
    
    // default value for month picker YYYY-MM
    const currentMonthValue = `${year}-${String(month).padStart(2, '0')}`;

    if (loading && !saleRecords.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totalQty = saleRecords.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = saleRecords.reduce((sum, r) => sum + r.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-indigo-600" />
                            Live Poultry Birds Sales
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Monthly Summary of All Sales</p>
                </div>
                
                <div className="flex gap-3 items-center">
                    <input 
                        type="month"
                        value={currentMonthValue}
                        onChange={handleMonthChange}
                        className="p-2 border border-indigo-200 bg-indigo-50 text-indigo-800 rounded-md font-semibold focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    />
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                    >
                        <Download size={20} />
                        <span className="font-medium">Export</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-200">
                    <p>{error}</p>
                    <button onClick={fetchData} className="mt-2 text-sm font-medium underline">Retry</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b-2 border-gray-300">
                        <tr>
                            <th className="py-3 px-4 text-left border-r border-gray-300">Date</th>
                            <th className="py-3 px-4 text-left border-r border-gray-300">Particular</th>
                            <th className="py-3 px-4 border-r border-gray-300">Type</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">Quantity (kg)</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">Rate</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {saleRecords.length > 0 ? (
                            saleRecords.map((record, idx) => (
                                <tr key={record.id || idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 border-r text-left text-gray-900 whitespace-nowrap">
                                        {record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                                    </td>
                                    <td className="py-3 px-4 border-r text-left font-medium text-gray-900">
                                        {record.particular}
                                    </td>
                                    <td className="py-3 px-4 border-r text-indigo-700 font-medium">
                                        <span className="bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase text-xs">
                                            {record.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right border-r text-gray-900 font-medium">
                                        {record.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right border-r text-gray-600">
                                        {record.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-900 font-bold">
                                        {record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="py-8 text-center text-gray-500 italic">
                                    No sales records found for {new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {saleRecords.length > 0 && (
                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                            <tr>
                                <td colSpan="3" className="py-3 px-4 border-r uppercase text-sm text-right">Totals</td>
                                <td className="py-3 px-4 text-right border-r">{totalQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right border-r">
                                    {totalQty > 0 ? (totalAmount / totalQty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </td>
                                <td className="py-3 px-4 text-right text-indigo-700">
                                    {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
