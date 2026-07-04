import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, ArrowLeft, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function StockDailySummary() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
    const supervisorId = searchParams.get('supervisorId') || '';
    const inventoryType = searchParams.get('inventoryType') || '';

    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [supervisors, setSupervisors] = useState([]);

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

    useEffect(() => {
        fetchDailySummary();
    }, [year, month, supervisorId, inventoryType]);

    const fetchDailySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { year, month };
            if (supervisorId) params.supervisorId = supervisorId;
            if (inventoryType) params.inventoryType = inventoryType;

            const response = await api.get('/inventory-stock/stats/daily', { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching daily summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily summary');
        } finally {
            setLoading(false);
        }
    };

    const fullDays = useMemo(() => {
        if (!data) return [];
        // Generate all days in the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const day = i < 10 ? `0${i}` : i;
            const monthStr = month < 10 ? `0${month}` : month;
            const dateStr = `${year}-${monthStr}-${day}`;

            const existingDay = data.days.find(d => d.formattedDate === dateStr);

            if (existingDay) {
                days.push(existingDay);
            } else {
                days.push({
                    date: new Date(year, month - 1, i).toISOString(),
                    formattedDate: dateStr,
                    totalPurchaseWeight: 0,
                    totalPurchaseAmount: 0,
                    totalSaleWeight: 0,
                    totalSaleAmount: 0,
                    totalMortalityBirds: 0,
                    totalMortalityWeight: 0,
                    totalMortalityAmount: 0,
                    totalWeightLossWeight: 0,
                    totalWeightLossAmount: 0,
                    totalNaturalWeightLossWeight: 0,
                    totalNaturalWeightLossAmount: 0,
                    totalFeedConsumeQty: 0,
                    totalFeedConsumeAmount: 0
                });
            }
        }

        // Sort descending (newest first)
        days.sort((a, b) => new Date(b.formattedDate) - new Date(a.formattedDate));
        return days;
    }, [data, year, month]);

    const handleDayClick = (dayData) => {
        const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/manage' : '/stocks/manage';
        navigate(`${basePath}?date=${dayData.formattedDate}`);
    };

    const handleExportToExcel = () => {
        if (!fullDays.length) return;

        const exportData = fullDays.map(day => ({
            DATE: day.formattedDate,
            'PURCHASE WEIGHT': day.totalPurchaseWeight || 0,
            'PUR AMOUNT': day.totalPurchaseAmount || 0,
            'SALES WEIGHT': day.totalSaleWeight || 0,
            'SALES AMOUNT': day.totalSaleAmount || 0,
            PROFIT: (day.totalSaleAmount || 0) - (day.totalPurchaseAmount || 0)
        }));

        // Add Totals Row
        exportData.push({
            DATE: 'Grand Total',
            'PURCHASE WEIGHT': data.totals.totalPurchaseWeight,
            'PUR AMOUNT': data.totals.totalPurchaseAmount,
            'SALES WEIGHT': data.totals.totalSaleWeight,
            'SALES AMOUNT': data.totals.totalSaleAmount,
            PROFIT: data.totals.totalSaleAmount - data.totals.totalPurchaseAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Stock Summary");
        XLSX.writeFile(wb, `Stock_Daily_Summary_${year}_${month}.xlsx`);
    };

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    if (loading && !data) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (error) return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchDailySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            let basePath = user?.role === 'supervisor' ? '/supervisor/stocks' : '/stocks';
                            const params = [];
                            if (supervisorId) params.push(`supervisorId=${supervisorId}`);
                            if (inventoryType) params.push(`inventoryType=${inventoryType}`);
                            if (params.length > 0) {
                                basePath += `?${params.join('&')}`;
                            }
                            navigate(basePath);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-8 h-8" />
                            {monthName} {year} - Daily Summary
                        </h1>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0 items-center flex-wrap">
                    {user?.role !== 'supervisor' && (
                        <select
                            value={supervisorId}
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
                        value={inventoryType}
                        onChange={(e) => handleInventoryTypeChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                    >
                        <option value="">All Stock Types</option>
                        <option value="bird">Birds</option>
                        <option value="feed">Feed</option>
                    </select>
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Download size={20} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Split Layout: Table on left, Filters/Summary Sidebar on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Summary Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-9 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-300 bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">DATE</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">PURCHASE WEIGHT</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">PUR AMOUNT</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">SALES WEIGHT</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">SALES AMOUNT</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">PROFIT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullDays.map((day) => {
                                const profit = day.totalSaleAmount - day.totalPurchaseAmount;
                                return (
                                    <tr
                                        key={day.formattedDate}
                                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleDayClick(day)}
                                    >
                                        <td className="py-3 px-4 text-blue-600 font-medium hover:underline">
                                            {new Date(day.date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700">
                                            {day.totalPurchaseWeight > 0 ? `${day.totalPurchaseWeight.toLocaleString()} Kg` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700">
                                            {day.totalPurchaseAmount > 0 ? `₹${day.totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700">
                                            {day.totalSaleWeight > 0 ? `${day.totalSaleWeight.toLocaleString()} Kg` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                            {day.totalSaleAmount > 0 ? `₹${day.totalSaleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {profit !== 0 ? `₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Grand Total</td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {(data.totals.totalPurchaseWeight || 0).toLocaleString()} Kg
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    ₹{(data.totals.totalPurchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {(data.totals.totalSaleWeight || 0).toLocaleString()} Kg
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    ₹{(data.totals.totalSaleAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`py-3 px-4 text-right font-bold ${data.totals.totalSaleAmount - data.totals.totalPurchaseAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    ₹{(data.totals.totalSaleAmount - data.totals.totalPurchaseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Right Side: Filters/Summary Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-3 h-fit space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider border-b pb-2">FILTERS / METRICS</h2>
                        <p className="text-xs text-gray-500 mt-1">Aggregated statistics for the month</p>
                    </div>

                    <div className="space-y-4">
                        {/* Birds Mortality */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Birds Mortality Qty</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-gray-900">
                                {(data.totals.totalMortalityBirds || 0).toLocaleString()} Birds
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Birds Mortality Weight</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-gray-900">
                                {(data.totals.totalMortalityWeight || 0).toLocaleString()} Kg
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Birds Mortality Amount</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-red-600">
                                ₹{(data.totals.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Actual Weightloss */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Actual Weightloss Weight</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-gray-900">
                                {(data.totals.totalWeightLossWeight || 0).toLocaleString()} Kg
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Actual Weightloss Amount</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-red-600">
                                ₹{(data.totals.totalWeightLossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Natural Weightloss */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Natural Weightloss Weight</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-gray-900">
                                {(data.totals.totalNaturalWeightLossWeight || 0).toLocaleString()} Kg
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Natural Weightloss Amount</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-red-600">
                                ₹{(data.totals.totalNaturalWeightLossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Feed Consume */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Feed Consume Qty</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-gray-900">
                                {(data.totals.totalFeedConsumeQty || 0).toLocaleString()} bags
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Feed Consume Amount</label>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-semibold text-blue-600">
                                ₹{(data.totals.totalFeedConsumeAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
