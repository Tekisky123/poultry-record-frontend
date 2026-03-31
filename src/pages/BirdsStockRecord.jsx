import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Package, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function BirdsStockRecord() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allStocks, setAllStocks] = useState([]);

    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchData();
    }, [dateParam]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch everything up to the chosen date to calculate running OP STOCK
            const res = await api.get('/inventory-stock', {
                params: {
                    endDate: dateParam
                }
            });

            if (res.data.success) {
                const birdStocks = res.data.data.filter(s => s.inventoryType === 'bird');
                birdStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setAllStocks(birdStocks);
            }
        } catch (err) {
            console.error('Error fetching final records:', err);
            setError(err.response?.data?.message || 'Failed to fetch the final records.');
        } finally {
            setLoading(false);
        }
    };

    const calculatedData = useMemo(() => {
        if (!allStocks.length || !dateParam) return null;

        const [y, m, dParam] = dateParam.split('-');
        const targetDateStart = new Date(y, m - 1, dParam, 0, 0, 0);
        const targetDateEnd = new Date(y, m - 1, dParam, 23, 59, 59, 999);

        let histPurchWeight = 0, histPurchAmount = 0;
        let histOutWeight = 0;

        const todayStocks = [];

        const opStocks = allStocks.filter(s => s.type === 'opening');
        const firstOpStock = opStocks.length > 0
            ? opStocks.sort((a, b) => new Date(a.date) - new Date(b.date))[0]
            : null;

        let fyAnchorDate = new Date(0);
        if (firstOpStock) {
            const bOpDate = new Date(firstOpStock.date);
            const bOpYear = bOpDate.getFullYear();
            const bOpMonth = bOpDate.getMonth();
            const bOpFyStartYear = bOpMonth >= 3 ? bOpYear : bOpYear - 1;
            // Using local time exactly like ManageStocks
            fyAnchorDate = new Date(`${bOpFyStartYear}-04-01T00:00:00`);
        }

        allStocks.forEach(s => {
            const d = new Date(s.date);
            const w = Number(s.weight) || 0;
            const amt = Number(s.amount) || 0;

            if (s.type === 'opening') {
                if (!firstOpStock || s._id !== firstOpStock._id) return;
            } else {
                if (d < fyAnchorDate) return;
            }

            if (d < targetDateStart) {
                // Historical
                if (s.type === 'purchase' || s.type === 'opening') {
                    histPurchWeight += w;
                    histPurchAmount += amt;
                } else if (['sale', 'receipt', 'mortality', 'weight_loss', 'natural_weight_loss'].includes(s.type)) {
                    histOutWeight += w;
                }
            } else if (d >= targetDateStart && d <= targetDateEnd) {
                todayStocks.push(s);
            }
        });

        // 1. Calculate OP Stock
        const avgHistRate = histPurchWeight > 0 ? (histPurchAmount / histPurchWeight) : 0;
        const opWeight = histPurchWeight - histOutWeight;
        const opAmount = opWeight * avgHistRate;
        const opRate = avgHistRate;

        // 2. Separate today's stocks
        const purchases = todayStocks.filter(s => s.type === 'purchase' || s.type === 'opening');
        const sales = todayStocks.filter(s => s.type === 'sale' || s.type === 'receipt');
        const others = todayStocks.filter(s => s.type === 'mortality' || s.type === 'weight_loss' || s.type === 'natural_weight_loss');

        // 3. Today cumulative
        const todayPurchWeight = purchases.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
        const todayPurchAmount = purchases.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const todaySaleWeight = sales.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
        const todayOtherWeight = others.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

        // 4. Calculate Gross Purchases (OP + Purchases)
        const grossPurchWeight = opWeight + todayPurchWeight;
        const grossPurchAmount = opAmount + todayPurchAmount;
        const grossPurchRate = grossPurchWeight > 0 ? (grossPurchAmount / grossPurchWeight) : 0;

        // 5. Calculate Closing Stock
        const closingWeight = grossPurchWeight - todaySaleWeight - todayOtherWeight;
        const closingRate = grossPurchRate;
        const closingAmount = closingWeight * closingRate;

        return {
            opWeight, opRate, opAmount,
            purchases, sales, others,
            closingWeight, closingRate, closingAmount
        };
    }, [allStocks, dateParam]);

    const handleExportToExcel = () => {
        if (!calculatedData) return;

        const exportData = [];

        // OP
        exportData.push({
            Date: '-',
            Particular: '-',
            Type: 'OP',
            Invoices: '-',
            'Quantity (kg)': calculatedData.opWeight,
            Rate: calculatedData.opRate.toFixed(2),
            Amount: calculatedData.opAmount.toFixed(2)
        });

        // Purchases
        calculatedData.purchases.forEach(s => {
            const particular = s.vendorId?.vendorName || s.vendorId?.name || s.vendorId?.companyName || s.customerId?.shopName || s.customerId?.ownerName || '-';
            exportData.push({
                Date: new Date(s.date).toLocaleDateString('en-GB'),
                Particular: particular,
                Type: s.type.toUpperCase(),
                Invoices: s.refNo || s.billNumber || '-',
                'Quantity (kg)': Number(s.weight) || 0,
                Rate: (Number(s.rate) || 0).toFixed(2),
                Amount: (Number(s.amount) || 0).toFixed(2)
            });
        });

        // Sales
        calculatedData.sales.forEach(s => {
            const particular = s.customerId?.shopName || s.customerId?.ownerName || s.customerId?.name || s.vendorId?.vendorName || '-';
            exportData.push({
                Date: new Date(s.date).toLocaleDateString('en-GB'),
                Particular: particular,
                Type: s.type.toUpperCase(),
                Invoices: s.refNo || s.billNumber || '-',
                'Quantity (kg)': Number(s.weight) || 0,
                Rate: (Number(s.rate) || 0).toFixed(2),
                Amount: (Number(s.amount) || 0).toFixed(2)
            });
        });

        // Closing
        exportData.push({
            Date: '-',
            Particular: '-',
            Type: 'CLOSING STOCK',
            Invoices: '-',
            'Quantity (kg)': calculatedData.closingWeight,
            Rate: calculatedData.closingRate.toFixed(2),
            Amount: calculatedData.closingAmount.toFixed(2)
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birds Stock Records");
        XLSX.writeFile(wb, `Birds_Stock_Records_${dateParam}.xlsx`);
    };

    if (loading && !allStocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            Birds Stock Records
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Detailed transactions for {dateParam}</p>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0">
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

            {calculatedData && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300 border-dashed">
                            <tr>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed">Date</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed">Particular</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed">Type</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed">Invoices</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed">Quantity (kg)</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed">Rate</th>
                                <th className="py-3 px-4">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 divide-dashed">
                            {/* OP STOCK */}
                            <tr className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed">-</td>
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-400">-</td>
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed text-blue-600 font-medium tracking-wide">OP</td>
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-500">-</td>
                                <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed font-medium">{calculatedData.opWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{calculatedData.opRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right font-medium">{calculatedData.opAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>

                            {/* PURCHASES */}
                            {calculatedData.purchases.map((s, i) => {
                                const particular = s.vendorId?.vendorName || s.vendorId?.name || s.vendorId?.companyName || s.customerId?.shopName || s.customerId?.ownerName || '-';
                                return (
                                <tr key={s._id || i} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed whitespace-nowrap">{new Date(s.date).toLocaleDateString('en-GB')}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-left font-medium text-gray-900">{particular}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed uppercase text-green-700 font-medium tracking-wide">{s.type}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-700">{s.refNo || s.billNumber || '-'}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.weight || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right">{Number(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                                )
                            })}

                            {/* SALES */}
                            {calculatedData.sales.map((s, i) => {
                                const particular = s.customerId?.shopName || s.customerId?.ownerName || s.customerId?.name || s.vendorId?.vendorName || '-';
                                return (
                                <tr key={s._id || `out-${i}`} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed whitespace-nowrap">{new Date(s.date).toLocaleDateString('en-GB')}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-left font-medium text-gray-900">{particular}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed uppercase text-red-700 font-medium tracking-wide text-xs">{s.type.replace('_', ' ')}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-700">{s.refNo || s.billNumber || '-'}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.weight || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right">{Number(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            {/* SPACER */}
                            <tr>
                                <td colSpan="7" className="py-2 border-t border-gray-400"></td>
                            </tr>
                            <tr className="border-t border-b border-gray-400 font-bold text-gray-900 border-dashed">
                                <td colSpan="4" className="py-4 px-4 text-center uppercase tracking-widest border-r border-gray-300 border-dashed">Closing Stock</td>
                                <td className="py-4 px-4 text-right border-r border-gray-300 border-dashed text-blue-800">{calculatedData.closingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 px-4 text-right border-r border-gray-300 border-dashed text-blue-800">{calculatedData.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-4 px-4 text-right text-blue-800 text-lg">{calculatedData.closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
