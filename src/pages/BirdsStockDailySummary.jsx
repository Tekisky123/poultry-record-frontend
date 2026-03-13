import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, ArrowLeft, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function BirdsStockDailySummary() {
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
            // End of the selected month
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);
            // Convert to format like 'YYYY-MM-DD'
            const endDateFormatted = endOfMonth.toISOString().split('T')[0];

            // Fetch ALL stocks up to the end of the selected month
            const res = await api.get('/inventory-stock', {
                params: {
                    endDate: endDateFormatted
                }
            });

            if (res.data.success) {
                const birdStocks = res.data.data.filter(s => s.inventoryType === 'bird');
                birdStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setStocks(birdStocks);
            }
        } catch (err) {
            console.error('Error fetching bird stocks:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const dailyData = useMemo(() => {
        if (!stocks.length) return [];

        // Month is 1-indexed, JS Date is 0-indexed
        const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const daysInMonth = endOfMonth.getDate();

        let cumulativePurchWeight = 0;
        let cumulativePurchAmount = 0;
        let cumulativeOutWeight = 0;

        const stocksBeforeMonth = [];
        const stocksDuringMonth = [];

        const opStocks = stocks.filter(s => s.type === 'opening');
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

        stocks.forEach(stock => {
            const date = new Date(stock.date);

            if (stock.type === 'opening') {
                if (!firstOpStock || stock._id !== firstOpStock._id) return;
            } else {
                if (date < fyAnchorDate) return;
            }

            if (date < startOfMonth) {
                stocksBeforeMonth.push(stock);
            } else if (date <= endOfMonth) {
                stocksDuringMonth.push(stock);
            }
        });

        // Calculate cumulative history up to start of the month
        stocksBeforeMonth.forEach(s => {
            const type = s.type;
            const w = Number(s.weight) || 0;
            const amt = Number(s.amount) || 0;

            if (type === 'purchase' || type === 'opening') {
                cumulativePurchWeight += w;
                cumulativePurchAmount += amt;
            } else if (['sale', 'receipt', 'mortality', 'weight_loss', 'natural_weight_loss'].includes(type)) {
                cumulativeOutWeight += w;
            }
        });

        const daysMap = new Map();
        for (let i = 1; i <= daysInMonth; i++) {
            const dDate = new Date(year, month - 1, i);
            const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            daysMap.set(dayKey, {
                dayKey,
                date: dDate,
                dayNum: i,
                inwardWeight: 0,
                inwardAmount: 0,
                outwardWeight: 0,
                outwardAmount: 0,
                openingWeight: 0,
                openingAmount: 0,
                closingWeight: 0,
                closingAmount: 0
            });
        }

        const sortedDays = Array.from(daysMap.values());

        sortedDays.forEach(day => {
            const prevAvgRate = cumulativePurchWeight > 0 ? (cumulativePurchAmount / cumulativePurchWeight) : 0;
            const currentOpeningWeight = cumulativePurchWeight - cumulativeOutWeight;
            const currentOpeningAmount = currentOpeningWeight * prevAvgRate;

            day.openingWeight = currentOpeningWeight;
            day.openingAmount = currentOpeningAmount;

            const dailyStocks = stocksDuringMonth.filter(s => {
                const d = new Date(s.date);
                return d.getDate() === day.dayNum;
            });

            let periodPurchWeight = 0;
            let periodPurchAmount = 0;
            let periodSaleWeight = 0;
            let periodSaleAmount = 0;
            let periodOtherWeight = 0;

            dailyStocks.forEach(s => {
                const type = s.type;
                const w = Number(s.weight) || 0;
                const amt = Number(s.amount) || 0;

                if (type === 'purchase' || type === 'opening') {
                    periodPurchWeight += w;
                    periodPurchAmount += amt;
                } else if (type === 'sale' || type === 'receipt') {
                    periodSaleWeight += w;
                    periodSaleAmount += amt;
                } else if (type === 'mortality' || type === 'weight_loss' || type === 'natural_weight_loss') {
                    periodOtherWeight += w;
                }
            });

            // Update running cumulatives for closing calculations
            cumulativePurchWeight += periodPurchWeight;
            cumulativePurchAmount += periodPurchAmount;
            cumulativeOutWeight += (periodSaleWeight + periodOtherWeight);

            const currentAvgRate = cumulativePurchWeight > 0 ? (cumulativePurchAmount / cumulativePurchWeight) : 0;

            // Day inward is strictly the period purchases
            day.inwardWeight = periodPurchWeight;
            day.inwardAmount = periodPurchAmount;

            day.outwardWeight = periodSaleWeight;
            day.outwardAmount = periodSaleAmount; // Outward amount is true Sales Revenue

            day.inwardRate = day.inwardWeight ? (day.inwardAmount / day.inwardWeight) : 0;
            day.outwardRate = day.outwardWeight ? (day.outwardAmount / day.outwardWeight) : 0;

            // Use exact weighted average cost formula matches ManageStocks
            day.closingWeight = currentOpeningWeight + periodPurchWeight - periodSaleWeight - periodOtherWeight;
            day.closingRate = currentAvgRate;
            day.closingAmount = day.closingWeight * day.closingRate;

            day.periodPurchWeight = periodPurchWeight;
            day.periodPurchAmount = periodPurchAmount;
        });

        return sortedDays;
    }, [stocks, year, month]);

    const handleDayClick = (day) => {
        navigate(`/birds-stock/final-records?date=${day.dayKey}`);
    };

    const handleExportToExcel = () => {
        if (!dailyData.length) return;

        const exportData = [];
        const opW = dailyData[0]?.openingWeight || 0;
        const opA = dailyData[0]?.openingAmount || 0;
        const opR = opW > 0 ? (opA / opW) : 0;
        
        exportData.push({
            'Date': 'OP STOCK',
            'Inward Qty (kg)': opW,
            'Inward Rate': opR.toFixed(2),
            'Inward Amount': opA,
            'Outward Qty (kg)': 0,
            'Outward Rate': '0.00',
            'Outward Amount': 0,
            'Closing Qty (kg)': opW,
            'Closing Rate': opR.toFixed(2),
            'Closing Amount': opA
        });

        dailyData.forEach(day => {
            exportData.push({
                'Date': day.dayKey,
                'Inward Qty (kg)': day.inwardWeight,
                'Inward Rate': day.inwardRate.toFixed(2),
                'Inward Amount': day.inwardAmount,
                'Outward Qty (kg)': day.outwardWeight,
                'Outward Rate': day.outwardRate.toFixed(2),
                'Outward Amount': day.outwardAmount,
                'Closing Qty (kg)': day.closingWeight,
                'Closing Rate': day.closingRate.toFixed(2),
                'Closing Amount': day.closingAmount
            });
        });

        const totals = dailyData.reduce((acc, curr) => ({
            inWeight: acc.inWeight + curr.periodPurchWeight,
            inAmt: acc.inAmt + curr.periodPurchAmount,
            outWeight: acc.outWeight + curr.outwardWeight,
            outAmt: acc.outAmt + curr.outwardAmount
        }), {
            inWeight: dailyData[0]?.openingWeight || 0,
            inAmt: dailyData[0]?.openingAmount || 0,
            outWeight: 0,
            outAmt: 0
        });

        exportData.push({
            'Date': 'Total',
            'Inward Qty (kg)': totals.inWeight,
            'Inward Rate': totals.inWeight ? (totals.inAmt / totals.inWeight).toFixed(2) : '0.00',
            'Inward Amount': totals.inAmt,
            'Outward Qty (kg)': totals.outWeight,
            'Outward Rate': totals.outWeight ? (totals.outAmt / totals.outWeight).toFixed(2) : '0.00',
            'Outward Amount': totals.outAmt,
            'Closing Qty (kg)': dailyData[dailyData.length - 1]?.closingWeight || 0,
            'Closing Rate': dailyData[dailyData.length - 1]?.closingRate?.toFixed(2) || '0.00',
            'Closing Amount': dailyData[dailyData.length - 1]?.closingAmount || 0
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birds Stock Daily");
        XLSX.writeFile(wb, `Birds_Stock_Daily_${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading && !stocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totals = dailyData.reduce((acc, curr) => ({
        inWeight: acc.inWeight + curr.periodPurchWeight,
        inAmt: acc.inAmt + curr.periodPurchAmount,
        outWeight: acc.outWeight + curr.outwardWeight,
        outAmt: acc.outAmt + curr.outwardAmount
    }), {
        inWeight: dailyData[0]?.openingWeight || 0,
        inAmt: dailyData[0]?.openingAmount || 0,
        outWeight: 0,
        outAmt: 0
    });
    const finalDay = dailyData[dailyData.length - 1];

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
                            Birds Stock Daily Summary
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Daily Inward, Outward and Closing Balances for {monthName} {year}</p>
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
                            <th colSpan="3" className="py-2 px-4 text-center border-r border-gray-300 bg-green-50 text-green-800">Inward</th>
                            <th colSpan="3" className="py-2 px-4 text-center border-r border-gray-300 bg-red-50 text-red-800">Outward</th>
                            <th colSpan="3" className="py-2 px-4 text-center bg-blue-50 text-blue-800">Closing</th>
                        </tr>
                        <tr className="border-t border-gray-300">
                            <th className="py-2 px-4 bg-green-50">Quantity (kg)</th>
                            <th className="py-2 px-4 bg-green-50">Rate</th>
                            <th className="py-2 px-4 border-r border-gray-300 bg-green-50">Amount</th>
                            <th className="py-2 px-4 bg-red-50">Quantity (kg)</th>
                            <th className="py-2 px-4 bg-red-50">Rate</th>
                            <th className="py-2 px-4 border-r border-gray-300 bg-red-50">Amount</th>
                            <th className="py-2 px-4 bg-blue-50">Quantity (kg)</th>
                            <th className="py-2 px-4 bg-blue-50">Rate</th>
                            <th className="py-2 px-4 bg-blue-50">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {dailyData.length > 0 && (
                            <tr className="bg-yellow-50/60 font-medium hover:bg-yellow-50">
                                <td className="py-3 px-4 border-r text-gray-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-orange-500" />
                                    OP STOCK
                                </td>
                                <td className="py-3 px-4 text-right text-green-700">{dailyData[0].openingWeight ? dailyData[0].openingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{dailyData[0].openingWeight ? (dailyData[0].openingAmount / dailyData[0].openingWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r text-gray-800">{dailyData[0].openingAmount ? dailyData[0].openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-red-700">-</td>
                                <td className="py-3 px-4 text-right text-gray-600">-</td>
                                <td className="py-3 px-4 text-right border-r text-gray-800">-</td>

                                <td className="py-3 px-4 text-right text-blue-700 font-bold">{dailyData[0].openingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{dailyData[0].openingWeight ? (dailyData[0].openingAmount / dailyData[0].openingWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                <td className="py-3 px-4 text-right font-bold text-gray-900">{dailyData[0].openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        {dailyData.map((day) => (
                            <tr
                                key={day.dayKey}
                                onClick={() => handleDayClick(day)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <td className="py-3 px-4 border-r font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {day.dayNum} {monthName.slice(0, 3)}
                                </td>

                                <td className="py-3 px-4 text-right text-green-700 font-medium">{day.inwardWeight ? day.inwardWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{day.inwardRate ? day.inwardRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{day.inwardAmount ? day.inwardAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-red-700 font-medium">{day.outwardWeight ? day.outwardWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{day.outwardRate ? day.outwardRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{day.outwardAmount ? day.outwardAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-blue-700 font-bold">{day.closingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{day.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right font-bold text-gray-900">{day.closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                        <tr>
                            <td className="py-3 px-4 border-r uppercase text-sm">Totals</td>
                            <td className="py-3 px-4 text-right text-green-700">{totals.inWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right">{totals.inWeight ? (totals.inAmt / totals.inWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right border-r">{totals.inAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                            <td className="py-3 px-4 text-right text-red-700">{totals.outWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right">{totals.outWeight ? (totals.outAmt / totals.outWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right border-r">{totals.outAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                            <td className="py-3 px-4 text-right text-blue-700">{finalDay ? finalDay.closingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right text-gray-600">{finalDay ? finalDay.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right text-gray-900">{finalDay ? finalDay.closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
