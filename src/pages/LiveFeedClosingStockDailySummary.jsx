import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Calendar, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function LiveFeedClosingStockDailySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stocks, setStocks] = useState([]);

    const year  = Number(searchParams.get('year'))  || new Date().getFullYear();
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
                const relevantStocks = res.data.data.filter(s => s.inventoryType === 'feed');
                relevantStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setStocks(relevantStocks);
            }
        } catch (err) {
            console.error('Error fetching feed closing stocks:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const dailyData = useMemo(() => {
        if (!stocks.length) return [];

        const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
        const endOfMonth   = new Date(year, month, 0, 23, 59, 59);
        const daysInMonth  = endOfMonth.getDate();

        let cumulativePurchWeight = 0;
        let cumulativePurchAmount = 0;
        let cumulativeOutWeight   = 0;

        const stocksBeforeMonth = [];
        const stocksDuringMonth = [];

        const opStocks = stocks.filter(s => s.type === 'opening');
        const firstOpStock = opStocks.length > 0
            ? opStocks.sort((a, b) => new Date(a.date) - new Date(b.date))[0]
            : null;

        let anchorDate = new Date(0);
        if (firstOpStock) {
            const d = new Date(firstOpStock.date);
            anchorDate = new Date(`${firstOpStock.date.split('T')[0]}T00:00:00`);
        }

        stocks.forEach(stock => {
            const date = new Date(stock.date);
            if (stock.type === 'opening') {
                if (!firstOpStock || stock._id !== firstOpStock._id) return;
            } else {
                if (date < anchorDate) return;
            }
            if (date < startOfMonth) stocksBeforeMonth.push(stock);
            else if (date <= endOfMonth) stocksDuringMonth.push(stock);
        });

        const processStock = (s) => {
            const w   = Number(s.weight) || 0;
            const amt = Number(s.amount) || 0;
            if (s.type === 'purchase' || s.type === 'opening') {
                cumulativePurchWeight += w;
                cumulativePurchAmount += amt;
            } else if (['consume', 'sale', 'receipt', 'mortality', 'weight_loss', 'natural_weight_loss'].includes(s.type)) {
                cumulativeOutWeight += w;
            }
        };

        stocksBeforeMonth.forEach(processStock);

        const daysMap = new Map();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            daysMap.set(dayKey, { dayKey, dayNum: i, weight: 0, amount: 0, rate: 0 });
        }

        const sortedDays = Array.from(daysMap.values());

        sortedDays.forEach(day => {
            const dailyStocks = stocksDuringMonth.filter(s => new Date(s.date).getDate() === day.dayNum);
            dailyStocks.forEach(processStock);

            const avgRate       = cumulativePurchWeight > 0 ? cumulativePurchAmount / cumulativePurchWeight : 0;
            const closingWeight = cumulativePurchWeight - cumulativeOutWeight;
            const closingAmount = closingWeight * avgRate;

            day.weight = closingWeight;
            day.amount = closingAmount;
            day.rate   = closingWeight > 0 ? closingAmount / closingWeight : 0;
        });

        return sortedDays;
    }, [stocks, year, month]);

    const handleExportToExcel = () => {
        if (!dailyData.length) return;
        const exportData = dailyData.map(d => ({
            'Date':          d.dayKey,
            'Quantity (kg)': d.weight.toFixed(2),
            'Rate':          d.rate.toFixed(2),
            'Amount':        d.amount.toFixed(2)
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Feed Closing Stock');
        XLSX.writeFile(wb, `Feed_Closing_Stock_${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading && !stocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-pink-600" /></div>;

    const totalWeight = dailyData.reduce((s, d) => s + d.weight, 0);
    const totalAmount = dailyData.reduce((s, d) => s + d.amount, 0);
    const monthName   = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

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
                            <Package className="w-8 h-8 text-pink-600" />
                            Feed Closing Stock (Daily)
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
                            <th className="py-3 px-4 border-r border-gray-300">Date</th>
                            <th className="py-3 px-4 text-right border-r border-gray-300 bg-pink-50 text-pink-800">Quantity (kg)</th>
                            <th className="py-3 px-4 text-right border-r border-gray-300 bg-pink-50 text-pink-800">Rate</th>
                            <th className="py-3 px-4 text-right bg-pink-50 text-pink-800">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {dailyData.length > 0 ? dailyData.map(day => (
                            <tr key={day.dayKey} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 border-r font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-pink-500" />
                                    {day.dayNum} {monthName.slice(0, 3)}
                                </td>
                                <td className="py-3 px-4 text-right text-pink-700 font-medium border-r">
                                    {day.weight ? day.weight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-600 border-r">
                                    {day.rate ? day.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-800 font-medium">
                                    {day.amount ? day.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-gray-500 italic">No records found for {monthName} {year}</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                        <tr>
                            <td className="py-3 px-4 border-r uppercase text-sm">Totals</td>
                            <td className="py-3 px-4 text-right text-pink-700 border-r">{totalWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right border-r">{totalWeight > 0 ? (totalAmount / totalWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right text-pink-700">{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
