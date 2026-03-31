import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Calendar, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function ClosingStockDailySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stocks, setStocks] = useState([]);

    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1; // 1-12

    useEffect(() => {
        fetchData();
    }, [year, month]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);
            const endDateFormatted = endOfMonth.toISOString().split('T')[0];

            const res = await api.get('/inventory-stock', {
                params: { endDate: endDateFormatted }
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

    const dailyData = useMemo(() => {
        if (!stocks.length) return [];

        const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const daysInMonth = endOfMonth.getDate();

        let cumulativeBirdPurchWeight = 0;
        let cumulativeBirdPurchAmount = 0;
        let cumulativeBirdOutWeight = 0;

        let cumulativeFeedPurchWeight = 0;
        let cumulativeFeedPurchAmount = 0;
        let cumulativeFeedOutWeight = 0;

        const stocksBeforeMonth = [];
        const stocksDuringMonth = [];

        // Anchor dates via opening stocks
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

            if (date < startOfMonth) {
                stocksBeforeMonth.push(stock);
            } else if (date <= endOfMonth) {
                stocksDuringMonth.push(stock);
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

        // Apply all pre-month stocks first
        stocksBeforeMonth.forEach(processStock);

        // Build days map for the month
        const daysMap = new Map();
        for (let i = 1; i <= daysInMonth; i++) {
            const dDate = new Date(year, month - 1, i);
            const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            daysMap.set(dayKey, {
                dayKey,
                date: dDate,
                dayNum: i,
                birdsWeight: 0,
                birdsAmount: 0,
                birdsRate: 0,
                feedWeight: 0,
                feedAmount: 0,
                feedRate: 0,
                totalAmount: 0
            });
        }

        const sortedDays = Array.from(daysMap.values());

        sortedDays.forEach(day => {
            // Process all transactions for this day first
            const dailyStocks = stocksDuringMonth.filter(s => {
                const d = new Date(s.date);
                return d.getDate() === day.dayNum;
            });

            dailyStocks.forEach(processStock);

            // CLOSING = state AFTER applying all of today's transactions
            const birdAvgRate = cumulativeBirdPurchWeight > 0 ? (cumulativeBirdPurchAmount / cumulativeBirdPurchWeight) : 0;
            const closingBirdWeight = cumulativeBirdPurchWeight - cumulativeBirdOutWeight;
            const closingBirdAmount = closingBirdWeight * birdAvgRate;

            const feedAvgRate = cumulativeFeedPurchWeight > 0 ? (cumulativeFeedPurchAmount / cumulativeFeedPurchWeight) : 0;
            const closingFeedWeight = cumulativeFeedPurchWeight - cumulativeFeedOutWeight;
            const closingFeedAmount = closingFeedWeight * feedAvgRate;

            day.birdsWeight = closingBirdWeight;
            day.birdsAmount = closingBirdAmount;
            day.birdsRate = birdAvgRate;

            day.feedWeight = closingFeedWeight;
            day.feedAmount = closingFeedAmount;
            day.feedRate = feedAvgRate;

            day.totalAmount = closingBirdAmount + closingFeedAmount;
        });

        return sortedDays;
    }, [stocks, year, month]);

    const handleExportToExcel = () => {
        if (!dailyData.length) return;

        const exportData = dailyData.map(day => ({
            'Date': day.dayKey,
            'Birds Closing Qty (kg)': day.birdsWeight,
            'Birds Rate': day.birdsRate.toFixed(2),
            'Birds Closing Amount': day.birdsAmount,
            'Feed Closing Qty (kg)': day.feedWeight,
            'Feed Rate': day.feedRate.toFixed(2),
            'Feed Closing Amount': day.feedAmount,
            'Total Closing Amount': day.totalAmount
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Closing Stock Daily");
        XLSX.writeFile(wb, `Live_Poultry_Closing_Stock_${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading && !stocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totals = dailyData.reduce((acc, curr) => ({
        birdsW: acc.birdsW + curr.birdsWeight,
        birdsA: acc.birdsA + curr.birdsAmount,
        feedW: acc.feedW + curr.feedWeight,
        feedA: acc.feedA + curr.feedAmount,
        totalA: acc.totalA + curr.totalAmount
    }), { birdsW: 0, birdsA: 0, feedW: 0, feedA: 0, totalA: 0 });

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

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
                            Live Poultry Closing Stock (Daily)
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Daily Closing Records for {monthName} {year}</p>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b-2 border-gray-300">
                        <tr>
                            <th rowSpan="2" className="py-3 px-4 border-r border-gray-300">Date</th>
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
                        {dailyData.map((day) => (
                            <tr key={day.dayKey} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 border-r font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    {day.dayNum} {monthName.slice(0, 3)}
                                </td>

                                <td className="py-3 px-4 text-right text-purple-700 font-medium">{day.birdsWeight ? day.birdsWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{day.birdsRate ? day.birdsRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{day.birdsAmount ? day.birdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-pink-700 font-medium">{day.feedWeight ? day.feedWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{day.feedRate ? day.feedRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{day.feedAmount ? day.feedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-blue-700 font-bold">{day.totalAmount ? day.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                        <tr>
                            <td className="py-3 px-4 border-r uppercase text-sm">Last Day Closing</td>
                            <td className="py-3 px-4 text-right text-purple-700">{dailyData.length ? dailyData[dailyData.length - 1].birdsWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right">{dailyData.length ? dailyData[dailyData.length - 1].birdsRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right border-r">{dailyData.length ? dailyData[dailyData.length - 1].birdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>

                            <td className="py-3 px-4 text-right text-pink-700">{dailyData.length ? dailyData[dailyData.length - 1].feedWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right">{dailyData.length ? dailyData[dailyData.length - 1].feedRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right border-r">{dailyData.length ? dailyData[dailyData.length - 1].feedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>

                            <td className="py-3 px-4 text-right text-blue-700 font-bold">{dailyData.length ? dailyData[dailyData.length - 1].totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
