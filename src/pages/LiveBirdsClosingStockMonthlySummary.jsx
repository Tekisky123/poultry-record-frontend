import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Calendar, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function LiveBirdsClosingStockMonthlySummary() {
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
                const relevantStocks = res.data.data.filter(s => s.inventoryType === 'bird');
                relevantStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setStocks(relevantStocks);
            }
        } catch (err) {
            console.error('Error fetching bird closing stocks:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const monthlyData = useMemo(() => {
        if (!stocks.length) return [];

        const fyStart = new Date(`${year}-04-01T00:00:00Z`);
        const fyEnd   = new Date(`${year + 1}-03-31T23:59:59Z`);

        let cumulativePurchWeight = 0;
        let cumulativePurchAmount = 0;
        let cumulativePurchBirds  = 0;
        let cumulativeOutWeight   = 0;
        let cumulativeOutBirds    = 0;

        const stocksBeforeFY  = [];
        const stocksDuringFY  = [];

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
            if (date < fyStart) stocksBeforeFY.push(stock);
            else if (date <= fyEnd) stocksDuringFY.push(stock);
        });

        const processStock = (s) => {
            const w   = Number(s.weight) || 0;
            const amt = Number(s.amount) || 0;
            const b   = Number(s.birds) || 0;
            if (s.type === 'purchase' || s.type === 'opening') {
                cumulativePurchWeight += w;
                cumulativePurchAmount += amt;
                cumulativePurchBirds  += b;
            } else if (['sale', 'receipt', 'mortality', 'weight_loss', 'natural_weight_loss'].includes(s.type)) {
                cumulativeOutWeight += w;
                cumulativeOutBirds  += b;
            }
        };

        stocksBeforeFY.forEach(processStock);

        const monthsMap = new Map();
        for (let i = 0; i < 12; i++) {
            const mDate = new Date(year, 3 + i, 1);
            const monthKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
            monthsMap.set(monthKey, {
                monthKey,
                name: mDate.toLocaleString('default', { month: 'short' }),
                year: mDate.getFullYear(),
                monthIndex: mDate.getMonth(),
                birds: 0,
                weight: 0,
                amount: 0,
                rate: 0
            });
        }

        const sortedMonths = Array.from(monthsMap.values());

        sortedMonths.forEach(month => {
            const monthlyStocks = stocksDuringFY.filter(s => {
                const d = new Date(s.date);
                return d.getFullYear() === month.year && d.getMonth() === month.monthIndex;
            });
            monthlyStocks.forEach(processStock);

            const avgRate = cumulativePurchWeight > 0 ? cumulativePurchAmount / cumulativePurchWeight : 0;
            const closingWeight = cumulativePurchWeight - cumulativeOutWeight;
            const closingBirds  = cumulativePurchBirds - cumulativeOutBirds;
            const closingAmount = closingWeight * avgRate;

            month.birds  = closingBirds;
            month.weight = closingWeight;
            month.amount = closingAmount;
            month.rate   = closingWeight > 0 ? closingAmount / closingWeight : 0;
        });

        return sortedMonths;
    }, [stocks, year]);

    const handleMonthClick = (month) => {
        navigate(`/birds-closing-stock/daily-summary?year=${month.year}&month=${month.monthIndex + 1}`);
    };

    const handleExportToExcel = () => {
        if (!monthlyData.length) return;
        const exportData = monthlyData.map(m => ({
            'Month':         `${m.name} ${m.year}`,
            'No. of Birds':  m.birds,
            'Quantity (kg)': m.weight.toFixed(2),
            'Rate':          m.rate.toFixed(2),
            'Amount':        m.amount.toFixed(2)
        }));
        exportData.push({
            'Month':         'Total',
            'No. of Birds':  monthlyData.reduce((s, m) => s + m.birds, 0),
            'Quantity (kg)': monthlyData.reduce((s, m) => s + m.weight, 0).toFixed(2),
            'Rate':          '',
            'Amount':        monthlyData.reduce((s, m) => s + m.amount, 0).toFixed(2)
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Birds Closing Stock');
        XLSX.writeFile(wb, `Birds_Closing_Stock_${year}-${year + 1}.xlsx`);
    };

    if (loading && !stocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-purple-600" /></div>;

    const totalBirds  = monthlyData.reduce((s, m) => s + m.birds, 0);
    const totalWeight = monthlyData.reduce((s, m) => s + m.weight, 0);
    const totalAmount = monthlyData.reduce((s, m) => s + m.amount, 0);

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
                            Birds Closing Stock (Monthly)
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Monthly Closing Records for Live Poultry Birds Stock</p>
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
                            <th className="py-3 px-4 border-r border-gray-300">Month</th>
                            <th className="py-3 px-4 text-right border-r border-gray-300 bg-blue-50 text-blue-800">No. of Birds</th>
                            <th className="py-3 px-4 text-right border-r border-gray-300 bg-orange-50 text-orange-800">Quantity (kg)</th>
                            <th className="py-3 px-4 text-right border-r border-gray-300 bg-purple-50 text-purple-800">Rate</th>
                            <th className="py-3 px-4 text-right bg-purple-50 text-purple-800">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {monthlyData.length > 0 ? monthlyData.map(month => (
                            <tr
                                key={month.monthKey}
                                onClick={() => handleMonthClick(month)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <td className="py-3 px-4 border-r font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                    {month.name} {month.year}
                                </td>
                                <td className="py-3 px-4 text-right text-blue-700 font-medium border-r">
                                    {month.birds ? month.birds.toLocaleString('en-IN') : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-orange-700 font-medium border-r">
                                    {month.weight ? month.weight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-600 border-r">
                                    {month.rate ? month.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-800 font-medium">
                                    {month.amount ? month.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-gray-500 italic">No records found for FY {year}-{year + 1}</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                        <tr>
                            <td className="py-3 px-4 border-r uppercase text-sm">Totals</td>
                            <td className="py-3 px-4 text-right text-blue-700 border-r">{totalBirds.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right text-orange-700 border-r">{totalWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right border-r">{totalWeight > 0 ? (totalAmount / totalWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right text-purple-700">{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
