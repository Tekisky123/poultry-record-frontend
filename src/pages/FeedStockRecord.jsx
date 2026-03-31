import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Package, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function FeedStockRecord() {
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
            const res = await api.get('/inventory-stock', {
                params: {
                    endDate: dateParam,
                    inventoryType: 'feed'
                }
            });

            if (res.data.success) {
                const feedStocks = res.data.data.filter(s => s.inventoryType === 'feed');
                feedStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setAllStocks(feedStocks);
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

        let histPurchBags = 0, histPurchWeight = 0, histPurchAmount = 0;
        let histOutBags = 0, histOutWeight = 0, histOutAmount = 0;

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
            fyAnchorDate = new Date(`${bOpFyStartYear}-04-01T00:00:00`);
        }

        allStocks.forEach(s => {
            const d = new Date(s.date);
            const b = Number(s.bags) || 0;
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
                    histPurchBags += b;
                    histPurchWeight += w;
                    histPurchAmount += amt;
                } else if (s.type === 'consume') {
                    histOutBags += b;
                    histOutWeight += w;
                    histOutAmount += amt;
                }
            } else if (d >= targetDateStart && d <= targetDateEnd) {
                todayStocks.push(s);
            }
        });

        // 1. Calculate OP Stock
        const opBags = histPurchBags - histOutBags;
        const opWeight = histPurchWeight - histOutWeight;
        const opAmount = histPurchAmount - histOutAmount;
        const opRate = opWeight > 0 ? (opAmount / opWeight) : 0;

        // 2. Separate today's stocks
        const purchases = todayStocks.filter(s => s.type === 'purchase' || s.type === 'opening');
        const consumes = todayStocks.filter(s => s.type === 'consume');

        // 3. Today cumulative
        const todayPurchBags = purchases.reduce((sum, s) => sum + (Number(s.bags) || 0), 0);
        const todayPurchWeight = purchases.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
        const todayPurchAmount = purchases.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const todayConsBags = consumes.reduce((sum, s) => sum + (Number(s.bags) || 0), 0);
        const todayConsWeight = consumes.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
        const todayConsAmount = consumes.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        // 4. Calculate Gross Purchases (OP + Purchases)
        const grossPurchBags = opBags + todayPurchBags;
        const grossPurchWeight = opWeight + todayPurchWeight;
        const grossPurchAmount = opAmount + todayPurchAmount;
        const grossPurchRate = grossPurchWeight > 0 ? (grossPurchAmount / grossPurchWeight) : 0;

        // 5. Calculate Closing Stock
        const closingBags = grossPurchBags - todayConsBags;
        const closingWeight = grossPurchWeight - todayConsWeight;
        const closingAmount = grossPurchAmount - todayConsAmount;
        const closingRate = closingWeight > 0 ? (closingAmount / closingWeight) : 0;

        return {
            opBags, opWeight, opRate, opAmount,
            purchases, consumes,
            closingBags, closingWeight, closingRate, closingAmount
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
            Bags: calculatedData.opBags,
            'Quantity (kg)': calculatedData.opWeight.toFixed(2),
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
                Bags: Number(s.bags) || 0,
                'Quantity (kg)': (Number(s.weight) || 0).toFixed(2),
                Rate: (Number(s.rate) || 0).toFixed(2),
                Amount: (Number(s.amount) || 0).toFixed(2)
            });
        });

        // Consumes
        calculatedData.consumes.forEach(s => {
            const particular = s.customerId?.shopName || s.customerId?.ownerName || s.customerId?.name || s.vendorId?.vendorName || '-';
            exportData.push({
                Date: new Date(s.date).toLocaleDateString('en-GB'),
                Particular: particular,
                Type: s.type.toUpperCase(),
                Invoices: s.refNo || s.billNumber || '-',
                Bags: Number(s.bags) || 0,
                'Quantity (kg)': (Number(s.weight) || 0).toFixed(2),
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
            Bags: calculatedData.closingBags,
            'Quantity (kg)': calculatedData.closingWeight.toFixed(2),
            Rate: calculatedData.closingRate.toFixed(2),
            Amount: calculatedData.closingAmount.toFixed(2)
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Feed Stock Records");
        XLSX.writeFile(wb, `Feed_Stock_Records_${dateParam}.xlsx`);
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
                            Feed Stock Records
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Detailed transactions for {dateParam} (Feed)</p>
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
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed bg-green-50">Bags</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed bg-green-50">Quantity (kg)</th>
                                <th className="py-3 px-4 border-r border-gray-300 border-dashed bg-green-50">Rate</th>
                                <th className="py-3 px-4 bg-green-50">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 divide-dashed">
                            {/* OP STOCK */}
                            <tr className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed">-</td>
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-400">-</td>
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed text-blue-600 font-medium tracking-wide">OP</td>
                                <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-500">-</td>
                                <td className="py-3 px-4 text-center border-r border-gray-300 border-dashed font-medium">{calculatedData.opBags}</td>
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
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed uppercase text-green-700 font-medium tracking-wide text-xs">FEED PURCHASE</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-700">{s.refNo || s.billNumber || '-'}</td>
                                    <td className="py-3 px-4 text-center border-r border-gray-300 border-dashed">{Number(s.bags || 0)}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.weight || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right">{Number(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                                )
                            })}

                            {/* CONSUMES */}
                            {calculatedData.consumes.map((s, i) => {
                                const particular = s.customerId?.shopName || s.customerId?.ownerName || s.customerId?.name || s.vendorId?.vendorName || '-';
                                return (
                                <tr key={s._id || `out-${i}`} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed whitespace-nowrap">{new Date(s.date).toLocaleDateString('en-GB')}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-left font-medium text-gray-900">{particular}</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed uppercase text-red-700 font-medium tracking-wide text-xs">FEED CONSUME</td>
                                    <td className="py-3 px-4 border-r border-gray-300 border-dashed text-gray-700">{s.refNo || s.billNumber || '-'}</td>
                                    <td className="py-3 px-4 text-center border-r border-gray-300 border-dashed">{Number(s.bags || 0)}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.weight || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right border-r border-gray-300 border-dashed">{Number(s.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right">{Number(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-400">
                            {/* SPACER */}
                            <tr>
                                <td colSpan="8" className="py-2"></td>
                            </tr>
                            <tr className="border-[2px] border-b border-gray-900 font-bold text-gray-900 border-dashed bg-orange-50">
                                <td colSpan="4" className="py-4 px-4 text-center uppercase tracking-widest border-r border-gray-300 border-dashed">Closing Stock</td>
                                <td className="py-4 px-4 text-center border-r border-gray-300 border-dashed text-blue-800">{calculatedData.closingBags}</td>
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
