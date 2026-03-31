import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Calendar, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function ClosingStockMonthlySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stocks, setStocks] = useState([]);

    const urlStartDate = searchParams.get('startDate');

    const [year, setYear] = useState(() => {
        if (urlStartDate) {
            const d = new Date(urlStartDate);
            return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        }
        const today = new Date();
        return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    });

    useEffect(() => {
        fetchData();
    }, [year]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const fyEnd = `${year + 1}-03-31`;

            const res = await api.get('/inventory-stock', {
                params: { endDate: fyEnd }
            });

            if (res.data.success) {
                const relevantStocks = res.data.data.filter(s => s.inventoryType === 'bird' || s.inventoryType === 'feed');
                relevantStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setStocks(relevantStocks);
            }
        } catch (err) {
            console.error('Error fetching stocks:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const monthlyData = useMemo(() => {
        if (!stocks.length) return [];

        const fyStart = new Date(`${year}-04-01T00:00:00Z`);
        const fyEnd = new Date(`${year + 1}-03-31T23:59:59Z`);

        // Cumulative running totals (used to track closing = opening of next period)
        let cumulativeBirdPurchWeight = 0;
        let cumulativeBirdPurchAmount = 0;
        let cumulativeBirdOutWeight = 0;

        let cumulativeFeedPurchWeight = 0;
        let cumulativeFeedPurchAmount = 0;
        let cumulativeFeedOutWeight = 0;

        const stocksBeforeFY = [];
        const stocksDuringFY = [];

        // Determine anchor dates based on opening stock records
        const birdOpStocks = stocks.filter(s => s.type === 'opening' && s.inventoryType === 'bird');
        const firstBirdOpStock = birdOpStocks.length > 0
            ? birdOpStocks.sort((a, b) => new Date(a.date) - new Date(b.date))[0]
            : null;

        let birdAnchorDate = new Date(0);
        if (firstBirdOpStock) {
            const bDate = new Date(firstBirdOpStock.date);
            const bYear = bDate.getFullYear();
            const bMonth = bDate.getMonth();
            const bFyStartYear = bMonth >= 3 ? bYear : bYear - 1;
            birdAnchorDate = new Date(`${bFyStartYear}-04-01T00:00:00`);
        }

        const feedOpStocks = stocks.filter(s => s.type === 'opening' && s.inventoryType === 'feed');
        const firstFeedOpStock = feedOpStocks.length > 0
            ? feedOpStocks.sort((a, b) => new Date(a.date) - new Date(b.date))[0]
            : null;

        let feedAnchorDate = new Date(0);
        if (firstFeedOpStock) {
            const fDate = new Date(firstFeedOpStock.date);
            const fYear = fDate.getFullYear();
            const fMonth = fDate.getMonth();
            const fFyStartYear = fMonth >= 3 ? fYear : fYear - 1;
            feedAnchorDate = new Date(`${fFyStartYear}-04-01T00:00:00`);
        }

        stocks.forEach(stock => {
            const date = new Date(stock.date);

            if (stock.type === 'opening') {
                if (stock.inventoryType === 'bird') {
                    if (!firstBirdOpStock || stock._id !== firstBirdOpStock._id) return;
                } else if (stock.inventoryType === 'feed') {
                    if (!firstFeedOpStock || stock._id !== firstFeedOpStock._id) return;
                }
            } else {
                if (stock.inventoryType === 'bird' && date < birdAnchorDate) return;
                if (stock.inventoryType === 'feed' && date < feedAnchorDate) return;
            }

            if (date < fyStart) {
                stocksBeforeFY.push(stock);
            } else if (date <= fyEnd) {
                stocksDuringFY.push(stock);
            }
        });

        const processStock = (s) => {
            const type = s.type;
            const w = Number(s.weight) || 0;
            const amt = Number(s.amount) || 0;

            if (s.inventoryType === 'bird') {
                if (type === 'purchase' || type === 'opening') {
                    cumulativeBirdPurchWeight += w;
                    cumulativeBirdPurchAmount += amt;
                } else if (['sale', 'receipt', 'mortality', 'weight_loss', 'natural_weight_loss'].includes(type)) {
                    cumulativeBirdOutWeight += w;
                }
            } else if (s.inventoryType === 'feed') {
                if (type === 'purchase' || type === 'opening') {
                    cumulativeFeedPurchWeight += w;
                    cumulativeFeedPurchAmount += amt;
                } else if (['consume', 'sale', 'receipt', 'mortality', 'weight_loss', 'natural_weight_loss'].includes(type)) {
                    cumulativeFeedOutWeight += w;
                }
            }
        };

        // Apply all pre-FY stocks first (builds the initial cumulative state)
        stocksBeforeFY.forEach(processStock);

        // Build months map (Apr → Mar)
        const monthsMap = new Map();
        for (let i = 0; i < 12; i++) {
            const mDate = new Date(year, 3 + i, 1);
            const monthKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
            monthsMap.set(monthKey, {
                monthKey,
                name: mDate.toLocaleString('default', { month: 'short' }),
                year: mDate.getFullYear(),
                monthIndex: mDate.getMonth(),
                sortOrder: i,
                birdsWeight: 0,
                birdsAmount: 0,
                feedWeight: 0,
                feedAmount: 0,
                totalAmount: 0
            });
        }

        const sortedMonths = Array.from(monthsMap.values());

        sortedMonths.forEach(month => {
            // First apply ALL transactions for this month to get the CLOSING value
            const monthlyStocks = stocksDuringFY.filter(s => {
                const d = new Date(s.date);
                return d.getFullYear() === month.year && d.getMonth() === month.monthIndex;
            });

            monthlyStocks.forEach(processStock);

            // After processing this month — read the current cumulative state as CLOSING
            const birdAvgRate = cumulativeBirdPurchWeight > 0 ? (cumulativeBirdPurchAmount / cumulativeBirdPurchWeight) : 0;
            const closingBirdWeight = cumulativeBirdPurchWeight - cumulativeBirdOutWeight;
            const closingBirdAmount = closingBirdWeight * birdAvgRate;

            const feedAvgRate = cumulativeFeedPurchWeight > 0 ? (cumulativeFeedPurchAmount / cumulativeFeedPurchWeight) : 0;
            const closingFeedWeight = cumulativeFeedPurchWeight - cumulativeFeedOutWeight;
            const closingFeedAmount = closingFeedWeight * feedAvgRate;

            month.birdsWeight = closingBirdWeight;
            month.birdsAmount = closingBirdAmount;
            month.feedWeight = closingFeedWeight;
            month.feedAmount = closingFeedAmount;
            month.totalAmount = closingBirdAmount + closingFeedAmount;
        });

        sortedMonths.forEach(month => {
            month.birdsRate = month.birdsWeight ? month.birdsAmount / month.birdsWeight : 0;
            month.feedRate = month.feedWeight ? month.feedAmount / month.feedWeight : 0;
        });

        return sortedMonths;
    }, [stocks, year]);

    const handleMonthClick = (month) => {
        navigate(`/live-poultry-closing-stock/daily-summary?year=${month.year}&month=${month.monthIndex + 1}`);
    };

    const handleExportToExcel = () => {
        if (!monthlyData.length) return;

        const exportData = monthlyData.map(month => ({
            'Month': `${month.name} ${month.year}`,
            'Birds Qty (kg)': month.birdsWeight,
            'Birds Rate': month.birdsRate.toFixed(2),
            'Birds Amount': month.birdsAmount,
            'Feed Qty (kg)': month.feedWeight,
            'Feed Rate': month.feedRate.toFixed(2),
            'Feed Amount': month.feedAmount,
            'Total Amount': month.totalAmount
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Closing Stock Monthly");
        XLSX.writeFile(wb, `Live_Poultry_Closing_Stock_${year}-${year + 1}.xlsx`);
    };

    if (loading && !stocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totals = monthlyData.reduce((acc, curr) => ({
        birdsW: acc.birdsW + curr.birdsWeight,
        birdsA: acc.birdsA + curr.birdsAmount,
        feedW: acc.feedW + curr.feedWeight,
        feedA: acc.feedA + curr.feedAmount,
        totalA: acc.totalA + curr.totalAmount
    }), { birdsW: 0, birdsA: 0, feedW: 0, feedA: 0, totalA: 0 });

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
                            <Package className="w-8 h-8 text-purple-600" />
                            Live Poultry Closing Stock (Monthly)
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Monthly Closing Records for Birds and Feed Stock</p>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0 items-center">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="p-2 border border-purple-200 bg-purple-50 text-purple-800 rounded-md font-semibold focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                    >
                        {[0, 1, 2, 3, 4].map(i => {
                            const y = new Date().getFullYear() - i;
                            return <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>;
                        })}
                    </select>
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
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b-2 border-gray-300">
                        <tr>
                            <th rowSpan="2" className="py-3 px-4 border-r border-gray-300">Month</th>
                            <th colSpan="3" className="py-2 px-4 text-center border-r border-gray-300 bg-purple-50 text-purple-800">Birds Closing Stock</th>
                            <th colSpan="3" className="py-2 px-4 text-center border-r border-gray-300 bg-pink-50 text-pink-800">Feed Closing Stock</th>
                            <th rowSpan="2" className="py-3 px-4 text-center bg-blue-50 text-blue-800">Total Amount</th>
                        </tr>
                        <tr className="border-t border-gray-300">
                            <th className="py-2 px-4 bg-purple-50">Quantity (kg)</th>
                            <th className="py-2 px-4 bg-purple-50">Rate</th>
                            <th className="py-2 px-4 border-r border-gray-300 bg-purple-50">Amount</th>
                            <th className="py-2 px-4 bg-pink-50">Quantity (kg)</th>
                            <th className="py-2 px-4 bg-pink-50">Rate</th>
                            <th className="py-2 px-4 border-r border-gray-300 bg-pink-50">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {monthlyData.map((month) => (
                            <tr
                                key={month.monthKey}
                                onClick={() => handleMonthClick(month)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <td className="py-3 px-4 border-r font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    {month.name} {month.year}
                                </td>

                                <td className="py-3 px-4 text-right text-purple-700 font-medium">{month.birdsWeight ? month.birdsWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{month.birdsRate ? month.birdsRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{month.birdsAmount ? month.birdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-pink-700 font-medium">{month.feedWeight ? month.feedWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{month.feedRate ? month.feedRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{month.feedAmount ? month.feedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-blue-700 font-bold">{month.totalAmount ? month.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                        <tr>
                            <td className="py-3 px-4 border-r uppercase text-sm">Totals</td>
                            <td className="py-3 px-4 text-right text-purple-700">{totals.birdsW.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right">{totals.birdsW ? (totals.birdsA / totals.birdsW).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right border-r">{totals.birdsA.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                            <td className="py-3 px-4 text-right text-pink-700">{totals.feedW.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right">{totals.feedW ? (totals.feedA / totals.feedW).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right border-r">{totals.feedA.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                            <td className="py-3 px-4 text-right text-blue-700 font-bold">{totals.totalA.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
