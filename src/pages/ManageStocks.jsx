import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, FileText, CheckCircle, Save, X, Edit, Trash2 } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const ManageStocks = () => {
    const [loading, setLoading] = useState(true);
    const [stocks, setStocks] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [ledgers, setLedgers] = useState([]);

    // Vendor Search State
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [vendorSearchTerm, setVendorSearchTerm] = useState('');
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [highlightedVendorIndex, setHighlightedVendorIndex] = useState(-1);

    // Modals
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
    const { user } = useAuth();
    const isSupervisor = user?.role === 'supervisor';

    // Forms Data
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStockId, setCurrentStockId] = useState(null);

    const [purchaseData, setPurchaseData] = useState({
        vendorId: '',
        vehicleNumber: '', // Text input as per requirement
        birds: '',
        weight: '',
        avgWeight: 0,
        rate: '',
        amount: 0,
        refNo: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [saleData, setSaleData] = useState({
        customerId: '',
        billNumber: '',
        birds: '',
        weight: '',
        avgWeight: 0,
        rate: '',
        amount: 0,
        totalBalance: 0,
        cashPaid: 0,
        onlinePaid: 0,
        discount: 0,
        balance: 0,
        cashLedgerId: '',
        onlineLedgerId: '',
        saleOutBalance: 0,
        date: new Date().toISOString().split('T')[0]
    });

    const [openingStockData, setOpeningStockData] = useState({
        birds: '',
        weight: '',
        rate: '',
        refNo: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Calculate Avg and Amount Effects
    const [showMortalityModal, setShowMortalityModal] = useState(false);
    const [mortalityData, setMortalityData] = useState({
        birds: '',
        weight: '',
        avgWeight: 0,
        rate: 0,
        amount: 0,
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const birds = Number(purchaseData.birds) || 0;
        const weight = Number(purchaseData.weight) || 0;
        const rate = Number(purchaseData.rate) || 0;

        setPurchaseData(prev => ({
            ...prev,
            avgWeight: birds > 0 ? Number((weight / birds).toFixed(2)) : 0,
            amount: Number((weight * rate).toFixed(2))
        }));
    }, [purchaseData.birds, purchaseData.weight, purchaseData.rate]);

    // Calculate Mortality Auto-fields
    useEffect(() => {
        const birds = Number(mortalityData.birds) || 0;
        const weight = Number(mortalityData.weight) || 0;
        const rate = Number(mortalityData.rate) || 0;

        setMortalityData(prev => ({
            ...prev,
            avgWeight: birds > 0 ? Number((weight / birds).toFixed(2)) : 0,
            amount: Number((weight * rate).toFixed(2))
        }));
    }, [mortalityData.birds, mortalityData.weight, mortalityData.rate]);

    const [showWeightLossModal, setShowWeightLossModal] = useState(false);
    const [weightLossData, setWeightLossData] = useState({
        birds: 0,
        weight: '',
        avgWeight: 0,
        rate: 0,
        amount: 0,
        date: new Date().toISOString().split('T')[0]
    });

    // Auto-calculate Weight Loss Amount
    useEffect(() => {
        const weight = Number(weightLossData.weight) || 0;
        const rate = Number(weightLossData.rate) || 0;

        setWeightLossData(prev => ({
            ...prev,
            birds: 0,
            avgWeight: 0,
            amount: Number((weight * rate).toFixed(2))
        }));
    }, [weightLossData.weight, weightLossData.rate]);

    useEffect(() => {
        const birds = Number(saleData.birds) || 0;
        const weight = Number(saleData.weight) || 0;
        const rate = Number(saleData.rate) || 0;

        // Balance Calculation
        const saleOutBalance = Number(saleData.saleOutBalance) || 0; // Customer's current balance
        const amount = Number((weight * rate).toFixed(2));
        const cashPaid = Number(saleData.cashPaid) || 0;
        const onlinePaid = Number(saleData.onlinePaid) || 0;
        const discount = Number(saleData.discount) || 0;

        // Total Balance = Amount + Outstanding (Conceptually)
        // But logically: Balance = (Outstanding + Amount) - Paid - Discount
        const finalBalance = (saleOutBalance + amount) - cashPaid - onlinePaid - discount;

        setSaleData(prev => ({
            ...prev,
            avgWeight: birds > 0 ? Number((weight / birds).toFixed(2)) : 0,
            amount: amount,
            balance: Number(finalBalance.toFixed(2))
        }));
    }, [saleData.birds, saleData.weight, saleData.rate, saleData.cashPaid, saleData.onlinePaid, saleData.discount, saleData.saleOutBalance]);

    // Auto-generate Bill Number
    useEffect(() => {
        if (showSaleModal || showReceiptModal) {
            setSaleData(prev => ({
                ...prev,
                billNumber: `BILL-${Date.now().toString().slice(-6)}`
            }));
        }
    }, [showSaleModal, showReceiptModal]);


    // Fetch Data
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [stocksRes, vendorsRes, customersRes, ledgersRes] = await Promise.all([
                api.get('/inventory-stock'),
                api.get('/vendor?limit=1000'),
                api.get('/customer'),
                api.get('/ledger')
            ]);

            if (stocksRes.data.success) {
                const fetchedStocks = stocksRes.data.data;
                setStocks(fetchedStocks);

                // Check for Opening Stock (Admin only check)
                if (user?.role === 'admin' || user?.role === 'superadmin') {
                    const hasOpening = fetchedStocks.some(s => s.type === 'opening');
                    if (!hasOpening) {
                        setShowOpeningStockModal(true);
                    }
                }
            }
            if (vendorsRes.data.success) setVendors(vendorsRes.data.data || []);
            if (customersRes.data.success) setCustomers(customersRes.data.data || []); // customer api structure might vary
            if (ledgersRes.data.success) setLedgers(ledgersRes.data.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, purchaseData);
                alert("Purchase updated successfully!");
            } else {
                await api.post('/inventory-stock/purchase', purchaseData);
                alert("Purchase added successfully!");
            }
            setShowPurchaseModal(false);

            // Reset Form Data
            setPurchaseData({
                vendorId: '',
                vehicleNumber: '',
                birds: '',
                weight: '',
                avgWeight: 0,
                rate: '',
                amount: 0,
                refNo: '',
                date: new Date().toISOString().split('T')[0]
            });
            setSelectedVendor(null);
            setVendorSearchTerm('');
            setIsEditMode(false);
            setCurrentStockId(null);

            fetchInitialData();

        } catch (error) {
            alert(error.response?.data?.message || "Failed to save purchase");
        }
    };

    const handleSaleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, saleData);
                alert("Sale updated successfully!");
            } else {
                await api.post('/inventory-stock/sale', saleData);
                alert("Sale added successfully!");
            }
            setShowSaleModal(false);

            // Reset Sale Data
            setSaleData({
                customerId: '',
                billNumber: '',
                birds: '',
                weight: '',
                avgWeight: 0,
                rate: '',
                amount: 0,
                totalBalance: 0,
                cashPaid: 0,
                onlinePaid: 0,
                discount: 0,
                balance: 0,
                cashLedgerId: '',
                onlineLedgerId: '',
                saleOutBalance: 0,
                date: new Date().toISOString().split('T')[0]
            });
            setIsEditMode(false);
            setCurrentStockId(null);

            fetchInitialData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save sale");
        }
    };

    const handleReceiptSubmit = async (e) => {
        e.preventDefault();
        try {
            // Re-using saleData state for receipt for now or create separate if needed
            // Receipt is just Sale with 0 birds/weight/amount usually, but let's be cleaner
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, saleData);
                alert("Receipt updated successfully!");
            } else {
                await api.post('/inventory-stock/receipt', saleData);
                alert("Receipt added successfully!");
            }
            setShowReceiptModal(false);

            // Reset logic for Receipt (similar to Sale but concise)
            setSaleData({
                customerId: '',
                billNumber: '',
                birds: 0,
                weight: 0,
                avgWeight: 0,
                rate: 0,
                amount: 0,
                totalBalance: 0,
                cashPaid: 0,
                onlinePaid: 0,
                discount: 0,
                balance: 0,
                cashLedgerId: '',
                onlineLedgerId: '',
                saleOutBalance: 0,
                date: new Date().toISOString().split('T')[0]
            });
            setIsEditMode(false);
            setCurrentStockId(null);

            fetchInitialData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save receipt");
        }
    };

    const handleOpeningStockSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventory-stock/purchase', { // Re-using purchase endpoint? Or special opening type?
                ...openingStockData,
                type: 'opening',
                inventoryType: 'bird',
                amount: (Number(openingStockData.weight) * Number(openingStockData.rate))
            });

            setShowOpeningStockModal(false);
            setOpeningStockData({ birds: '', weight: '', rate: '', refNo: '', date: new Date().toISOString().split('T')[0] });
            fetchInitialData();
            alert("Opening Stock added successfully!");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to add opening stock");
        }
    };

    const handleMortalitySubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, mortalityData);
                alert("Mortality updated successfully!");
            } else {
                await api.post('/inventory-stock/mortality', mortalityData);
                alert("Mortality added successfully!");
            }
            setShowMortalityModal(false);
            fetchInitialData();
            setMortalityData({ birds: '', weight: '', avgWeight: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
            setIsEditMode(false);
            setCurrentStockId(null);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save mortality");
        }
    };

    const handleWeightLossSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, weightLossData);
                alert("Weight Loss/Gain updated successfully!");
            } else {
                await api.post('/inventory-stock/weight-loss', weightLossData);
                alert("Weight Loss/Gain added successfully!");
            }
            setShowWeightLossModal(false);
            fetchInitialData();
            setWeightLossData({ birds: 0, weight: '', avgWeight: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
            setIsEditMode(false);
            setCurrentStockId(null);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save weight loss/gain");
        }
    };

    // Helper to get bank ledgers
    const bankLedgers = ledgers.filter(l => l.group?.name?.toLowerCase().includes('bank'));
    const cashLedgers = ledgers.filter(l => l.group?.name?.toLowerCase().includes('cash'));

    // Vendor Search Logic
    const filteredVendors = vendors.filter(vendor =>
        (vendor.vendorName || '').toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
        (vendor.contactNumber || '').includes(vendorSearchTerm) ||
        (vendor.place || '').toLowerCase().includes(vendorSearchTerm.toLowerCase())
    );

    const handleVendorInputFocus = () => {
        setShowVendorDropdown(true);
    };

    const handleVendorInputBlur = () => {
        // Delay hiding to allow click event on dropdown item
        setTimeout(() => {
            setShowVendorDropdown(false);
        }, 200);
    };

    const handleVendorSelect = (vendor) => {
        setSelectedVendor(vendor);
        setVendorSearchTerm('');
        setPurchaseData(prev => ({ ...prev, vendorId: vendor._id || vendor.id }));
        setShowVendorDropdown(false);
        setHighlightedVendorIndex(-1);
    };

    const handleVendorKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedVendorIndex(prev =>
                prev < filteredVendors.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedVendorIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedVendorIndex >= 0 && highlightedVendorIndex < filteredVendors.length) {
                handleVendorSelect(filteredVendors[highlightedVendorIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowVendorDropdown(false);
        }
    };

    // Logic to handle customer selection and fetching balance
    const handleCustomerSelect = async (custId) => {
        const customer = customers.find(c => c._id === custId || c.id === custId);
        if (customer) {
            // Fetch latest balance incase local list is stale? For now use list.
            // Note: customer list from API usually has outstandingBalance
            setSaleData(prev => ({
                ...prev,
                customerId: custId,
                saleOutBalance: customer.outstandingBalance || 0 // Assuming 'amount' property or direct value
            }));
        } else {
            setSaleData(prev => ({ ...prev, customerId: custId, saleOutBalance: 0 }));
        }
    };

    // Filtered Stocks & Logic
    const rawPurchaseStocks = stocks.filter(s => s.type === 'purchase' || s.type === 'opening');
    const saleStocks = stocks.filter(s => s.type === 'sale' || s.type === 'receipt');
    const mortalityStock = stocks.find(s => s.type === 'mortality');
    const weightLossStock = stocks.find(s => s.type === 'weight_loss');

    // Sort Purchase Stocks: Opening Stock First, then by Date Descending
    const sortedPurchaseStocks = [...rawPurchaseStocks].sort((a, b) => {
        if (a.type === 'opening') return -1;
        if (b.type === 'opening') return 1;
        return new Date(b.date) - new Date(a.date);
    });

    // Calculate Totals for Purchases
    const totalBirds = sortedPurchaseStocks.reduce((sum, s) => sum + (Number(s.birds) || 0), 0);
    const totalWeight = sortedPurchaseStocks.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
    const totalAmount = sortedPurchaseStocks.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const totalAvg = totalBirds > 0 ? (totalWeight / totalBirds) : 0;
    const totalRate = totalWeight > 0 ? (totalAmount / totalWeight) : 0;

    // Calculate Totals for Sales
    const totalSaleBirds = saleStocks.reduce((sum, s) => sum + (Number(s.birds) || 0), 0);
    const totalSaleWeight = saleStocks.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
    const totalSaleAmount = saleStocks.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const totalSaleCash = saleStocks.reduce((sum, s) => sum + (Number(s.cashPaid) || 0), 0);
    const totalSaleOnline = saleStocks.reduce((sum, s) => sum + (Number(s.onlinePaid) || 0), 0);
    const totalSaleDiscount = saleStocks.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);

    const totalSaleAvg = totalSaleBirds > 0 ? (totalSaleWeight / totalSaleBirds) : 0;
    const totalSaleRate = totalSaleWeight > 0 ? (totalSaleAmount / totalSaleWeight) : 0;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Manage Stocks</h1>

            {/* Action Buttons - Only for Supervisor */}
            {isSupervisor && (
                <div className="flex gap-4 mb-8">
                    <button onClick={() => {
                        setIsEditMode(false);
                        setCurrentStockId(null);
                        setPurchaseData({
                            vendorId: '',
                            vehicleNumber: '',
                            birds: '',
                            weight: '',
                            avgWeight: 0,
                            rate: '',
                            amount: 0,
                            refNo: '',
                            date: new Date().toISOString().split('T')[0]
                        });
                        setSelectedVendor(null);
                        setVendorSearchTerm('');
                        setShowPurchaseModal(true);
                    }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Purchase</button>
                    <button onClick={() => {
                        setIsEditMode(false);
                        setCurrentStockId(null);
                        setSaleData({
                            customerId: '',
                            billNumber: '',
                            birds: '',
                            weight: '',
                            avgWeight: 0,
                            rate: '',
                            amount: 0,
                            totalBalance: 0,
                            cashPaid: 0,
                            onlinePaid: 0,
                            discount: 0,
                            balance: 0,
                            cashLedgerId: '',
                            onlineLedgerId: '',
                            saleOutBalance: 0,
                            date: new Date().toISOString().split('T')[0]
                        });
                        setShowSaleModal(true);
                    }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Add Sale</button>
                    <button onClick={() => {
                        setIsEditMode(false);
                        setCurrentStockId(null);
                        setSaleData({
                            customerId: '',
                            billNumber: '',
                            birds: 0,
                            weight: 0,
                            avgWeight: 0,
                            rate: 0,
                            amount: 0,
                            totalBalance: 0,
                            cashPaid: 0,
                            onlinePaid: 0,
                            discount: 0,
                            balance: 0,
                            cashLedgerId: '',
                            onlineLedgerId: '',
                            saleOutBalance: 0,
                            date: new Date().toISOString().split('T')[0]
                        });
                        setShowReceiptModal(true);
                    }} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Add Receipt</button>
                    <button
                        onClick={() => {
                            if (mortalityStock) {
                                // Edit Mode
                                setIsEditMode(true);
                                setCurrentStockId(mortalityStock._id);
                                setMortalityData({
                                    birds: mortalityStock.birds,
                                    weight: mortalityStock.weight,
                                    avgWeight: mortalityStock.avgWeight,
                                    rate: mortalityStock.rate,
                                    amount: mortalityStock.amount,
                                    date: mortalityStock.date ? new Date(mortalityStock.date).toISOString().split('T')[0] : ''
                                });
                                setShowMortalityModal(true);
                            } else {
                                // Add Mode
                                setIsEditMode(false);
                                setCurrentStockId(null);
                                setMortalityData({
                                    birds: '',
                                    weight: '',
                                    avgWeight: 0,
                                    rate: totalRate.toFixed(2),
                                    amount: 0,
                                    date: new Date().toISOString().split('T')[0]
                                });
                                setShowMortalityModal(true);
                            }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        {mortalityStock ? 'Edit Birds Mortality' : 'Add Birds Mortality'}
                    </button>
                    <button
                        onClick={() => {
                            if (weightLossStock) {
                                // Edit Mode
                                setIsEditMode(true);
                                setCurrentStockId(weightLossStock._id);
                                setWeightLossData({
                                    birds: 0,
                                    weight: weightLossStock.weight,
                                    avgWeight: 0,
                                    rate: weightLossStock.rate,
                                    amount: weightLossStock.amount,
                                    date: weightLossStock.date ? new Date(weightLossStock.date).toISOString().split('T')[0] : ''
                                });
                                setShowWeightLossModal(true);
                            } else {
                                // Add Mode
                                setIsEditMode(false);
                                setCurrentStockId(null);
                                setWeightLossData({
                                    birds: 0,
                                    weight: '',
                                    avgWeight: 0,
                                    rate: totalRate.toFixed(2), // Use Total Purchase Rate
                                    amount: 0,
                                    date: new Date().toISOString().split('T')[0]
                                });
                                setShowWeightLossModal(true);
                            }
                        }}
                        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                    >
                        {weightLossStock ? 'Edit Weight Loss/Gain' : 'Add Weight Loss / Weight ON'}
                    </button>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Add Feed Purchase</button>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Add Feed Consume</button>
                </div>
            )}

            {/* Purchases Details Table */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 bg-gray-100 p-2">PURCHASES DETAILS</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-orange-100">
                                <th className="border p-2">S N</th>
                                <th className="border p-2">SUPPLIERS</th>
                                <th className="border p-2">DC NO</th>
                                <th className="border p-2">BIRDS</th>
                                <th className="border p-2">WEIGHT</th>
                                <th className="border p-2">AVG</th>
                                <th className="border p-2">RATE</th>
                                <th className="border p-2">AMOUNT</th>
                                <th className="border p-2">SUPERVISOR</th>
                                <th className="border p-2">VEHICLE</th>
                                <th className="border p-2">DATE</th>
                                <th className="border p-2">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPurchaseStocks.map((stock, index) => {
                                // Serial Number Logic: Opening Stock is 0. If Opening exists, next is 1 (index match).
                                // If list is [OP, P1], indices 0, 1. OP=0, P1=1.
                                const serialNo = stock.type === 'opening' ? 0 : (sortedPurchaseStocks[0]?.type === 'opening' ? index : index + 1);

                                return (
                                    <tr key={index} className="text-center">
                                        <td className="border p-2">{serialNo}</td>
                                        <td className="border p-2 font-medium">
                                            {stock.type === 'opening' ? 'OP STOCK' : (stock.vendorId?.vendorName || (stock.vendorId?.name) || (typeof stock.vendorId === 'object' ? stock.vendorId.vendorName : '') || 'N/A')}
                                        </td>
                                        <td className="border p-2">
                                            {stock.source === 'trip' && stock.tripId ? (
                                                <Link to={isSupervisor ? `/supervisor/trips/${stock.tripId}` : `/trips/${stock.tripId}`} className="text-blue-600 underline hover:text-blue-800">
                                                    {stock.refNo || stock.billNumber || `${stock.tripIdDisplay}`}
                                                </Link>
                                            ) : (
                                                stock.refNo || stock.billNumber || '-'
                                            )}
                                        </td>
                                        <td className="border p-2">{stock.birds}</td>
                                        <td className="border p-2">{stock.weight?.toFixed(2)}</td>
                                        <td className="border p-2">{((stock.weight && stock.birds) ? (stock.weight / stock.birds) : 0).toFixed(2)}</td>
                                        <td className="border p-2">{stock.rate?.toFixed(2)}</td>
                                        <td className="border p-2">{stock.amount?.toFixed(2)}</td>
                                        <td className="border p-2">{stock.supervisorId?.name || 'N/A'}</td>
                                        <td className="border p-2">{stock.vehicleId?.vehicleNumber || stock.vehicleNumber || 'N/A'}</td>
                                        <td className="border p-2">{new Date(stock.date).toLocaleDateString()}</td>
                                        <td className="border p-2">
                                            {stock.source !== 'trip' && (
                                                <button
                                                    onClick={() => {
                                                        if (stock.source === 'trip') {
                                                            alert("Cannot edit trip stock here.");
                                                            return;
                                                        }
                                                        setIsEditMode(true);
                                                        setCurrentStockId(stock._id);
                                                        setPurchaseData({
                                                            vendorId: stock.vendorId?._id || stock.vendorId?.id || '',
                                                            vehicleNumber: stock.vehicleNumber || stock.vehicleId?.vehicleNumber || '',
                                                            birds: stock.birds,
                                                            weight: stock.weight,
                                                            avgWeight: stock.avgWeight || (stock.birds > 0 ? (stock.weight / stock.birds).toFixed(2) : 0),
                                                            rate: stock.rate,
                                                            amount: stock.amount,
                                                            refNo: stock.refNo || '',
                                                            date: stock.date ? new Date(stock.date).toISOString().split('T')[0] : ''
                                                        });
                                                        // Pre-select vendor for display
                                                        const v = vendors.find(v => v._id === (stock.vendorId?._id || stock.vendorId?.id));
                                                        if (v) {
                                                            setSelectedVendor(v);
                                                            setVendorSearchTerm('');
                                                        } else if (stock.vendorId && stock.vendorId.vendorName) {
                                                            setSelectedVendor(stock.vendorId);
                                                        }
                                                        setShowPurchaseModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    EDIT
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {/* Totals Row */}
                            <tr className="bg-black text-white font-bold text-center">
                                <td className="border p-2" colSpan={3}>TOTAL</td>
                                <td className="border p-2">{totalBirds}</td>
                                <td className="border p-2">{totalWeight.toFixed(2)}</td>
                                <td className="border p-2">{totalAvg.toFixed(2)}</td>
                                <td className="border p-2">{totalRate.toFixed(2)}</td>
                                <td className="border p-2">{totalAmount.toFixed(0)}</td>
                                <td className="border p-2" colSpan={4}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sales Details Table */}
            <div>
                <h2 className="text-lg font-semibold mb-4 bg-gray-100 p-2">SALES DETAILS</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border p-2">S N</th>
                                <th className="border p-2">DATE</th>
                                <th className="border p-2">PARTICULAR</th>
                                <th className="border p-2">DELIVERY DETAILS</th>
                                <th className="border p-2">BILL NO</th>
                                <th className="border p-2">BIRDS</th>
                                <th className="border p-2">WEIGHT</th>
                                <th className="border p-2">AVG</th>
                                <th className="border p-2">RATE</th>
                                <th className="border p-2">TOTAL</th>
                                <th className="border p-2">CASH</th>
                                <th className="border p-2">ONLINE</th>
                                <th className="border p-2">DISCOUNT</th>
                                <th className="border p-2">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...saleStocks].sort((a, b) => new Date(b.date) - new Date(a.date)).map((sale, index) => (
                                <tr key={index} className="text-center">
                                    <td className="border p-2">{index + 1}</td>
                                    <td className="border p-2">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="border p-2">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${sale.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {sale.type === 'sale' ? 'STOCK_SALE' : 'STOCK_RECEIPT'}
                                        </span>
                                    </td>
                                    <td className="border p-2 font-medium">{sale.customerId?.shopName || sale.customerId?.ownerName || 'N/A'}</td>
                                    <td className="border p-2">{sale.billNumber || '-'}</td>
                                    <td className="border p-2">{sale.birds}</td>
                                    <td className="border p-2">{sale.weight?.toFixed(2)}</td>
                                    <td className="border p-2">{((sale.weight && sale.birds) ? (sale.weight / sale.birds) : 0).toFixed(2)}</td>
                                    <td className="border p-2">{sale.rate?.toFixed(2)}</td>
                                    <td className="border p-2">{sale.amount?.toFixed(2)}</td>
                                    <td className="border p-2">{sale.cashPaid || 0}</td>
                                    <td className="border p-2">{sale.onlinePaid || 0}</td>
                                    <td className="border p-2">{sale.discount || 0}</td>
                                    <td className="border p-2">
                                        <button
                                            onClick={() => {
                                                setIsEditMode(true);
                                                setCurrentStockId(sale._id);
                                                setSaleData({
                                                    customerId: sale.customerId?._id || sale.customerId?.id || '',
                                                    billNumber: sale.billNumber || '',
                                                    birds: sale.birds || 0,
                                                    weight: sale.weight || 0,
                                                    avgWeight: sale.avgWeight || 0,
                                                    rate: sale.rate || 0,
                                                    amount: sale.amount || 0,
                                                    // We don't have totalBalance from backend stock usually, so we let effect calc it or set 0
                                                    totalBalance: 0,
                                                    cashPaid: sale.cashPaid || 0,
                                                    onlinePaid: sale.onlinePaid || 0,
                                                    discount: sale.discount || 0,
                                                    balance: sale.balance || 0,
                                                    cashLedgerId: sale.cashLedgerId || '',
                                                    onlineLedgerId: sale.onlineLedgerId || '',
                                                    // saleOutBalance: customer balance logic? Might be tricky to get "balance at that time".
                                                    // For now, let's fetch current customer balance or leave 0.
                                                    saleOutBalance: sale.customerId?.outstandingBalance || 0,
                                                    date: sale.date ? new Date(sale.date).toISOString().split('T')[0] : ''
                                                });

                                                if (sale.type === 'receipt') {
                                                    setShowReceiptModal(true);
                                                } else {
                                                    setShowSaleModal(true);
                                                }
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            EDIT
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-black text-white font-bold text-center">
                                <td className="border p-2" colSpan={5}>TOTAL</td>
                                <td className="border p-2">{totalSaleBirds}</td>
                                <td className="border p-2">{totalSaleWeight.toFixed(2)}</td>
                                <td className="border p-2">{totalSaleAvg.toFixed(2)}</td>
                                <td className="border p-2">{totalSaleRate.toFixed(2)}</td>
                                <td className="border p-2">{totalSaleAmount.toFixed(0)}</td>
                                <td className="border p-2">{totalSaleCash}</td>
                                <td className="border p-2">{totalSaleOnline}</td>
                                <td className="border p-2">{totalSaleDiscount}</td>
                                <td className="border p-2"></td>
                            </tr>
                            <tr className="bg-white text-center">
                                <td className="border p-2 italic" colSpan={3}>BIRDS MORTALITY</td>
                                <td className="border p-2" colSpan={2}></td>
                                <td className="border p-2">{mortalityStock ? mortalityStock.birds : '-'}</td>
                                <td className="border p-2">{mortalityStock ? mortalityStock.weight?.toFixed(2) : '-'}</td>
                                <td className="border p-2">{mortalityStock ? ((mortalityStock.weight / mortalityStock.birds) || 0).toFixed(2) : '-'}</td>
                                <td className="border p-2">{mortalityStock ? mortalityStock.rate?.toFixed(2) : '-'}</td>
                                <td className="border p-2">{mortalityStock ? mortalityStock.amount?.toFixed(0) : '-'}</td>
                                <td className="border p-2" colSpan={3}></td>
                                <td className="border p-2">
                                    {mortalityStock && (
                                        <button
                                            onClick={() => {
                                                setIsEditMode(true);
                                                setCurrentStockId(mortalityStock._id);
                                                setMortalityData({
                                                    birds: mortalityStock.birds,
                                                    weight: mortalityStock.weight,
                                                    avgWeight: mortalityStock.avgWeight,
                                                    rate: mortalityStock.rate,
                                                    amount: mortalityStock.amount,
                                                    date: mortalityStock.date ? new Date(mortalityStock.date).toISOString().split('T')[0] : ''
                                                });
                                                setShowMortalityModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                            <tr className="bg-white text-center">
                                <td className="border p-2 italic" colSpan={3}>WEIGHT LOSS/ WEIGHT ON</td>
                                <td className="border p-2" colSpan={2}></td>
                                <td className="border p-2">0</td>
                                <td className="border p-2">{weightLossStock ? weightLossStock.weight?.toFixed(2) : '-'}</td>
                                <td className="border p-2">0.00</td>
                                <td className="border p-2">{weightLossStock ? weightLossStock.rate?.toFixed(2) : '-'}</td>
                                <td className="border p-2">{weightLossStock ? weightLossStock.amount?.toFixed(0) : '-'}</td>
                                <td className="border p-2" colSpan={3}></td>
                                <td className="border p-2">
                                    {weightLossStock && (
                                        <button
                                            onClick={() => {
                                                setIsEditMode(true);
                                                setCurrentStockId(weightLossStock._id);
                                                setWeightLossData({
                                                    birds: 0,
                                                    weight: weightLossStock.weight,
                                                    avgWeight: 0,
                                                    rate: weightLossStock.rate,
                                                    amount: weightLossStock.amount,
                                                    date: weightLossStock.date ? new Date(weightLossStock.date).toISOString().split('T')[0] : ''
                                                });
                                                setShowWeightLossModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                            {/* TOTAL W LOSS Row */}
                            <tr className="bg-black text-white font-bold text-center">
                                <td className="border p-2 italic" colSpan={3}>TOTAL W LOSS</td>
                                <td className="border p-2" colSpan={2}></td>
                                <td className="border p-2">
                                    {(Number(mortalityStock?.birds) || 0) + (Number(weightLossStock?.birds) || 0)}
                                </td>
                                <td className="border p-2">
                                    {((Number(mortalityStock?.weight) || 0) + (Number(weightLossStock?.weight) || 0)).toFixed(2)}
                                </td>
                                <td className="border p-2"></td>
                                <td className="border p-2">
                                    {(() => {
                                        const totalWeight = (Number(mortalityStock?.weight) || 0) + (Number(weightLossStock?.weight) || 0);
                                        const totalAmount = (Number(mortalityStock?.amount) || 0) + (Number(weightLossStock?.amount) || 0);
                                        return totalWeight !== 0 ? (totalAmount / totalWeight).toFixed(2) : '0.00';
                                    })()}
                                </td>
                                <td className="border p-2">
                                    {((Number(mortalityStock?.amount) || 0) + (Number(weightLossStock?.amount) || 0)).toFixed(0)}
                                </td>
                                <td className="border p-2" colSpan={4}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showPurchaseModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Purchase' : 'Add Purchase'}</h3>
                        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Vendor <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedVendor ? `${selectedVendor.vendorName} - ${selectedVendor.contactNumber || 'N/A'}` : vendorSearchTerm}
                                        onChange={(e) => {
                                            setVendorSearchTerm(e.target.value);
                                            setSelectedVendor(null);
                                            setPurchaseData(prev => ({ ...prev, vendorId: '' }));
                                            setHighlightedVendorIndex(-1);
                                        }}
                                        onFocus={handleVendorInputFocus}
                                        onBlur={handleVendorInputBlur}
                                        onKeyDown={handleVendorKeyDown}
                                        placeholder="Search vendor by name, contact or place..."
                                        className={`w-full border p-2 rounded ${!purchaseData.vendorId ? 'border-red-300' : 'border-gray-300'}`}
                                        autoComplete="off"
                                    />
                                    {selectedVendor && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedVendor(null);
                                                setVendorSearchTerm('');
                                                setPurchaseData(prev => ({ ...prev, vendorId: '' }));
                                                setHighlightedVendorIndex(-1);
                                            }}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}

                                    {showVendorDropdown && filteredVendors.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                                            {filteredVendors.map((vendor, index) => (
                                                <div
                                                    key={vendor._id || vendor.id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent blur before click
                                                        handleVendorSelect(vendor);
                                                    }}
                                                    onMouseEnter={() => setHighlightedVendorIndex(index)}
                                                    className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm ${index === highlightedVendorIndex
                                                        ? 'bg-blue-100 border-blue-200'
                                                        : 'hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <div className="font-medium text-gray-900">{vendor.vendorName}</div>
                                                    <div className="text-xs text-gray-500">{vendor.contactNumber}</div>
                                                    {vendor.place && (
                                                        <div className="text-xs text-gray-400">Place: {vendor.place}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showVendorDropdown && filteredVendors.length === 0 && vendorSearchTerm.trim() !== '' && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                                            <div className="px-3 py-2 text-gray-500 text-center text-sm">
                                                No vendors found
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Vehicle Number <span className="text-red-500">*</span></label>
                                    <input type="text" value={purchaseData.vehicleNumber} onChange={e => setPurchaseData({ ...purchaseData, vehicleNumber: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">DC NO <span className="text-red-500">*</span></label>
                                    <input type="text" value={purchaseData.refNo} onChange={e => setPurchaseData({ ...purchaseData, refNo: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Birds <span className="text-red-500">*</span></label>
                                    <input type="number" value={purchaseData.birds} onChange={e => setPurchaseData({ ...purchaseData, birds: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                    <input type="number" value={purchaseData.weight} onChange={e => setPurchaseData({ ...purchaseData, weight: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">AVG (Kg/bird)</label>
                                    <input type="number" value={purchaseData.avgWeight} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Rate <span className="text-red-500">*</span></label>
                                    <input type="number" value={purchaseData.rate} onChange={e => setPurchaseData({ ...purchaseData, rate: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Amount</label>
                                <input type="number" value={purchaseData.amount} className="w-full border p-2 rounded bg-gray-100" readOnly />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sale Modal */}
            {(showSaleModal || showReceiptModal) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{showReceiptModal ? 'Add Receipt' : 'Add Sale'}</h3>
                        <form onSubmit={showReceiptModal ? handleReceiptSubmit : handleSaleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Customer <span className="text-red-500">*</span></label>
                                <select
                                    value={saleData.customerId}
                                    onChange={e => handleCustomerSelect(e.target.value)}
                                    className="w-full border p-2 rounded"
                                    required
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map(c => (
                                        <option key={c._id || c.id} value={c._id || c.id}>{c.shopName} - {c.ownerName}</option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-500 mt-1">Current Balance: {saleData.saleOutBalance}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Bill Number</label>
                                <input type="text" value={saleData.billNumber} className="w-full border p-2 rounded bg-gray-100" readOnly />
                            </div>

                            {!showReceiptModal && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium">Birds <span className="text-red-500">*</span></label>
                                            <input type="number" value={saleData.birds} onChange={e => setSaleData({ ...saleData, birds: e.target.value })} className="w-full border p-2 rounded" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                            <input type="number" value={saleData.weight} onChange={e => setSaleData({ ...saleData, weight: e.target.value })} className="w-full border p-2 rounded" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium">AVG (Kg/bird)</label>
                                            <input type="number" value={saleData.avgWeight} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Rate <span className="text-red-500">*</span></label>
                                            <input type="number" value={saleData.rate} onChange={e => setSaleData({ ...saleData, rate: e.target.value })} className="w-full border p-2 rounded" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Amount</label>
                                        <input type="number" value={saleData.amount} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                    </div>
                                </>
                            )}

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-semibold mb-2">Payment Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Cash Paid</label>
                                        <input type="number" value={saleData.cashPaid} onChange={e => setSaleData({ ...saleData, cashPaid: e.target.value })} className="w-full border p-2 rounded" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium">Online Paid</label>
                                        <input type="number" value={saleData.onlinePaid} onChange={e => setSaleData({ ...saleData, onlinePaid: e.target.value })} className="w-full border p-2 rounded" />
                                    </div>
                                    {Number(saleData.onlinePaid) > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium">Bank Ledger <span className="text-red-500">*</span></label>
                                            <select value={saleData.onlineLedgerId} onChange={e => setSaleData({ ...saleData, onlineLedgerId: e.target.value })} className="w-full border p-2 rounded" required>
                                                <option value="">Select Bank Ledger</option>
                                                {bankLedgers.map(l => <option key={l._id || l.id} value={l._id || l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium">Discount</label>
                                        <input type="number" value={saleData.discount} onChange={e => setSaleData({ ...saleData, discount: e.target.value })} className="w-full border p-2 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Final Balance</label>
                                        <input type="number" value={saleData.balance} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => { setShowSaleModal(false); setShowReceiptModal(false); }} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Opening Stock Modal */}
            {showOpeningStockModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">Add Opening Stock</h3>
                        <form onSubmit={handleOpeningStockSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Birds <span className="text-red-500">*</span></label>
                                    <input type="number" value={openingStockData.birds} onChange={e => setOpeningStockData({ ...openingStockData, birds: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                    <input type="number" value={openingStockData.weight} onChange={e => setOpeningStockData({ ...openingStockData, weight: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Rate <span className="text-red-500">*</span></label>
                                    <input type="number" value={openingStockData.rate} onChange={e => setOpeningStockData({ ...openingStockData, rate: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Ref No (DC No)</label>
                                    <input type="text" value={openingStockData.refNo} onChange={e => setOpeningStockData({ ...openingStockData, refNo: e.target.value })} className="w-full border p-2 rounded" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mortality Modal */}
            {showMortalityModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Birds Mortality' : 'Add Birds Mortality'}</h3>
                        <form onSubmit={handleMortalitySubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Birds <span className="text-red-500">*</span></label>
                                    <input type="number" value={mortalityData.birds} onChange={e => setMortalityData({ ...mortalityData, birds: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                    <input type="number" value={mortalityData.weight} onChange={e => setMortalityData({ ...mortalityData, weight: e.target.value })} className="w-full border p-2 rounded" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">AVG (Kg/bird)</label>
                                    <input type="number" value={mortalityData.avgWeight} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Rate</label>
                                    <input type="number" value={mortalityData.rate} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Amount</label>
                                <input type="number" value={mortalityData.amount} className="w-full border p-2 rounded bg-gray-100" readOnly />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowMortalityModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Weight Loss / Weight ON Modal */}
            {showWeightLossModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Weight Loss/Gain' : 'Add Weight Loss / Weight ON'}</h3>
                        <form onSubmit={handleWeightLossSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Birds (Readonly)</label>
                                    <input type="number" value={0} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                    <input type="number" value={weightLossData.weight} onChange={e => setWeightLossData({ ...weightLossData, weight: e.target.value })} className="w-full border p-2 rounded" required placeholder="Enter weight loss (negative) or gain (positive)" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">AVG (Kg/bird)</label>
                                    <input type="number" value={0} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Rate</label>
                                    <input type="number" value={weightLossData.rate} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Amount</label>
                                <input type="number" value={weightLossData.amount} className="w-full border p-2 rounded bg-gray-100" readOnly />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowWeightLossModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageStocks;



