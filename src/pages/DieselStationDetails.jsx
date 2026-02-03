import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    Truck,
    AlertCircle,
    Droplet,
    Wallet,
    CreditCard
} from 'lucide-react';
import api from '../lib/axios';

const DieselStationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [station, setStation] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showNarration, setShowNarration] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [id, location.search]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/diesel-stations/${id}${window.location.search}`);
            if (response.data.success) {
                setStation(response.data.data.station);
                setLedger(response.data.data.ledger || []);
            }
        } catch (err) {
            console.error('Error fetching diesel station details:', err);
            setError('Failed to fetch diesel station details');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !station) {
        return (
            <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600">{error || 'Station not found'}</p>
                <button
                    onClick={handleBack}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Back to List
                </button>
            </div>
        );
    }

    // Calculate totals (excluding Opening Balance for transaction totals)
    const transactionLedger = ledger.filter(entry => entry.type !== 'opening');
    const totalCredit = transactionLedger.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const totalDebit = transactionLedger.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalVolume = transactionLedger.reduce((sum, entry) => sum + (entry.volume || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
                    <p className="text-gray-600">
                        {station.location ? `${station.location} • ` : ''}
                        Diesel Station Ledger
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Opening Balance */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Opening Balance</p>
                            <p className="text-xl font-bold text-gray-900">
                                ₹{(station.openingBalance || 0).toFixed(2)}
                                <span className={`text-sm ml-1 ${station.openingBalanceType === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                                    {station.openingBalanceType === 'credit' ? 'Cr' : 'Dr'}
                                </span>
                            </p>
                        </div>
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Wallet className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                </div>

                {/* 2. Total Volume */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Volume</p>
                            <p className="text-xl font-bold text-blue-600">{totalVolume.toFixed(2)} ltr</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Droplet className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* 3. Total Amount (Credit) - Purchase */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Credit</p>
                            <p className="text-xl font-bold text-red-600">₹{totalCredit.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <CreditCard className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </div>

                {/* 4. Total Amount (Debit) - Payment */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Debit</p>
                            <p className="text-xl font-bold text-green-600">₹{totalDebit.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* 5. Closing Balance */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Closing Balance</p>
                            <p className="text-xl font-bold text-orange-600">
                                ₹{(station.outstandingBalance || 0).toFixed(2)}
                                <span className={`text-sm ml-1 ${station.outstandingBalanceType === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                                    {station.outstandingBalanceType === 'credit' ? 'Cr' : 'Dr'}
                                </span>
                            </p>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Wallet className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={showNarration}
                                onChange={(e) => setShowNarration(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className="font-medium">Show Narration</span>
                        </label>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Sr. No.</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Particulars</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Indent No.</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Vehicle No</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Volume (ltr)</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Rate/ltr</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Cr (Amount)</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Dr (Amount)</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {ledger.map((entry, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900">{index + 1}</td>
                                    <td className="px-4 py-3 text-gray-900">{formatDate(entry.date)}</td>
                                    <td className="px-4 py-3 text-gray-900">
                                        <div className="flex flex-col">
                                            <span>{entry.particulars}</span>
                                            {entry.currentTripId && (
                                                <Link
                                                    to={`/trips/${entry.tripId}`}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    <Truck size={12} />
                                                    {entry.currentTripId}
                                                </Link>
                                            )}
                                            {showNarration && entry.narration && (
                                                <div className="text-xs text-gray-500 mt-1 italic">
                                                    {entry.narration}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">{entry.indentNumber}</td>
                                    <td className="px-4 py-3 text-gray-900">{entry.vehicleNumber}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{(entry.volume || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">₹{(entry.rate || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-medium text-red-600">
                                        {/* User said "Total Amount" is always added in Cr (Total Amount) columns for Diesel Record */}
                                        {entry.credit ? `₹${entry.credit.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                        {/* Debit column */}
                                        {entry.debit ? `₹${entry.debit.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        ₹{(entry.balance || 0).toFixed(2)} {entry.balanceType}
                                    </td>
                                </tr>
                            ))}
                            {ledger.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                        No transactions found for this station.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DieselStationDetails;
