import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Plus, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function StockMonthlySummary() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'report'
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(() => {
        const today = new Date();
        return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    });
    const [supervisors, setSupervisors] = useState([]);
    const selectedSupervisor = searchParams.get('supervisorId') || '';
    const selectedInventoryType = searchParams.get('inventoryType') || '';

    // Report Tab States
    const [reportStocks, setReportStocks] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        if (user?.role === 'supervisor' && !user?.canManageStock) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user && user.role !== 'supervisor') {
            fetchSupervisors();
        }
    }, [user]);

    useEffect(() => {
        fetchMonthlySummary();
    }, [year, selectedSupervisor, selectedInventoryType]);

    useEffect(() => {
        if (activeTab === 'report') {
            fetchReportData();
        }
    }, [activeTab, year, selectedSupervisor]);

    const fetchSupervisors = async () => {
        try {
            const { data } = await api.get('/user');
            if (data.success) {
                const approvedSupervisors = (data.data || []).filter(u => 
                    u.role === 'supervisor' && 
                    u.approvalStatus === 'approved' && 
                    u.isActive === true
                );
                setSupervisors(approvedSupervisors);
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
        }
    };

    const handleSupervisorChange = (val) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('supervisorId', val);
            else next.delete('supervisorId');
            return next;
        });
    };

    const handleInventoryTypeChange = (val) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('inventoryType', val);
            else next.delete('inventoryType');
            return next;
        });
    };

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = {};
            if (year) params.year = year;
            if (selectedSupervisor) params.supervisorId = selectedSupervisor;
            if (selectedInventoryType) params.inventoryType = selectedInventoryType;

            const response = await api.get('/inventory-stock/stats/monthly', { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching monthly summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly summary');
        } finally {
            setLoading(false);
        }
    };

    const fetchReportData = async () => {
        try {
            setReportLoading(true);
            const fyEnd = `${year + 1}-03-31`;
            const params = { endDate: fyEnd };
            if (selectedSupervisor) {
                params.supervisor = selectedSupervisor;
            }
            const res = await api.get('/inventory-stock', { params });
            if (res.data.success) {
                // Filter only bird stocks
                const birdStocks = res.data.data.filter(s => s.inventoryType === 'bird');
                birdStocks.sort((a, b) => new Date(a.date) - new Date(b.date));
                setReportStocks(birdStocks);
            }
        } catch (err) {
            console.error('Error fetching bird stocks for report:', err);
        } finally {
            setReportLoading(false);
        }
    };

    const handleMonthClick = (month) => {
        const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/daily' : '/stocks/daily';
        const displayYear = month.month <= 3 ? year + 1 : year;
        let path = `${basePath}?year=${displayYear}&month=${month.month}`;
        if (selectedSupervisor) path += `&supervisorId=${selectedSupervisor}`;
        if (selectedInventoryType) path += `&inventoryType=${selectedInventoryType}`;
        navigate(path);
    };

    const handleReportMonthClick = (month) => {
        const monthNum = new Date(Date.parse(month.name + " 1, 2012")).getMonth() + 1;
        const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/daily' : '/stocks/daily';
        let path = `${basePath}?year=${month.year}&month=${monthNum}`;
        if (selectedSupervisor) path += `&supervisorId=${selectedSupervisor}`;
        navigate(path);
    };

    const getFinancialYearOrder = (monthData) => {
        if (!monthData) return [];
        return [...monthData].sort((a, b) => {
            const orderA = (a.month + 8) % 12;
            const orderB = (b.month + 8) % 12;
            return orderA - orderB;
        });
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const sortedMonths = getFinancialYearOrder(data.months);

        const exportData = sortedMonths.map(month => ({
            DATE: `${month.name} ${month.month <= 3 ? year + 1 : year}`,
            PURCHASE: month.purchaseAmount || 0,
            SALES: month.saleAmount || 0,
            PROFIT: (month.saleAmount || 0) - (month.purchaseAmount || 0)
        }));

        exportData.push({
            DATE: 'Grand Total',
            PURCHASE: data.totals.purchaseAmount,
            SALES: data.totals.saleAmount,
            PROFIT: data.totals.saleAmount - data.totals.purchaseAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Stock Summary");
        XLSX.writeFile(wb, "Stock_Monthly_Summary.xlsx");
    };

    const reportMonthlyData = useMemo(() => {
        if (!reportStocks.length) return [];

        const fyStart = new Date(`${year}-04-01T00:00:00Z`);
        const fyEnd = new Date(`${year + 1}-03-31T23:59:59Z`);

        let cumulativePurchWeight = 0;
        let cumulativePurchAmount = 0;
        let cumulativeOutWeight = 0;

        const opStocks = reportStocks.filter(s => s.type === 'opening');
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

        const stocksBeforeFY = [];
        const stocksDuringFY = [];

        reportStocks.forEach(stock => {
            const date = new Date(stock.date);

            if (stock.type === 'opening') {
                if (!firstOpStock || stock._id !== firstOpStock._id) return;
                stocksBeforeFY.push(stock);
            } else {
                if (date < fyAnchorDate) return;

                if (date < fyStart) {
                    stocksBeforeFY.push(stock);
                } else if (date <= fyEnd) {
                    stocksDuringFY.push(stock);
                }
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
        for (let i = 0; i < 12; i++) {
            const mDate = new Date(year, 3 + i, 1);
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

            const yearStr = month.year;
            const monthObj = new Date(Date.parse(month.name + " 1, 2012")).getMonth();

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

            month.inwardWeight = periodPurchWeight;
            month.inwardAmount = periodPurchAmount;

            month.outwardWeight = periodSaleWeight;
            month.outwardAmount = periodSaleAmount;

            month.inwardRate = month.inwardWeight ? (month.inwardAmount / month.inwardWeight) : 0;
            month.outwardRate = month.outwardWeight ? (month.outwardAmount / month.outwardWeight) : 0;

            month.closingWeight = currentOpeningWeight + periodPurchWeight - periodSaleWeight - periodOtherWeight;
            month.closingRate = currentAvgRate;
            month.closingAmount = month.closingWeight * month.closingRate;

            month.periodPurchWeight = periodPurchWeight;
            month.periodPurchAmount = periodPurchAmount;
        });

        return sortedMonths;
    }, [reportStocks, year]);

    const reportTotals = useMemo(() => {
        return reportMonthlyData.reduce((acc, curr) => ({
            inWeight: acc.inWeight + curr.periodPurchWeight,
            inAmt: acc.inAmt + curr.periodPurchAmount,
            outWeight: acc.outWeight + curr.outwardWeight,
            outAmt: acc.outAmt + curr.outwardAmount
        }), {
            inWeight: reportMonthlyData[0]?.openingWeight || 0,
            inAmt: reportMonthlyData[0]?.openingAmount || 0,
            outWeight: 0,
            outAmt: 0
        });
    }, [reportMonthlyData]);

    const reportFinalMonth = reportMonthlyData[reportMonthlyData.length - 1];

    const handleReportExportToExcel = () => {
        if (!reportMonthlyData.length) return;

        const exportData = [];
        const opW = reportMonthlyData[0]?.openingWeight || 0;
        const opA = reportMonthlyData[0]?.openingAmount || 0;
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

        reportMonthlyData.forEach(month => {
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

        exportData.push({
            'Month': 'Total',
            'Inward Qty (kg)': reportTotals.inWeight,
            'Inward Rate': reportTotals.inWeight ? (reportTotals.inAmt / reportTotals.inWeight).toFixed(2) : '0.00',
            'Inward Amount': reportTotals.inAmt,
            'Outward Qty (kg)': reportTotals.outWeight,
            'Outward Rate': reportTotals.outWeight ? (reportTotals.outAmt / reportTotals.outWeight).toFixed(2) : '0.00',
            'Outward Amount': reportTotals.outAmt,
            'Closing Qty (kg)': reportFinalMonth?.closingWeight || 0,
            'Closing Rate': reportFinalMonth?.closingRate?.toFixed(2) || '0.00',
            'Closing Amount': reportFinalMonth?.closingAmount || 0
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birds Stock Monthly");
        XLSX.writeFile(wb, `Birds_Stock_Monthly_${year}-${year + 1}.xlsx`);
    };

    const triggerExport = () => {
        if (activeTab === 'report') {
            handleReportExportToExcel();
        } else {
            handleExportToExcel();
        }
    };

    if (loading && activeTab === 'stock' && !data) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (reportLoading && activeTab === 'report' && !reportStocks.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    if (error && activeTab === 'stock') return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchMonthlySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-8 h-8" />
                            Stock Monthly Summary
                        </h1>
                        <p className="text-gray-600 mt-1">Overview of Purchases, Sales, and Consumption by Month</p>
                    </div>

                    {/* Tab Toggles (Stock vs Report) */}
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab('stock')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                                activeTab === 'stock'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Report{/*  swap label from stock to report*/}
                        </button>
                        <button
                            onClick={() => setActiveTab('report')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                                activeTab === 'report'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Stock {/*  swap label from report to stock */}
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 mt-4 sm:mt-0 items-center flex-wrap">
                    {/* Supervisor and Inventory Type select filters only for Stock Tab */}
                    {activeTab === 'stock' && (
                        <>
                            {user?.role !== 'supervisor' && (
                                <select
                                    value={selectedSupervisor}
                                    onChange={(e) => handleSupervisorChange(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                                >
                                    <option value="">All Supervisors</option>
                                    {supervisors.map(sup => (
                                        <option key={sup._id} value={sup._id}>{sup.name}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={selectedInventoryType}
                                onChange={(e) => handleInventoryTypeChange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                            >
                                <option value="">All Stock Types</option>
                                <option value="bird">Birds</option>
                                <option value="feed">Feed</option>
                            </select>
                        </>
                    )}

                    <button
                        onClick={() => {
                            const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/manage' : '/stocks/manage';
                            navigate(basePath);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Plus size={20} />
                        <span>Create</span>
                    </button>

                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                    >
                        {Array.from({ length: 5 }, (_, i) => {
                            const y = new Date().getFullYear() - 3 + i;
                            return <option key={y} value={y}>FY {y}-{y + 1}</option>;
                        })}
                    </select>

                    <button
                        onClick={triggerExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Download size={20} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Render Tab Contents */}
            {activeTab === 'stock' ? (
                /* Stock Tab Table */
                data && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">DATE</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-900">PURCHASE</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-900">SALES</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-900">PROFIT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFinancialYearOrder(data.months).map((month) => {
                                        const profit = month.saleAmount - month.purchaseAmount;
                                        return (
                                            <tr
                                                key={month.name}
                                                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => handleMonthClick(month)}
                                            >
                                                <td className="py-3 px-4 text-blue-600 font-medium hover:underline">
                                                    {month.name} {month.month <= 3 ? year + 1 : year}
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-700">
                                                    {month.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                                    {month.saleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className={`py-3 px-4 text-right font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                        <td className="py-3 px-4 text-gray-900">Grand Total</td>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {data.totals.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {data.totals.saleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-3 px-4 text-right ${data.totals.saleAmount - data.totals.purchaseAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {(data.totals.saleAmount - data.totals.purchaseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* Report Tab Table (Inward/Outward/Closing Birds Stock Report) */
                reportMonthlyData.length > 0 && (
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
                                <tr className="bg-yellow-50/60 font-medium hover:bg-yellow-50">
                                    <td className="py-3 px-4 border-r text-gray-900 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-orange-500" />
                                        OP STOCK
                                    </td>
                                    <td className="py-3 px-4 text-right text-green-700">{reportMonthlyData[0].openingWeight ? reportMonthlyData[0].openingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                    <td className="py-3 px-4 text-right text-gray-600">{reportMonthlyData[0].openingWeight ? (reportMonthlyData[0].openingAmount / reportMonthlyData[0].openingWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                    <td className="py-3 px-4 text-right border-r text-gray-800">{reportMonthlyData[0].openingAmount ? reportMonthlyData[0].openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>

                                    <td className="py-3 px-4 text-right text-red-700">-</td>
                                    <td className="py-3 px-4 text-right text-gray-600">-</td>
                                    <td className="py-3 px-4 text-right border-r text-gray-800">-</td>

                                    <td className="py-3 px-4 text-right text-blue-700 font-bold">{reportMonthlyData[0].openingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right text-gray-600">{reportMonthlyData[0].openingWeight ? (reportMonthlyData[0].openingAmount / reportMonthlyData[0].openingWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                    <td className="py-3 px-4 text-right font-bold text-gray-900">{reportMonthlyData[0].openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                                {reportMonthlyData.map((month) => (
                                    <tr
                                        key={month.monthKey}
                                        onClick={() => handleReportMonthClick(month)}
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
                                    <td className="py-3 px-4 text-right text-green-700">{reportTotals.inWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right">{reportTotals.inWeight ? (reportTotals.inAmt / reportTotals.inWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                    <td className="py-3 px-4 text-right border-r">{reportTotals.inAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                                    <td className="py-3 px-4 text-right text-red-700">{reportTotals.outWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4 text-right">{reportTotals.outWeight ? (reportTotals.outAmt / reportTotals.outWeight).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                    <td className="py-3 px-4 text-right border-r">{reportTotals.outAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                                    <td className="py-3 px-4 text-right text-blue-700">{reportFinalMonth ? reportFinalMonth.closingWeight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                                    <td className="py-3 px-4 text-right text-gray-600">{reportFinalMonth ? reportFinalMonth.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                                    <td className="py-3 px-4 text-right text-gray-900">{reportFinalMonth ? reportFinalMonth.closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
