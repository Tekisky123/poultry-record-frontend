import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Calendar, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function BirdsStockMonthlySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stocks, setStocks] = useState([]);

    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

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
            const fyStart = `${year}-04-01`;
            const fyEnd = `${year + 1}-03-31`;

            // Fetch ALL stocks up to the end of the selected financial year
            // This allows us to calculate opening balances correctly
            const res = await api.get('/inventory-stock', {
                params: {
                    endDate: fyEnd
                }
            });

            if (res.data.success) {
                // Filter only bird stocks
                const birdStocks = res.data.data.filter(s => s.inventoryType === 'bird');
                // Sort by date ascending to process chronologically
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

    const monthlyData = useMemo(() => {
        if (!stocks.length) return [];

        const fyStart = new Date(`${year}-04-01T00:00:00Z`);
        const fyEnd = new Date(`${year + 1}-03-31T23:59:59Z`);

        let cumulativePurchWeight = 0;
        let cumulativePurchAmount = 0;
        let cumulativeOutWeight = 0;

        // Separate stocks before FY and during FY
        const stocksBeforeFY = [];
        const stocksDuringFY = [];

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

            if (date < fyStart) {
                stocksBeforeFY.push(stock);
            } else if (date <= fyEnd) {
                stocksDuringFY.push(stock);
            }
        });

        stocksBeforeFY.forEach(s => {
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

        const monthsMap = new Map();
        // Initialize 12 months for the FY
        for (let i = 0; i < 12; i++) {
            const mDate = new Date(year, 3 + i, 1); // 3 is April
            const monthKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
            monthsMap.set(monthKey, {
                monthKey,
                name: mDate.toLocaleString('default', { month: 'short' }),
                year: mDate.getFullYear(),
                sortOrder: i,
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

        const sortedMonths = Array.from(monthsMap.values());

        sortedMonths.forEach(month => {
            const prevAvgRate = cumulativePurchWeight > 0 ? (cumulativePurchAmount / cumulativePurchWeight) : 0;
            const currentOpeningWeight = cumulativePurchWeight - cumulativeOutWeight;
            const currentOpeningAmount = currentOpeningWeight * prevAvgRate;

            month.openingWeight = currentOpeningWeight;
            month.openingAmount = currentOpeningAmount;

            // Process stocks for this specific month
            const yearStr = month.year;
            const monthObj = new Date(Date.parse(month.name + " 1, 2012")).getMonth(); // gets zero-indexed month

            const monthlyStocks = stocksDuringFY.filter(s => {
                const d = new Date(s.date);
                return d.getFullYear() === yearStr && d.getMonth() === monthObj;
            });

            let periodPurchWeight = 0;
            let periodPurchAmount = 0;
            let periodSaleWeight = 0;
            let periodSaleAmount = 0;
            let periodOtherWeight = 0;

            monthlyStocks.forEach(s => {
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

            cumulativePurchWeight += periodPurchWeight;
            cumulativePurchAmount += periodPurchAmount;
            cumulativeOutWeight += (periodSaleWeight + periodOtherWeight);

            const currentAvgRate = cumulativePurchWeight > 0 ? (cumulativePurchAmount / cumulativePurchWeight) : 0;

            // Month inward is strictly the period purchases
            month.inwardWeight = periodPurchWeight;
            month.inwardAmount = periodPurchAmount;

            month.outwardWeight = periodSaleWeight;
            month.outwardAmount = periodSaleAmount; // Outward amount is based on actual sales revenue

            month.inwardRate = month.inwardWeight ? (month.inwardAmount / month.inwardWeight) : 0;
            month.outwardRate = month.outwardWeight ? (month.outwardAmount / month.outwardWeight) : 0;

            month.closingWeight = currentOpeningWeight + periodPurchWeight - periodSaleWeight - periodOtherWeight;
            month.closingRate = currentAvgRate;
            month.closingAmount = month.closingWeight * month.closingRate;

            month.periodPurchWeight = periodPurchWeight;
            month.periodPurchAmount = periodPurchAmount;
        });

        return sortedMonths;
    }, [stocks, year]);

    const handleMonthClick = (month) => {
        // Find literal numeric month 1-12
        const monthNum = new Date(Date.parse(month.name + " 1, 2012")).getMonth() + 1;
        navigate(`/birds-stock/daily-summary?year=${month.year}&month=${monthNum}`);
    };

    const handleExportToExcel = () => {
        if (!monthlyData.length) return;

        const exportData = [];
        const opW = monthlyData[0]?.openingWeight || 0;
        const opA = monthlyData[0]?.openingAmount || 0;
        const opR = opW > 0 ? (opA / opW) : 0;
        
        exportData.push({
            'Month': 'OP STOCK',
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

        monthlyData.forEach(month => {
            exportData.push({
                'Month': `${month.name} ${month.year}`,
                'Inward Qty (kg)': month.inwardWeight,
                'Inward Rate': month.inwardRate.toFixed(2),
                'Inward Amount': month.inwardAmount,
                'Outward Qty (kg)': month.outwardWeight,
                'Outward Rate': month.outwardRate.toFixed(2),
                'Outward Amount': month.outwardAmount,
                'Closing Qty (kg)': month.closingWeight,
                'Closing Rate': month.closingRate.toFixed(2),
                'Closing Amount': month.closingAmount
            });
        });

        // Calculate Totals row
        const totals = monthlyData.reduce((acc, curr) => ({
            inWeight: acc.inWeight + curr.periodPurchWeight,
            inAmt: acc.inAmt + curr.periodPurchAmount,
            outWeight: acc.outWeight + curr.outwardWeight,
            outAmt: acc.outAmt + curr.outwardAmount
        }), {
            inWeight: monthlyData[0]?.openingWeight || 0,
            inAmt: monthlyData[0]?.openingAmount || 0,
            outWeight: 0,
            outAmt: 0
        });

        exportData.push({
            'Month': 'Total',
            'Inward Qty (kg)': totals.inWeight,
            'Inward Rate': totals.inWeight ? (totals.inAmt / totals.inWeight).toFixed(2) : '0.00',
            'Inward Amount': totals.inAmt,
            'Outward Qty (kg)': totals.outWeight,
            'Outward Rate': totals.outWeight ? (totals.outAmt / totals.outWeight).toFixed(2) : '0.00',
            'Outward Amount': totals.outAmt,
            'Closing Qty (kg)': monthlyData[monthlyData.length - 1]?.closingWeight || 0,
            'Closing Rate': monthlyData[monthlyData.length - 1]?.closingRate?.toFixed(2) || '0.00',
            'Closing Amount': monthlyData[monthlyData.length - 1]?.closingAmount || 0
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birds Stock Monthly");
        XLSX.writeFile(wb, `Birds_Stock_Monthly_${year}-${year + 1}.xlsx`);
    };

    if (loading && !stocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    // Calculate totals for rendering
    const totals = monthlyData.reduce((acc, curr) => ({
        inWeight: acc.inWeight + curr.periodPurchWeight,
        inAmt: acc.inAmt + curr.periodPurchAmount,
        outWeight: acc.outWeight + curr.outwardWeight,
        outAmt: acc.outAmt + curr.outwardAmount
    }), {
        inWeight: monthlyData[0]?.openingWeight || 0,
        inAmt: monthlyData[0]?.openingAmount || 0,
        outWeight: 0,
        outAmt: 0
    });
    const finalMonth = monthlyData[monthlyData.length - 1];

    return (
        <div className="space-y-6">
            {/* Header */}
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
                            <Package className="w-8 h-8" />
                            Birds Stock Monthly Summary
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">Monthly Inward, Outward and Closing Balances</p>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0 items-center">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="p-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-md font-semibold focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b-2 border-gray-300">
                        <tr>
                            <th rowSpan="2" className="py-3 px-4 border-r border-gray-300">Month</th>
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
                        {monthlyData.length > 0 && (
                            <tr className="bg-yellow-50/60 font-medium hover:bg-yellow-50">
                                <td className="py-3 px-4 border-r text-gray-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-orange-500" />
                                    OP STOCK
                                </td>
                                <td className="py-3 px-4 text-right text-green-700">{monthlyData[0].openingWeight ? monthlyData[0].openingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{monthlyData[0].openingWeight ? (monthlyData[0].openingAmount / monthlyData[0].openingWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r text-gray-800">{monthlyData[0].openingAmount ? monthlyData[0].openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-red-700">-</td>
                                <td className="py-3 px-4 text-right text-gray-600">-</td>
                                <td className="py-3 px-4 text-right border-r text-gray-800">-</td>

                                <td className="py-3 px-4 text-right text-blue-700 font-bold">{monthlyData[0].openingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{monthlyData[0].openingWeight ? (monthlyData[0].openingAmount / monthlyData[0].openingWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                <td className="py-3 px-4 text-right font-bold text-gray-900">{monthlyData[0].openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        {monthlyData.map((month) => (
                            <tr
                                key={month.monthKey}
                                onClick={() => handleMonthClick(month)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <td className="py-3 px-4 border-r font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {month.name} {month.year}
                                </td>

                                <td className="py-3 px-4 text-right text-green-700 font-medium">{month.inwardWeight ? month.inwardWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{month.inwardRate ? month.inwardRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{month.inwardAmount ? month.inwardAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-red-700 font-medium">{month.outwardWeight ? month.outwardWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{month.outwardRate ? month.outwardRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="py-3 px-4 text-right border-r font-medium text-gray-800">{month.outwardAmount ? month.outwardAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                <td className="py-3 px-4 text-right text-blue-700 font-bold">{month.closingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{month.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right font-bold text-gray-900">{month.closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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

                            <td className="py-3 px-4 text-right text-blue-700">{finalMonth ? finalMonth.closingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right text-gray-600">{finalMonth ? finalMonth.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-3 px-4 text-right text-gray-900">{finalMonth ? finalMonth.closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
