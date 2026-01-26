import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, FileText, CheckCircle, Save, X, Edit, Trash2, Download, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const ManageStocks = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dateParam = searchParams.get('date');

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

    // Customer Search State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);

    // Modals
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
    const { user } = useAuth();
    const isSupervisor = user?.role === 'supervisor';

    useEffect(() => {
        if (user?.role === 'supervisor' && !user?.canManageStock) {
            navigate('/');
        }
    }, [user, navigate]);

    // Forms Data
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStockId, setCurrentStockId] = useState(null);

    const defaultDate = dateParam || new Date().toISOString().split('T')[0];

    const [purchaseData, setPurchaseData] = useState({
        vendorId: '',
        vehicleNumber: '', // Text input as per requirement
        birds: '',
        weight: '',
        avgWeight: 0,
        rate: '',
        amount: 0,
        refNo: '',
        date: defaultDate
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
        date: defaultDate
    });

    const [openingStockData, setOpeningStockData] = useState({
        birds: '',
        weight: '',
        rate: '',
        refNo: '',
        date: defaultDate
    });

    // Calculate Avg and Amount Effects
    const [showMortalityModal, setShowMortalityModal] = useState(false);
    const [mortalityData, setMortalityData] = useState({
        birds: '',
        weight: '',
        avgWeight: 0,
        rate: 0,
        amount: 0,
        date: defaultDate
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
        date: defaultDate
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

    const [showFeedPurchaseModal, setShowFeedPurchaseModal] = useState(false);
    const [feedPurchaseData, setFeedPurchaseData] = useState({
        vendorId: '',
        bags: '',
        weight: '',
        rate: '',
        amount: 0,
        date: defaultDate
    });

    // Auto-calculate Feed Purchase Amount
    useEffect(() => {
        const weight = Number(feedPurchaseData.weight) || 0;
        const rate = Number(feedPurchaseData.rate) || 0;

        setFeedPurchaseData(prev => ({
            ...prev,
            amount: Number((weight * rate).toFixed(2))
        }));
    }, [feedPurchaseData.weight, feedPurchaseData.rate]);

    const [showFeedConsumeModal, setShowFeedConsumeModal] = useState(false);
    const [feedConsumeData, setFeedConsumeData] = useState({
        bags: '',
        weight: '',
        rate: '',
        amount: 0,
        amount: 0,
        date: defaultDate
    });

    // Auto-calculate Feed Consume Amount
    useEffect(() => {
        const weight = Number(feedConsumeData.weight) || 0;
        const rate = Number(feedConsumeData.rate) || 0;

        setFeedConsumeData(prev => ({
            ...prev,
            amount: Number((weight * rate).toFixed(2))
        }));
    }, [feedConsumeData.weight, feedConsumeData.rate]);

    const [showFeedOpeningStockModal, setShowFeedOpeningStockModal] = useState(false);
    const [feedOpeningStockData, setFeedOpeningStockData] = useState({
        bags: '',
        weight: '',
        rate: '',
        date: defaultDate
    });

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


    const [prevFeedConsumedAmount, setPrevFeedConsumedAmount] = useState(0);

    // Fetch Data
    useEffect(() => {
        fetchInitialData();
    }, [dateParam]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const targetDate = dateParam || new Date().toISOString().split('T')[0];
            const prevDateObj = new Date(targetDate);
            prevDateObj.setDate(prevDateObj.getDate() - 1);
            const prevDateStr = prevDateObj.toISOString().split('T')[0];

            const [stocksRes, vendorsRes, customersRes, ledgersRes, prevStocksRes] = await Promise.all([
                api.get('/inventory-stock', { params: dateParam ? { startDate: dateParam, endDate: dateParam } : {} }),
                api.get('/vendor?limit=1000'),
                api.get('/customer'),
                api.get('/ledger'),
                api.get('/inventory-stock', { params: { startDate: prevDateStr, endDate: prevDateStr } })
            ]);

            if (stocksRes.data.success) {
                const fetchedStocks = stocksRes.data.data;
                setStocks(fetchedStocks);

                // Check for Opening Stock (Admin only check) - Only when not filtering by date
                if (!dateParam && (user?.role === 'admin' || user?.role === 'superadmin')) {
                    const hasBirdOpening = fetchedStocks.some(s => s.type === 'opening' && s.inventoryType !== 'feed');
                    const hasFeedOpening = fetchedStocks.some(s => s.type === 'opening' && s.inventoryType === 'feed');

                    if (!hasBirdOpening) {
                        setShowOpeningStockModal(true);
                    }
                    // Sequential check: if bird opening modal is shown, maybe wait? 
                    // But for simplicity, we can just show feed modal if bird modal is not showing, 
                    // or let them overlap (user handles one then other).
                    // Better UX: Show Feed Opening only if Bird Opening is present OR after Bird Opening is closed?
                    // For now, let's just trigger it if missing. React state might handle batching or stacking.
                    if (!hasFeedOpening) {
                        setShowFeedOpeningStockModal(true);
                    }
                }
            }

            if (prevStocksRes.data.success) {
                const prevStocks = prevStocksRes.data.data;
                const prevFeedConsume = prevStocks.filter(s => s.inventoryType === 'feed' && s.type === 'consume');
                const prevTotal = prevFeedConsume.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                setPrevFeedConsumedAmount(prevTotal);
            } else {
                setPrevFeedConsumedAmount(0);
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
                vehicleNumber: '', // Text input as per requirement
                birds: '',
                weight: '',
                avgWeight: 0,
                rate: '',
                amount: 0,
                refNo: '',
                date: defaultDate
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
                console.log("saleData updated", saleData)
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
                saleOutBalance: 0,
                date: defaultDate
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
                saleOutBalance: 0,
                date: defaultDate
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
            setOpeningStockData({ birds: '', weight: '', rate: '', refNo: '', date: defaultDate });
            fetchInitialData();
            alert("Opening Stock added successfully!");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to add opening stock");
        }
    };

    const handleFeedOpeningStockSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                // Update implementation
                await api.put(`/inventory-stock/${currentStockId}`, {
                    ...feedOpeningStockData,
                    type: 'opening',
                    inventoryType: 'feed',
                    birds: 0,
                    amount: (Number(feedOpeningStockData.weight) * Number(feedOpeningStockData.rate))
                });
                alert("Feed Opening Stock updated successfully!");
            } else {
                // Add implementation
                await api.post('/inventory-stock/purchase', {
                    ...feedOpeningStockData,
                    type: 'opening',
                    inventoryType: 'feed',
                    birds: 0,
                    amount: (Number(feedOpeningStockData.weight) * Number(feedOpeningStockData.rate))
                });
                alert("Feed Opening Stock added successfully!");
            }

            setShowFeedOpeningStockModal(false);
            setFeedOpeningStockData({ weight: '', rate: '', date: defaultDate });
            setIsEditMode(false);
            setCurrentStockId(null);
            fetchInitialData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save feed opening stock");
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
            setMortalityData({ birds: '', weight: '', avgWeight: 0, rate: 0, amount: 0, date: defaultDate });
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
            setWeightLossData({ birds: 0, weight: '', avgWeight: 0, rate: 0, amount: 0, date: defaultDate });
            setIsEditMode(false);
            setCurrentStockId(null);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save weight loss/gain");
        }
    };

    const [showNaturalWeightLossModal, setShowNaturalWeightLossModal] = useState(false);
    const [naturalWeightLossData, setNaturalWeightLossData] = useState({
        birds: '', // Not used, but keeping structure
        weight: '',
        rate: 0,
        amount: 0,
        date: defaultDate,
        type: 'natural_weight_loss' // Explicit type for controller
    });

    // Auto-calculate Natural Weight Loss Amount
    useEffect(() => {
        const weight = Number(naturalWeightLossData.weight) || 0;
        const rate = Number(naturalWeightLossData.rate) || 0;

        setNaturalWeightLossData(prev => ({
            ...prev,
            amount: Number((weight * rate).toFixed(2))
        }));
    }, [naturalWeightLossData.weight, naturalWeightLossData.rate]);

    const handleNaturalWeightLossSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, { ...naturalWeightLossData, type: 'natural_weight_loss' });
                alert("Natural Weight Loss updated successfully!");
            } else {
                // Determine which endpoint to use. standard weight-loss endpoint can be reused if we pass type?
                // The controller for 'weight-loss' endpoint forces type 'weight_loss' usually unless modified.
                // We modified the controller to accept type from body if present.
                await api.post('/inventory-stock/weight-loss', { ...naturalWeightLossData, type: 'natural_weight_loss' });
                alert("Natural Weight Loss added successfully!");
            }
            setShowNaturalWeightLossModal(false);
            fetchInitialData();
            setNaturalWeightLossData({ birds: '', weight: '', rate: 0, amount: 0, date: defaultDate, type: 'natural_weight_loss' });
            setIsEditMode(false);
            setCurrentStockId(null);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save natural weight loss");
        }
    };

    const handleFeedPurchaseSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, {
                    ...feedPurchaseData,
                    inventoryType: 'feed',
                    birds: 0
                });
                alert("Feed Purchase updated successfully!");
            } else {
                await api.post('/inventory-stock/purchase', {
                    ...feedPurchaseData,
                    inventoryType: 'feed',
                    birds: 0
                });
                alert("Feed Purchase added successfully!");
            }
            setShowFeedPurchaseModal(false);
            setFeedPurchaseData({
                vendorId: '',
                weight: '',
                rate: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0]
            });
            setIsEditMode(false);
            setCurrentStockId(null);
            fetchInitialData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save feed purchase");
        }
    };

    const handleFeedConsumeSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && currentStockId) {
                await api.put(`/inventory-stock/${currentStockId}`, {
                    ...feedConsumeData,
                    inventoryType: 'feed',
                    type: 'consume',
                    birds: 0
                });
                alert("Feed Consumption updated successfully!");
            } else {
                await api.post('/inventory-stock/consume', {
                    ...feedConsumeData,
                    inventoryType: 'feed',
                    birds: 0
                });
                alert("Feed Consumption added successfully!");
            }
            setShowFeedConsumeModal(false);
            setFeedConsumeData({
                weight: '',
                rate: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0]
            });
            setIsEditMode(false);
            setCurrentStockId(null);
            fetchInitialData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save feed consumption");
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
    console.log("filteredVendors", filteredVendors);

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
        console.log("vendor", vendor);
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

    // Customer Search Logic
    const filteredCustomers = customers.filter(customer =>
        (customer.shopName || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (customer.ownerName || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (customer.contact || '').includes(customerSearchTerm)
    );

    const handleCustomerInputFocus = () => {
        setShowCustomerDropdown(true);
    };

    const handleCustomerInputBlur = () => {
        setTimeout(() => {
            setShowCustomerDropdown(false);
        }, 200);
    };

    const handleCustomerSelectItem = (customer) => {
        setSelectedCustomer(customer);
        setCustomerSearchTerm('');
        handleCustomerSelect(customer._id || customer.id); // Call existing handler
        setShowCustomerDropdown(false);
        setHighlightedCustomerIndex(-1);
    };

    const handleCustomerKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedCustomerIndex(prev =>
                prev < filteredCustomers.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedCustomerIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedCustomerIndex >= 0 && highlightedCustomerIndex < filteredCustomers.length) {
                handleCustomerSelectItem(filteredCustomers[highlightedCustomerIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowCustomerDropdown(false);
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
    const rawPurchaseStocks = stocks.filter(s => (s.type === 'purchase' || s.type === 'opening') && s.inventoryType !== 'feed');
    const feedPurchaseStocks = stocks.filter(s => (s.type === 'purchase' || s.type === 'opening') && s.inventoryType === 'feed');
    const feedConsumeStocks = stocks.filter(s => s.type === 'consume' && s.inventoryType === 'feed');

    // Sort Feed Consume: by Date Descending
    const sortedFeedConsumeStocks = [...feedConsumeStocks].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Sort Feed Stocks: Opening Stock First, then by Date Descending
    const sortedFeedStocks = [...feedPurchaseStocks].sort((a, b) => {
        if (a.type === 'opening') return -1;
        if (b.type === 'opening') return 1;
        return new Date(b.date) - new Date(a.date);
    });
    const saleStocks = stocks.filter(s => s.type === 'sale' || s.type === 'receipt');
    const mortalityStock = stocks.find(s => s.type === 'mortality');
    const weightLossStock = stocks.find(s => s.type === 'weight_loss');
    const naturalWeightLossStock = stocks.find(s => s.type === 'natural_weight_loss');

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

    const handleExportToExcel = () => {
        // Prepare data matching the visible tables
        const wb = XLSX.utils.book_new();

        // 1. Purchase Sheet
        const purchaseSheetData = sortedPurchaseStocks.map((s, i) => ({
            'S N': i + 1,
            'Supplier': s.vendorId?.vendorName || 'N/A',
            'DC No': s.refNo || '-',
            'Birds': s.birds,
            'Weight': s.weight,
            'Avg': s.avgWeight,
            'Rate': s.rate,
            'Amount': s.amount
        }));
        purchaseSheetData.push({
            'S N': 'TOTAL', 'Birds': totalBirds, 'Weight': totalWeight, 'Avg': totalAvg, 'Rate': totalRate, 'Amount': totalAmount
        });
        const wsPurchase = XLSX.utils.json_to_sheet(purchaseSheetData);
        XLSX.utils.book_append_sheet(wb, wsPurchase, "Purchases");

        // 2. Sales Sheet
        const saleSheetData = saleStocks.map((s, i) => ({
            'S N': i + 1, 'Date': new Date(s.date).toLocaleDateString(), 'Customer': s.customerId?.shopName, 'Bill No': s.billNumber,
            'Birds': s.birds, 'Weight': s.weight, 'Avg': s.avgWeight, 'Rate': s.rate, 'Amount': s.amount,
            'Cash': s.cashPaid, 'Online': s.onlinePaid, 'Discount': s.discount
        }));
        saleSheetData.push({
            'S N': 'TOTAL', 'Birds': totalSaleBirds, 'Weight': totalSaleWeight, 'Avg': totalSaleAvg, 'Rate': totalSaleRate, 'Amount': totalSaleAmount,
            'Cash': totalSaleCash, 'Online': totalSaleOnline, 'Discount': totalSaleDiscount
        });
        const wsSale = XLSX.utils.json_to_sheet(saleSheetData);
        XLSX.utils.book_append_sheet(wb, wsSale, "Sales");

        XLSX.writeFile(wb, `Stock_Report_${dateParam || 'All'}.xlsx`);
    };

    return (
        <div className="px-2">
            {/* Sticky Header Section */}
            <div className="sticky top-18 z-20 bg-gray-50 -mx-6 px-6 pt-4 pb-2 mb-6 border-b border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        {dateParam && (
                            <button
                                onClick={() => {
                                    const dateObj = new Date(dateParam);
                                    const y = dateObj.getFullYear();
                                    const m = dateObj.getMonth() + 1;
                                    const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/daily' : '/stocks/daily';
                                    navigate(`${basePath}?year=${y}&month=${m}`);
                                }}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold">{dateParam ? `Report - ${new Date(dateParam).toLocaleDateString()}` : 'Manage Stocks'}</h1>
                            {dateParam && <p className="text-gray-500">Daily Stock Report</p>}
                        </div>
                    </div>
                    {dateParam && (
                        <button
                            onClick={handleExportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            <Download size={20} />
                            Download
                        </button>
                    )}
                </div>

                {/* Action Buttons - Only for Supervisor and Current Date */}
                {isSupervisor && (!dateParam || dateParam === new Date().toLocaleDateString('en-CA')) && (
                    <div className="flex gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
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
                                date: defaultDate
                            });
                            setSelectedVendor(null);
                            setVendorSearchTerm('');
                            setShowPurchaseModal(true);
                        }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap">Add Purchase</button>
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
                                saleOutBalance: 0,
                                date: defaultDate
                            });
                            setShowSaleModal(true);
                        }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap">Add Sale</button>
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
                                saleOutBalance: 0,
                                date: defaultDate
                            });
                            setShowReceiptModal(true);
                        }} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 whitespace-nowrap">Add Receipt</button>
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
                                        amount: 0,
                                        date: defaultDate
                                    });
                                    setShowMortalityModal(true);
                                }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 whitespace-nowrap"
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
                                        amount: 0,
                                        date: defaultDate
                                    });
                                    setShowWeightLossModal(true);
                                }
                            }}
                            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 whitespace-nowrap"
                        >
                            {weightLossStock ? 'Edit Weight Loss/Gain' : 'Add Weight Loss / Weight ON'}
                        </button>
                        <button
                            onClick={() => {
                                setFeedPurchaseData({
                                    vendorId: '',
                                    weight: '',
                                    rate: '',
                                    amount: 0,
                                    date: new Date().toISOString().split('T')[0]
                                });
                                setShowFeedPurchaseModal(true);
                            }}
                            disabled={dateParam && feedPurchaseStocks.some(s => new Date(s.date).toISOString().split('T')[0] === dateParam)}
                            className={`px-4 py-2 text-white rounded whitespace-nowrap ${dateParam && feedPurchaseStocks.some(s => new Date(s.date).toISOString().split('T')[0] === dateParam) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}
                        >
                            Add Feed Purchase
                        </button>
                        <button
                            onClick={() => {
                                setFeedConsumeData({
                                    weight: '',
                                    rate: '',
                                    amount: 0,
                                    date: defaultDate
                                });
                                setShowFeedConsumeModal(true);
                            }}
                            disabled={dateParam && feedConsumeStocks.some(s => new Date(s.date).toISOString().split('T')[0] === dateParam)}
                            className={`px-4 py-2 text-white rounded whitespace-nowrap ${dateParam && feedConsumeStocks.some(s => new Date(s.date).toISOString().split('T')[0] === dateParam) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
                        >
                            Add Feed Consume
                        </button>
                    </div>
                )}
            </div>

            {/* Feed Purchase Modal */}
            {showFeedPurchaseModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add Feed Purchase</h2>
                            <button onClick={() => setShowFeedPurchaseModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleFeedPurchaseSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input
                                    type="date"
                                    value={feedPurchaseData.date}
                                    onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, date: e.target.value })}
                                    className="w-full border rounded p-2"
                                    required
                                />
                            </div>

                            {/* Vendor Search Dropdown for Feed Creditors */}
                            <div className="relative">
                                <label className="block text-sm font-medium mb-1">Vendor (Feed Creditors)</label>
                                <div className="relative">
                                    <div className="flex items-center border rounded p-2 bg-white">
                                        <Search className="text-gray-400 mr-2" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Search Feed Vendor..."
                                            value={selectedVendor && feedPurchaseData.vendorId === (selectedVendor._id || selectedVendor.id) ? selectedVendor.vendorName : vendorSearchTerm}
                                            onChange={(e) => {
                                                setVendorSearchTerm(e.target.value);
                                                setSelectedVendor(null);
                                                setFeedPurchaseData(prev => ({ ...prev, vendorId: '' }));
                                                setShowVendorDropdown(true);
                                            }}
                                            onFocus={() => setShowVendorDropdown(true)}
                                            className="w-full outline-none"
                                        />
                                        {selectedVendor && feedPurchaseData.vendorId === (selectedVendor._id || selectedVendor.id) && (
                                            <button type="button" onClick={() => {
                                                setSelectedVendor(null);
                                                setFeedPurchaseData(prev => ({ ...prev, vendorId: '' }));
                                                setVendorSearchTerm('');
                                            }}>
                                                <X size={16} className="text-gray-500" />
                                            </button>
                                        )}
                                    </div>

                                    {showVendorDropdown && (
                                        <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto mt-1">
                                            {vendors
                                                .filter(v => v.group?.slug === 'feed-creditors' || v.group?.name?.toLowerCase().includes('feed'))
                                                .filter(v =>
                                                    (v.vendorName || '').toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                                                    (v.contactNumber || '').includes(vendorSearchTerm)
                                                )
                                                .map((vendor, index) => (
                                                    <div
                                                        key={vendor._id || vendor.id}
                                                        onClick={() => {
                                                            setSelectedVendor(vendor);
                                                            setFeedPurchaseData(prev => ({ ...prev, vendorId: vendor._id || vendor.id }));
                                                            setShowVendorDropdown(false);
                                                            setVendorSearchTerm('');
                                                        }}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                    >
                                                        <div className="font-medium">{vendor.vendorName}</div>
                                                        <div className="text-xs text-gray-500">{vendor.place || vendor.city} - {vendor.contactNumber}</div>
                                                    </div>
                                                ))}
                                            {vendors.filter(v => v.group?.slug === 'feed-creditors' || v.group?.name?.toLowerCase().includes('feed')).length === 0 && (
                                                <div className="p-2 text-gray-500 text-center">No Feed Vendors found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity (Kg)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={feedPurchaseData.weight}
                                    onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, weight: e.target.value })}
                                    className="w-full border rounded p-2"
                                    required
                                    placeholder="Enter quantity"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Rate (per Kg)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={feedPurchaseData.rate}
                                    onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, rate: e.target.value })}
                                    className="w-full border rounded p-2"
                                    required
                                    placeholder="Enter rate"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input
                                    type="number"
                                    value={feedPurchaseData.amount}
                                    readOnly
                                    className="w-full border rounded p-2 bg-gray-100"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!feedPurchaseData.vendorId}
                                className={`w-full text-white py-2 rounded ${!feedPurchaseData.vendorId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Save Feed Purchase
                            </button>
                        </form>
                    </div>
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
                                                        const v = vendors.find(v => v._id || v.id === (stock.vendorId?._id || stock.vendorId?.id));
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
                                {/* <th className="border p-2">DATE</th> */}
                                {/* <th className="border p-2">PARTICULAR</th> */}
                                {/* <th className="border p-2">DELIVERY DETAILS</th> */}
                                <th className="border p-2">CUSTOMERS</th>
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
                                    {/* <td className="border p-2">{new Date(sale.date).toLocaleDateString()}</td> */}
                                    {/* <td className="border p-2">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${sale.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {sale.type === 'sale' ? 'STOCK_SALE' : 'STOCK_RECEIPT'}
                                        </span>
                                    </td> */}
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

                                                // 1. Identify Customer & Current Balance
                                                const custId = sale.customerId?._id || sale.customerId?.id || sale.customerId;
                                                const cust = customers.find(c => c._id == custId || c.id == custId);

                                                // Default to current balance if found, else use 0
                                                let baseBalance = cust ? (cust.outstandingBalance || 0) : 0;

                                                // 2. Calculate Effects of Subsequent Sales (including this one)
                                                // Filter sales for this customer from the available stocks
                                                const customerSales = stocks.filter(s =>
                                                    (s.type === 'sale' || s.type === 'receipt') &&
                                                    (s.customerId?._id == custId || s.customerId?.id == custId || s.customerId == custId)
                                                );

                                                // Sort by Date Descending, then ID Descending (for same day/time consistency)
                                                customerSales.sort((a, b) => {
                                                    const dateA = new Date(a.date);
                                                    const dateB = new Date(b.date);
                                                    if (dateA > dateB) return -1;
                                                    if (dateA < dateB) return 1;
                                                    // If dates are equal, fallback to ID sorting (assuming monotonic IDs)
                                                    if (a._id > b._id) return -1;
                                                    if (a._id < b._id) return 1;
                                                    return 0;
                                                });

                                                // Subtract effects until we pass the current sale
                                                let deduction = 0;
                                                for (const s of customerSales) {
                                                    // Effect = Amount - Paid - Discount
                                                    // Note: Receipts have Amount 0, but Paid > 0, so Effect is negative (reduces balance)
                                                    const effect = (Number(s.amount) || 0) - (Number(s.cashPaid) || 0) - (Number(s.onlinePaid) || 0) - (Number(s.discount) || 0);
                                                    deduction += effect;

                                                    if (s._id === sale._id) {
                                                        break; // We include the current sale's effect in the deduction to reach the 'Opening Balance'
                                                    }
                                                }

                                                // Calculate Retrospective Opening Balance
                                                const retrospectiveBalance = baseBalance - deduction;

                                                if (cust) {
                                                    setSelectedCustomer(cust);
                                                    setCustomerSearchTerm('');
                                                } else if (sale.customerId && sale.customerId.shopName) {
                                                    setSelectedCustomer(sale.customerId);
                                                }

                                                setSaleData({
                                                    customerId: custId || '',
                                                    billNumber: sale.billNumber || '',
                                                    birds: sale.birds || 0,
                                                    weight: sale.weight || 0,
                                                    avgWeight: sale.avgWeight || 0,
                                                    rate: sale.rate || 0,
                                                    amount: sale.amount || 0,
                                                    totalBalance: 0,
                                                    cashPaid: sale.cashPaid || 0,
                                                    onlinePaid: sale.onlinePaid || 0,
                                                    discount: sale.discount || 0,
                                                    balance: sale.balance || 0,
                                                    cashLedgerId: (sale.cashLedgerId?._id || sale.cashLedgerId?.id || sale.cashLedgerId) || (cashLedgers?.[0]?._id || cashLedgers?.[0]?.id || ''),
                                                    onlineLedgerId: (sale.onlineLedgerId?._id || sale.onlineLedgerId?.id || sale.onlineLedgerId) || (bankLedgers?.[0]?._id || bankLedgers?.[0]?.id || ''),
                                                    // Set the calculated retrospective balance
                                                    saleOutBalance: retrospectiveBalance,
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
                                {/* <td className="border p-2" colSpan={5}>TOTAL</td> */}
                                <td className="border p-2" colSpan={3}>TOTAL</td>
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

                        </tbody>
                    </table>
                </div>
            </div>

            {/* CALCULATIONS FOR CLOSING STOCK & PROFIT BREAKDOWN */}
            {(() => {
                // 1. GROSS CLOSING STOCK CALCS
                const grossBirds = totalBirds - totalSaleBirds;
                const grossWeight = totalWeight - totalSaleWeight;
                const grossAvg = grossBirds !== 0 ? grossWeight / grossBirds : 0;
                const grossRate = totalRate;
                const grossTotal = grossRate * grossWeight;

                // 2. BIRDS MORTALITY CALCS
                const mortBirds = mortalityStock ? Number(mortalityStock.birds) : 0;
                const mortAvg = totalSaleAvg;
                const mortWeightComputed = mortBirds * mortAvg;
                const mortRate = grossRate;
                const mortTotalComputed = mortRate * mortWeightComputed;

                // 3. ACTUAL WEIGHT LOSS / ON CALCS
                const actBirds = 0;
                const actWeight = weightLossStock ? Number(weightLossStock.weight) : 0;
                const actRate = grossRate;
                const actTotalComputed = actRate * actWeight;

                // 4. CLOSING STOCK CALCS
                const closeBirds = grossBirds - mortBirds;
                const closeAvg = totalSaleAvg;
                const closeWeight = closeBirds * closeAvg;
                const closeRate = grossRate;
                const closeTotal = closeRate * closeWeight;

                // 5. NATURAL WEIGHT LOSS / ON CALCS
                const natBirds = 0;
                const natWeight = grossWeight - mortWeightComputed - actWeight - closeWeight;
                const natRate = grossRate;
                const natTotalComputed = natRate * natWeight;

                // --- FEED STOCK SUMMARY CALCULATIONS ---
                const opStocks = sortedFeedStocks.filter(s => s.type === 'opening');
                const purchStocks = sortedFeedStocks.filter(s => s.type !== 'opening');
                const consStocks = sortedFeedConsumeStocks;

                const opStats = {
                    bags: opStocks.reduce((sum, s) => sum + (Number(s.bags) || 0), 0),
                    weight: opStocks.reduce((sum, s) => sum + (Number(s.weight) || 0), 0),
                    amount: opStocks.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                };
                opStats.rate = opStats.weight > 0 ? opStats.amount / opStats.weight : 0;

                const purchStats = {
                    bags: purchStocks.reduce((sum, s) => sum + (Number(s.bags) || 0), 0),
                    weight: purchStocks.reduce((sum, s) => sum + (Number(s.weight) || 0), 0),
                    amount: purchStocks.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                };
                purchStats.rate = purchStats.weight > 0 ? purchStats.amount / purchStats.weight : 0;

                const consStats = {
                    bags: consStocks.reduce((sum, s) => sum + (Number(s.bags) || 0), 0),
                    weight: consStocks.reduce((sum, s) => sum + (Number(s.weight) || 0), 0),
                    amount: consStocks.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                };
                consStats.rate = consStats.weight > 0 ? consStats.amount / consStats.weight : 0;

                const closingStats = {
                    bags: opStats.bags + purchStats.bags - consStats.bags,
                    weight: opStats.weight + purchStats.weight - consStats.weight,
                    amount: opStats.amount + purchStats.amount - consStats.amount
                };
                closingStats.rate = closingStats.weight > 0 ? closingStats.amount / closingStats.weight : 0;


                // --- PROFIT BREAKDOWN CALCULATIONS ---
                // PROFIT MARGINE PER KG = total sale rate - total purchase rate
                const profitMarginPerKg = totalSaleRate - totalRate; // using totalRate (Purchase Rate)

                // BIRDS SOLD QTTY IN KG = total sale weight
                const birdsSoldQtyInKg = totalSaleWeight;

                // GROSS PROFIT = BIRDS SOLD QTTY IN KG * PROFIT MARGINE PER KG
                const grossProfit = birdsSoldQtyInKg * profitMarginPerKg;

                // W LOSS & MORTALITY = natural weight loss/on total + acutual weight loss/on total + birds mortality total
                const wLossAndMortality = natTotalComputed + actTotalComputed + mortTotalComputed;

                // FEED CONSUMED = previous date feed consume total amount
                const feedConsumed = prevFeedConsumedAmount;

                // NET PROFIT/LOSS = GROSS PROFIT - W LOSS & MORTALITY - FEED CONSUMED
                const netProfitLoss = grossProfit - wLossAndMortality - feedConsumed;

                return (
                    <div className="flex flex-col gap-6 mt-6">
                        {/* Closing Stock Summary Table */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">CLOSING STOCK SUMMARY</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-800">
                                            <th className="border p-2 text-left bg-gray-200">Particulars</th>
                                            <th className="border p-2 text-center">BIRDS</th>
                                            <th className="border p-2 text-center">WEIGHT</th>
                                            <th className="border p-2 text-center">AVG</th>
                                            <th className="border p-2 text-center">RATE</th>
                                            <th className="border p-2 text-center">TOTAL</th>
                                            <th className="border p-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* GROSS CLOSING STOCK */}
                                        <tr className="text-center italic bg-white border-b">
                                            <td className="border p-2 text-left text-gray-700">GROSS CLOSING STOCK</td>
                                            <td className="border p-2">{grossBirds}</td>
                                            <td className="border p-2">{grossWeight.toFixed(2)}</td>
                                            <td className="border p-2">{grossAvg.toFixed(2)}</td>
                                            <td className="border p-2">{grossRate.toFixed(2)}</td>
                                            <td className="border p-2">{grossTotal.toFixed(2)}</td>
                                            <td className="border p-2"></td>
                                        </tr>

                                        {/* BIRDS MORTALITY */}
                                        <tr className="text-center italic bg-white border-b">
                                            <td className="border p-2 text-left text-gray-700">BIRDS MORTALITY</td>
                                            <td className="border p-2 font-bold">{mortBirds}</td>
                                            <td className="border p-2">{mortWeightComputed.toFixed(2)}</td>
                                            <td className="border p-2">{mortAvg.toFixed(2)}</td>
                                            <td className="border p-2">{mortRate.toFixed(2)}</td>
                                            <td className="border p-2">{mortTotalComputed.toFixed(2)}</td>
                                            <td className="border p-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditMode(true);
                                                        if (mortalityStock) {
                                                            setCurrentStockId(mortalityStock._id);
                                                            setMortalityData({
                                                                birds: mortalityStock.birds,
                                                                weight: mortalityStock.weight,
                                                                avgWeight: mortalityStock.avgWeight,
                                                                rate: mortalityStock.rate,
                                                                amount: mortalityStock.amount,
                                                                date: mortalityStock.date ? new Date(mortalityStock.date).toISOString().split('T')[0] : ''
                                                            });
                                                        } else {
                                                            setCurrentStockId(null);
                                                            setMortalityData({ birds: '', weight: '', avgWeight: 0, rate: 0, amount: 0, date: defaultDate });
                                                        }
                                                        setShowMortalityModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    {mortalityStock ? 'Edit' : 'Add'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* ACTUAL WEIGHT LOSS / ON */}
                                        <tr className="text-center italic bg-white border-b">
                                            <td className="border p-2 text-left text-gray-700">ACTUAL WEIGHT LOSS /ON</td>
                                            <td className="border p-2 text-gray-400">-</td>
                                            <td className="border p-2 font-bold">{actWeight.toFixed(2)}</td>
                                            <td className="border p-2 text-gray-400">-</td>
                                            <td className="border p-2">{actRate.toFixed(2)}</td>
                                            <td className="border p-2">{actTotalComputed.toFixed(2)}</td>
                                            <td className="border p-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditMode(true);
                                                        if (weightLossStock) {
                                                            setCurrentStockId(weightLossStock._id);
                                                            setWeightLossData({
                                                                birds: 0,
                                                                weight: weightLossStock.weight,
                                                                avgWeight: 0,
                                                                rate: weightLossStock.rate,
                                                                amount: weightLossStock.amount,
                                                                date: weightLossStock.date ? new Date(weightLossStock.date).toISOString().split('T')[0] : ''
                                                            });
                                                        } else {
                                                            setCurrentStockId(null);
                                                            setWeightLossData({
                                                                birds: 0,
                                                                weight: '',
                                                                avgWeight: 0,
                                                                rate: 0,
                                                                amount: 0,
                                                                date: defaultDate
                                                            });
                                                        }
                                                        setShowWeightLossModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    {weightLossStock ? 'Edit' : 'Add'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* NATURAL WEIGHT LOSS/ ON */}
                                        <tr className="text-center italic bg-white border-b">
                                            <td className="border p-2 text-left text-gray-700">NATURAL WEIGHT LOSS/ ON</td>
                                            <td className="border p-2 text-gray-400">-</td>
                                            <td className="border p-2 font-bold">{natWeight.toFixed(2)}</td>
                                            <td className="border p-2 text-gray-400">-</td>
                                            <td className="border p-2">{natRate.toFixed(2)}</td>
                                            <td className="border p-2">{natTotalComputed.toFixed(2)}</td>
                                            <td className="border p-2"></td>
                                        </tr>

                                        {/* CLOSING STOCK */}
                                        <tr className="bg-black text-white font-bold text-center italic">
                                            <td className="border p-2 text-left">CLOSING STOCK</td>
                                            <td className="border p-2">{closeBirds}</td>
                                            <td className="border p-2">{closeWeight.toFixed(2)}</td>
                                            <td className="border p-2">{closeAvg.toFixed(2)}</td>
                                            <td className="border p-2">{closeRate.toFixed(2)}</td>
                                            <td className="border p-2">{closeTotal.toFixed(2)}</td>
                                            <td className="border p-2"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* FEED STOCK SUMMARY TABLE */}
                            <div className="flex-1 bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold mb-4 text-orange-600">FEED STOCK SUMMARY</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-700">
                                                <th className="border p-2 text-center"></th>
                                                <th className="border p-2 text-center">BAG</th>
                                                <th className="border p-2 text-center">QTTY</th>
                                                <th className="border p-2 text-center">RATE</th>
                                                <th className="border p-2 text-center">AMOUNT</th>
                                                {isSupervisor && <th className="border p-2 text-center">ACTION</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* OP */}
                                            <tr className="text-center font-bold">
                                                <td className="border p-2">OP</td>
                                                <td className="border p-2">{opStats.bags}</td>
                                                <td className="border p-2">{opStats.weight.toFixed(2)}</td>
                                                <td className="border p-2">{opStats.rate.toFixed(2)}</td>
                                                <td className="border p-2">{opStats.amount.toFixed(0)}</td>
                                                {isSupervisor && <td className="border p-2"></td>}
                                            </tr>
                                            {/* FEED PURCHASE */}
                                            <tr className="text-center">
                                                <td className="border p-2 font-medium">FEED PURCHASE</td>
                                                <td className="border p-2">{purchStats.bags}</td>
                                                <td className="border p-2">{purchStats.weight.toFixed(2)}</td>
                                                <td className="border p-2">{purchStats.rate.toFixed(2)}</td>
                                                <td className="border p-2">{purchStats.amount.toFixed(0)}</td>
                                                {isSupervisor && (
                                                    <td className="border p-2">
                                                        {purchStocks.length > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    // Only allow edit if dateParam is present or logic permits
                                                                    // For now, picking the first one as implied by requirements
                                                                    const stockToEdit = purchStocks[0];
                                                                    console.log("purchStocks", purchStocks);
                                                                    console.log("stockToEdit", stockToEdit);
                                                                    setIsEditMode(true);
                                                                    setCurrentStockId(stockToEdit._id);

                                                                    const vId = stockToEdit.vendorId?._id || stockToEdit.vendorId;
                                                                    const foundVendor = vendors.find(v => (v._id || v.id) === vId);
                                                                    if (foundVendor) {
                                                                        setSelectedVendor(foundVendor);
                                                                    }

                                                                    setFeedPurchaseData({
                                                                        vendorId: vId || '',
                                                                        weight: stockToEdit.weight,
                                                                        rate: stockToEdit.rate,
                                                                        amount: stockToEdit.amount,
                                                                        bags: stockToEdit.bags || '',
                                                                        date: stockToEdit.date ? new Date(stockToEdit.date).toISOString().split('T')[0] : ''
                                                                    });
                                                                    setShowFeedPurchaseModal(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                            {/* FEED CONSUME */}
                                            <tr className="text-center">
                                                <td className="border p-2 font-medium">FEED CONSUME</td>
                                                <td className="border p-2">{consStats.bags}</td>
                                                <td className="border p-2">{consStats.weight.toFixed(2)}</td>
                                                <td className="border p-2">{consStats.rate.toFixed(2)}</td>
                                                <td className="border p-2">{consStats.amount.toFixed(0)}</td>
                                                {isSupervisor && (
                                                    <td className="border p-2">
                                                        {consStocks.length > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    const stockToEdit = consStocks[0];
                                                                    setIsEditMode(true);
                                                                    setCurrentStockId(stockToEdit._id);
                                                                    setFeedConsumeData({
                                                                        weight: stockToEdit.weight,
                                                                        rate: stockToEdit.rate,
                                                                        amount: stockToEdit.amount,
                                                                        bags: stockToEdit.bags || '',
                                                                        date: stockToEdit.date ? new Date(stockToEdit.date).toISOString().split('T')[0] : ''
                                                                    });
                                                                    setShowFeedConsumeModal(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                            {/* CLOSING STOCK */}
                                            <tr className="bg-orange-100 text-center font-bold">
                                                <td className="border p-2">CLOSING STOCK</td>
                                                <td className="border p-2">{closingStats.bags}</td>
                                                <td className="border p-2">{closingStats.weight.toFixed(2)}</td>
                                                <td className="border p-2">{closingStats.rate.toFixed(2)}</td>
                                                <td className="border p-2">{closingStats.amount.toFixed(0)}</td>
                                                {isSupervisor && <td className="border p-2"></td>}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* PROFIT BREAKDOWN Table */}
                            <div className="flex-1 bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold mb-4 italic text-center text-gray-800">PROFIT BREAKDOWN</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300">
                                        <tbody>
                                            <tr className="border-b">
                                                <td className="border p-2 italic text-left w-2/3">PROFIT MARGINE PER KG</td>
                                                <td className="border p-2 text-center font-medium italic">{profitMarginPerKg.toFixed(2)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="border p-2 italic text-left">BIRDS SOLD QTTY IN KG</td>
                                                <td className="border p-2 text-center font-medium italic">{birdsSoldQtyInKg.toFixed(2)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="border p-2 italic text-left font-bold">GROSS PROFIT</td>
                                                <td className="border p-2 text-center font-bold italic">{grossProfit.toFixed(2)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="border p-2 italic text-left">W LOSS & MORTALITY</td>
                                                <td className="border p-2 text-center font-medium italic">{wLossAndMortality.toFixed(2)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="border p-2 italic text-left">LAST DAY FEED CONSUMED</td>
                                                <td className="border p-2 text-center font-medium italic">{feedConsumed.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-black text-white">
                                                <td className="border p-2 italic text-left font-bold">NET PROFIT/LOSS</td>
                                                <td className="border p-2 text-center font-bold italic">{netProfitLoss.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}





            {/* FEED CONSUME DETAILS TABLE */}




            {/* Purchase Modal */}
            {
                showPurchaseModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-xs max-h-[calc(80vh-56px)] flex flex-col">
                            <div className="p-4 pb-3 border-b border-gray-200 flex-shrink-0">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {isEditMode ? 'Edit Purchase' : 'Add Purchase'}
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 pt-3 min-h-0">

                                {/* Summary Section */}
                                {purchaseData.birds > 0 && purchaseData.weight > 0 && (
                                    <div className="bg-blue-50 p-1.5 rounded-lg mb-2">
                                        <div className="text-xs text-blue-800">
                                            <div className="grid grid-cols-2 gap-1">
                                                <div><span className="font-medium">DC:</span> {purchaseData.refNo}</div>
                                                <div><span className="font-medium">Birds:</span> {purchaseData.birds}</div>
                                                <div><span className="font-medium">Weight:</span> {purchaseData.weight} kg</div>
                                                <div><span className="font-medium">Avg:</span> {purchaseData.avgWeight} kg/bird</div>
                                                <div><span className="font-medium">Rate:</span> ₹{purchaseData.rate}/kg</div>
                                                <div><span className="font-medium">Amount:</span> ₹{purchaseData.amount?.toLocaleString() || '0'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handlePurchaseSubmit} className="space-y-2">
                                    <div className="relative">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Vendor *</label>
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
                                                className={`w-full px-2 py-1 border rounded text-xs pr-8 ${!purchaseData.vendorId
                                                    ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                                    }`}
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
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {showVendorDropdown && filteredVendors.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                                                {filteredVendors.map((vendor, index) => (
                                                    <div
                                                        key={vendor._id || vendor.id}
                                                        ref={index === highlightedVendorIndex ? (el) => {
                                                            if (el) {
                                                                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                                            }
                                                        } : null}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleVendorSelect(vendor);
                                                        }}
                                                        onMouseEnter={() => setHighlightedVendorIndex(index)}
                                                        className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs ${index === highlightedVendorIndex
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
                                                <div className="px-3 py-2 text-gray-500 text-center text-xs">
                                                    No vendors found
                                                </div>
                                            </div>
                                        )}
                                        {!purchaseData.vendorId && (
                                            <p className="text-xs text-red-600 mt-1">Please select a vendor</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle No *</label>
                                            <input
                                                type="text"
                                                value={purchaseData.vehicleNumber}
                                                onChange={e => setPurchaseData({ ...purchaseData, vehicleNumber: e.target.value })}
                                                className={`w-full px-2 py-1 border rounded text-xs ${!purchaseData.vehicleNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">DC NO *</label>
                                            <input
                                                type="text"
                                                value={purchaseData.refNo}
                                                onChange={e => setPurchaseData({ ...purchaseData, refNo: e.target.value })}
                                                className={`w-full px-2 py-1 border rounded text-xs ${!purchaseData.refNo ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Birds *</label>
                                            <input
                                                type="number"
                                                value={purchaseData.birds}
                                                onChange={e => setPurchaseData({ ...purchaseData, birds: e.target.value })}
                                                className={`w-full px-2 py-1 border rounded text-xs ${!purchaseData.birds ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Weight *</label>
                                            <input
                                                type="number"
                                                value={purchaseData.weight}
                                                onChange={e => setPurchaseData({ ...purchaseData, weight: e.target.value })}
                                                className={`w-full px-2 py-1 border rounded text-xs ${!purchaseData.weight ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">AVG (Kg/bird)</label>
                                            <input
                                                type="number"
                                                value={purchaseData.avgWeight}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Rate *</label>
                                            <input
                                                type="number"
                                                value={purchaseData.rate}
                                                onChange={e => setPurchaseData({ ...purchaseData, rate: e.target.value })}
                                                className={`w-full px-2 py-1 border rounded text-xs ${!purchaseData.rate ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            value={purchaseData.amount}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                                            readOnly
                                        />
                                    </div>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowPurchaseModal(false)}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePurchaseSubmit}
                                        className="flex-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium"
                                    >
                                        {isEditMode ? 'Update' : 'Add'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Sale Modal */}
            {
                (showSaleModal || showReceiptModal) && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-sm max-h-[calc(90vh-56px)] flex flex-col">
                            <div className="p-4 pb-3 border-b border-gray-200 flex-shrink-0">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {showReceiptModal ? (isEditMode ? 'Edit Receipt' : 'Add Receipt') : (isEditMode ? 'Edit Sale' : 'Add Sale')}
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 pt-3 min-h-0">

                                {/* Receipt Info Header */}
                                {showReceiptModal && (
                                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-700">
                                            <FileText size={14} />
                                            <span className="text-xs font-medium">Payment Receipt</span>
                                        </div>
                                        <p className="text-[10px] text-green-600 mt-0.5">
                                            Customer paying remaining balance without purchasing birds
                                        </p>
                                    </div>
                                )}

                                {/* Sales Summary Header */}
                                {!showReceiptModal && saleData.birds > 0 && saleData.weight > 0 && (
                                    <div className="bg-blue-50 p-1.5 rounded-lg mb-2">
                                        <div className="text-xs text-blue-800">
                                            <div className="grid grid-cols-2 gap-1">
                                                <div><span className="font-medium">Bill:</span> {saleData.billNumber}</div>
                                                <div><span className="font-medium">Birds:</span> {saleData.birds}</div>
                                                <div><span className="font-medium">Weight:</span> {saleData.weight} kg</div>
                                                <div><span className="font-medium">Avg:</span> {saleData.avgWeight} kg/bird</div>
                                                <div><span className="font-medium">Rate:</span> ₹{saleData.rate}/kg</div>
                                                <div><span className="font-medium">Total:</span> ₹{saleData.amount?.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={showReceiptModal ? handleReceiptSubmit : handleSaleSubmit} className="space-y-2">
                                    {/* Customer Selection */}
                                    <div className="relative">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={selectedCustomer ? `${selectedCustomer.shopName} - ${selectedCustomer.ownerName || 'N/A'}` : customerSearchTerm}
                                                onChange={(e) => {
                                                    setCustomerSearchTerm(e.target.value);
                                                    setSelectedCustomer(null);
                                                    setSaleData(prev => ({ ...prev, customerId: '' }));
                                                    setHighlightedCustomerIndex(-1);
                                                }}
                                                onFocus={handleCustomerInputFocus}
                                                onBlur={handleCustomerInputBlur}
                                                onKeyDown={handleCustomerKeyDown}
                                                placeholder="Search customer by name, owner, or contact..."
                                                className={`w-full px-2 py-1 border rounded text-xs pr-8 ${!saleData.customerId
                                                    ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                                    }`}
                                                autoComplete="off"
                                            />

                                            {selectedCustomer && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCustomer(null);
                                                        setCustomerSearchTerm('');
                                                        setSaleData(prev => ({ ...prev, customerId: '' }));
                                                        setHighlightedCustomerIndex(-1);
                                                    }}
                                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                                                {filteredCustomers.map((customer, index) => (
                                                    <div
                                                        key={customer._id || customer.id}
                                                        ref={index === highlightedCustomerIndex ? (el) => {
                                                            if (el) {
                                                                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                                            }
                                                        } : null}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleCustomerSelectItem(customer);
                                                        }}
                                                        onMouseEnter={() => setHighlightedCustomerIndex(index)}
                                                        className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs ${index === highlightedCustomerIndex
                                                            ? 'bg-blue-100 border-blue-200'
                                                            : 'hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        <div className="font-medium text-gray-900">{customer.shopName}</div>
                                                        <div className="text-xs text-gray-500">{customer.ownerName}</div>
                                                        <div className="text-xs text-gray-500">{customer.contact}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {showCustomerDropdown && filteredCustomers.length === 0 && customerSearchTerm.trim() !== '' && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                                                <div className="px-3 py-2 text-gray-500 text-center text-xs">
                                                    No customers found
                                                </div>
                                            </div>
                                        )}
                                        {!saleData.customerId && (
                                            <p className="text-xs text-red-600 mt-1">Please select a customer</p>
                                        )}
                                    </div>

                                    {/* Customer Balance Display */}
                                    {saleData.customerId && (
                                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-600">Customer Balance:</span>
                                                <span className={`font-semibold ${saleData.saleOutBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    ₹{Number(saleData.saleOutBalance).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Bill Number</label>
                                        <div className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs text-gray-700">
                                            {saleData.billNumber}
                                        </div>
                                    </div>

                                    {!showReceiptModal && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Birds *</label>
                                                    <input
                                                        type="number"
                                                        value={saleData.birds}
                                                        onChange={e => setSaleData({ ...saleData, birds: e.target.value })}
                                                        className={`w-full px-2 py-1 border rounded text-xs ${!saleData.birds ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Weight *</label>
                                                    <input
                                                        type="number"
                                                        value={saleData.weight}
                                                        onChange={e => setSaleData({ ...saleData, weight: e.target.value })}
                                                        className={`w-full px-2 py-1 border rounded text-xs ${!saleData.weight ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">AVG (Kg/bird)</label>
                                                    <input
                                                        type="number"
                                                        value={saleData.avgWeight}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                                                        readOnly
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate *</label>
                                                    <input
                                                        type="number"
                                                        value={saleData.rate}
                                                        onChange={e => setSaleData({ ...saleData, rate: e.target.value })}
                                                        className={`w-full px-2 py-1 border rounded text-xs ${!saleData.rate ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                                                <input
                                                    type="number"
                                                    value={saleData.amount}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                                                    readOnly
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="border-t border-gray-100 pt-2 mt-2">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Payment Details</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Cash Paid (₹)</label>
                                                <input
                                                    type="number"
                                                    value={saleData.cashPaid}
                                                    onChange={e => setSaleData({ ...saleData, cashPaid: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Online Paid (₹)</label>
                                                <input
                                                    type="number"
                                                    value={saleData.onlinePaid}
                                                    onChange={e => setSaleData({ ...saleData, onlinePaid: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        {Number(saleData.onlinePaid) > 0 && (
                                            <div className="mt-2">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Bank Ledger *</label>
                                                <select
                                                    value={saleData.onlineLedgerId}
                                                    onChange={e => setSaleData({ ...saleData, onlineLedgerId: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                    required
                                                >
                                                    <option value="">Select Bank Ledger</option>
                                                    {bankLedgers.map(l => <option key={l._id || l.id} value={l._id || l.id}>{l.name}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Discount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={saleData.discount}
                                                    onChange={e => setSaleData({ ...saleData, discount: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Final Balance</label>
                                                <input
                                                    type="number"
                                                    value={saleData.balance}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowSaleModal(false); setShowReceiptModal(false); }}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={showReceiptModal ? handleReceiptSubmit : handleSaleSubmit}
                                        className={`flex-1 px-2 py-1 text-white rounded text-xs font-medium ${showReceiptModal ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {isEditMode ? 'Update' : 'Submit'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Opening Stock Modal */}
            {
                showOpeningStockModal && (
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
                )
            }

            {/* Feed Opening Stock Modal */}
            {
                showFeedOpeningStockModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                            <h3 className="text-xl font-bold mb-4">Add Feed Opening Stock</h3>
                            <form onSubmit={handleFeedOpeningStockSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium">Date</label>
                                    <input
                                        type="date"
                                        value={feedOpeningStockData.date}
                                        onChange={(e) => setFeedOpeningStockData({ ...feedOpeningStockData, date: e.target.value })}
                                        className="w-full border rounded p-2"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Bags <span className="text-red-500">*</span></label>
                                        <input type="number" value={feedOpeningStockData.bags} onChange={e => setFeedOpeningStockData({ ...feedOpeningStockData, bags: e.target.value })} className="w-full border p-2 rounded" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Weight (Kg) <span className="text-red-500">*</span></label>
                                        <input type="number" step="0.01" value={feedOpeningStockData.weight} onChange={e => setFeedOpeningStockData({ ...feedOpeningStockData, weight: e.target.value })} className="w-full border p-2 rounded" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Rate <span className="text-red-500">*</span></label>
                                        <input type="number" step="0.01" value={feedOpeningStockData.rate} onChange={e => setFeedOpeningStockData({ ...feedOpeningStockData, rate: e.target.value })} className="w-full border p-2 rounded" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Amount</label>
                                    <input type="number" value={(Number(feedOpeningStockData.weight || 0) * Number(feedOpeningStockData.rate || 0)).toFixed(2)} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Mortality Modal */}
            {
                showMortalityModal && (
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
                )
            }
            {/* Actual Weight Loss Modal */}
            {
                showWeightLossModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                            <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Actual Weight Loss/On' : 'Add Actual Weight Loss/On'}</h3>
                            <form onSubmit={handleWeightLossSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Birds (Readonly)</label>
                                        <input type="number" value={0} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                        <input type="number" value={weightLossData.weight} onChange={e => setWeightLossData({ ...weightLossData, weight: e.target.value })} className="w-full border p-2 rounded" required placeholder="Enter weight loss (positive for loss)" />
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
                )
            }
            {/* Natural Weight Loss Modal */}
            {
                showNaturalWeightLossModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                            <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Natural Weight Loss' : 'Add Natural Weight Loss'}</h3>
                            <form onSubmit={handleNaturalWeightLossSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Birds (Readonly)</label>
                                        <input type="text" value="-" className="w-full border p-2 rounded bg-gray-100" readOnly />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Weight <span className="text-red-500">*</span></label>
                                        <input type="number" value={naturalWeightLossData.weight} onChange={e => setNaturalWeightLossData({ ...naturalWeightLossData, weight: e.target.value })} className="w-full border p-2 rounded" required placeholder="Enter natural weight loss" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">AVG (Kg/bird)</label>
                                        <input type="text" value="-" className="w-full border p-2 rounded bg-gray-100" readOnly />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Rate</label>
                                        <input type="number" value={naturalWeightLossData.rate} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Amount</label>
                                    <input type="number" value={naturalWeightLossData.amount} className="w-full border p-2 rounded bg-gray-100" readOnly />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setShowNaturalWeightLossModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded">Submit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Feed Purchase Modal */}
            {
                showFeedPurchaseModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{isEditMode ? 'Edit Feed Purchase' : 'Add Feed Purchase'}</h2>
                                <button onClick={() => setShowFeedPurchaseModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleFeedPurchaseSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Vendor <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={selectedVendor ? `${selectedVendor.vendorName}` : vendorSearchTerm}
                                            onChange={(e) => {
                                                setVendorSearchTerm(e.target.value);
                                                setSelectedVendor(null);
                                                setFeedPurchaseData(prev => ({ ...prev, vendorId: '' }));
                                            }}
                                            onFocus={() => setShowVendorDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                                            placeholder="Search vendor..."
                                            className="w-full border p-2 rounded"
                                        />
                                        {showVendorDropdown && filteredVendors.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                                                {filteredVendors.map((vendor) => (
                                                    <div
                                                        key={vendor._id || vendor.id}
                                                        onMouseDown={() => {
                                                            setSelectedVendor(vendor);
                                                            setFeedPurchaseData(prev => ({ ...prev, vendorId: vendor._id || vendor.id }));
                                                            setShowVendorDropdown(false);
                                                        }}
                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                                    >
                                                        {vendor.vendorName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={feedPurchaseData.date}
                                        onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, date: e.target.value })}
                                        className={`w-full border rounded p-2 ${isEditMode ? 'bg-gray-100' : ''}`}
                                        required
                                        readOnly={true}
                                    //readOnly={isEditMode}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Bags</label>
                                        <input
                                            type="number"
                                            value={feedPurchaseData.bags}
                                            onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, bags: e.target.value })}
                                            className="w-full border rounded p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Quantity (Kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={feedPurchaseData.weight}
                                            onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, weight: e.target.value })}
                                            className="w-full border rounded p-2"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rate (per Kg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={feedPurchaseData.rate}
                                        onChange={(e) => setFeedPurchaseData({ ...feedPurchaseData, rate: e.target.value })}
                                        className="w-full border rounded p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount</label>
                                    <input
                                        type="number"
                                        value={feedPurchaseData.amount}
                                        readOnly
                                        className="w-full border rounded p-2 bg-gray-100"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                    {isEditMode ? 'Update Purchase' : 'Add Purchase'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Feed Consume Modal */}
            {
                showFeedConsumeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{isEditMode ? 'Edit Feed Consumption' : 'Add Feed Consumption'}</h2>
                                <button onClick={() => setShowFeedConsumeModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleFeedConsumeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={feedConsumeData.date}
                                        onChange={(e) => setFeedConsumeData({ ...feedConsumeData, date: e.target.value })}
                                        className={`w-full border rounded p-2 ${isEditMode ? 'bg-gray-100' : ''}`}
                                        required
                                        readOnly={true}
                                    //readOnly={isEditMode}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Bags</label>
                                        <input
                                            type="number"
                                            value={feedConsumeData.bags}
                                            onChange={(e) => setFeedConsumeData({ ...feedConsumeData, bags: e.target.value })}
                                            className="w-full border rounded p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Quantity (Kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={feedConsumeData.weight}
                                            onChange={(e) => setFeedConsumeData({ ...feedConsumeData, weight: e.target.value })}
                                            className="w-full border rounded p-2"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rate (per Kg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={feedConsumeData.rate}
                                        onChange={(e) => setFeedConsumeData({ ...feedConsumeData, rate: e.target.value })}
                                        className="w-full border rounded p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount</label>
                                    <input
                                        type="number"
                                        value={feedConsumeData.amount}
                                        readOnly
                                        className="w-full border rounded p-2 bg-gray-100"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                    {isEditMode ? 'Update Consumption' : 'Add Consumption'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Pagination Footer */}
            {dateParam && (
                <div className="flex justify-between items-center mt-8 pb-8 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => {
                            const dateObj = new Date(dateParam);
                            dateObj.setDate(dateObj.getDate() - 1);
                            const prevDate = dateObj.toISOString().split('T')[0];
                            const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/manage' : '/stocks/manage';
                            navigate(`${basePath}?date=${prevDate}`);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 font-medium"
                    >
                        <ChevronLeft size={20} />
                        Previous Day
                    </button>

                    <span className="text-gray-500 font-medium hidden sm:block">
                        {new Date(dateParam).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>

                    <button
                        onClick={() => {
                            const dateObj = new Date(dateParam);
                            dateObj.setDate(dateObj.getDate() + 1);
                            const nextDate = dateObj.toISOString().split('T')[0];
                            const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/manage' : '/stocks/manage';
                            navigate(`${basePath}?date=${nextDate}`);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 font-medium"
                    >
                        Next Day
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div >
    );

}
export default ManageStocks;



