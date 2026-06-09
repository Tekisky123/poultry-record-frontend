import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import SearchableSelect from '../components/SearchableSelect';

export default function IndirectSalesMonthlySummary() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toLocaleDateString('sv'), // Defaults to current date (YYYY-MM-DD in local time)
        customer: '',
        vendor: '',
        place: '',
        vehicleNumber: '',
        driver: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadCustomersAndVendors = async () => {
        try {
            const [customerRes, vendorRes] = await Promise.all([
                api.get('/customer'),
                api.get('/vendor')
            ]);
            setCustomers(customerRes.data?.data || []);
            setVendors(vendorRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load dropdown data', err);
        }
    };

    useEffect(() => {
        fetchMonthlyStats();
        loadCustomersAndVendors();
    }, [year]);

    const handleOpenCreate = () => {
        setFormData({
            date: new Date().toLocaleDateString('sv'), // Reset to current date
            customer: '',
            vendor: '',
            place: '',
            vehicleNumber: '',
            driver: '',
            notes: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleCustomerChange = (value) => {
        const selected = customers.find(item => item.id === value || item._id === value);
        setFormData(prev => ({
            ...prev,
            customer: value,
            place: selected?.place || prev.place
        }));
    };

    const handleCreateSubmit = async (event) => {
        event.preventDefault();
        try {
            setIsSubmitting(true);
            const payload = {
                date: formData.date,
                customer: formData.customer,
                vendor: formData.vendor,
                place: formData.place,
                vehicleNumber: formData.vehicleNumber,
                driver: formData.driver,
                notes: formData.notes
            };

            const { data: resData } = await api.post('/indirect-sales', payload);
            setIsCreateModalOpen(false);
            fetchMonthlyStats();
            if (resData.data?.id) {
                navigate(`/indirect-sales/${resData.data.id}`);
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to create indirect purchase and sale.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const customerOptions = useMemo(() => {
        return customers.map(c => ({
            value: c.id || c._id,
            label: `${c.shopName} — ${c.ownerName || 'N/A'}`
        }));
    }, [customers]);

    const vendorOptions = useMemo(() => {
        return vendors.map(v => ({
            value: v.id || v._id,
            label: `${v.vendorName}${v.companyName ? ` — ${v.companyName}` : ''}`
        }));
    }, [vendors]);

    const fetchMonthlyStats = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/indirect-sales/stats/monthly', { params: { year } });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching monthly stats:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = (monthData) => {
        const date = new Date(monthData.startDate);
        const monthNum = date.getMonth() + 1;
        const yearNum = date.getFullYear();
        navigate(`/indirect-sales/daily?year=${yearNum}&month=${monthNum}`);
    };

    const getFinancialYearOrder = (monthData) => {
        if (!monthData) return [];
        return [...monthData].sort((a, b) => {
            const dateA = new Date(Date.parse(a.name + " 1, 2000"));
            const dateB = new Date(Date.parse(b.name + " 1, 2000"));
            const monthA = dateA.getMonth() + 1;
            const monthB = dateB.getMonth() + 1;

            const orderA = (monthA + 8) % 12;
            const orderB = (monthB + 8) % 12;
            return orderA - orderB;
        });
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const sortedMonths = getFinancialYearOrder(data.months);

        const exportData = sortedMonths.map(m => ({
            Month: `${m.name} ${new Date(m.startDate).getFullYear()}`,
            'Count': m.count,
            'Total Sales': m.salesAmount || 0,
            'Total Purchase': m.purchaseAmount || 0,
            'Net Profit': m.netProfit || 0
        }));

        exportData.push({
            Month: 'Grand Total',
            'Count': data.totals.count,
            'Total Sales': data.totals.salesAmount,
            'Total Purchase': data.totals.purchaseAmount,
            'Net Profit': data.totals.netProfit
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
        XLSX.writeFile(wb, `IndirectSales_Monthly_${year}.xlsx`);
    };

    const yearOptions = [];
    const currentYear = new Date().getFullYear();
    for (let y = 2024; y <= currentYear + 1; y++) {
        yearOptions.push(y);
    }

    if (loading && !data) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/indirect-sales/')} // Loop back logic? No, this is the root for summary now.
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Indirect Sales - Monthly Summary</h1>
                        <p className="text-gray-600">Overview of Indirect Sales Performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>FY {y}-{y + 1}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                    >
                        <Download size={20} />
                        <span className="font-medium">Export</span>
                    </button>
                    <button
                        onClick={() => navigate('/indirect-sales/list')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                    >
                        View All Records
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <PlusCircle size={20} />
                        <span className="font-medium">Create</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Month</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Records</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Total Purchase</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Total Sales</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {getFinancialYearOrder(data?.months).map((month, index) => (
                                <tr
                                    key={index}
                                    onClick={() => handleMonthClick(month)}
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${month.count === 0 ? 'opacity-60' : ''}`}
                                >
                                    <td className="px-6 py-4 font-medium text-blue-600 hover:underline">
                                        {month.name} {new Date(month.startDate).getFullYear()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">{month.count}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {month.purchaseAmount > 0 ? `₹${month.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {month.salesAmount > 0 ? `₹${month.salesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                                        {month.netProfit !== 0 ? `₹${month.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="px-6 py-4 text-gray-900">Total</td>
                                <td className="px-6 py-4 text-right text-gray-900">{data?.totals.count}</td>
                                <td className="px-6 py-4 text-right text-red-700">
                                    ₹{data?.totals.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right text-green-700">
                                    ₹{data?.totals.salesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right text-blue-700">
                                    ₹{data?.totals.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl text-left">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Create Indirect Purchase &amp; Sale</h2>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="px-6 py-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(event) => setFormData(prev => ({ ...prev, date: event.target.value }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Customer *
                                    </label>
                                    <SearchableSelect
                                        value={formData.customer}
                                        onChange={handleCustomerChange}
                                        options={customerOptions}
                                        placeholder="Select customer"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vendor *
                                    </label>
                                    <SearchableSelect
                                        value={formData.vendor}
                                        onChange={(val) => setFormData(prev => ({ ...prev, vendor: val }))}
                                        options={vendorOptions}
                                        placeholder="Select vendor"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Place *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.place}
                                        onChange={(event) => setFormData(prev => ({ ...prev, place: event.target.value }))}
                                        required
                                        placeholder="Customer place"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.vehicleNumber}
                                        onChange={(event) => setFormData(prev => ({ ...prev, vehicleNumber: event.target.value }))}
                                        placeholder="Vehicle number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Driver
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.driver}
                                        onChange={(event) => setFormData(prev => ({ ...prev, driver: event.target.value }))}
                                        placeholder="Driver name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(event) => setFormData(prev => ({ ...prev, notes: event.target.value }))}
                                    rows={3}
                                    placeholder="Any additional information regarding this indirect sale..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
