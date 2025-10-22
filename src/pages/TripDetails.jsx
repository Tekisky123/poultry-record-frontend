// src/pages/TripDetails.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Truck, 
  MapPin, 
  Users, 
  ShoppingCart,
  Receipt,
  Fuel,
  Calendar,
  DollarSign,
  Loader2,
  X,
  Plus,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Save,
  Edit
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { downloadTripPDF } from '../utils/downloadTripPDF';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import EditTripModal from '../components/EditTripModal';

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDieselModal, setShowDieselModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  
  // Edit states
  const [editingPurchaseIndex, setEditingPurchaseIndex] = useState(null);
  const [editingSaleIndex, setEditingSaleIndex] = useState(null);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
  const [editingDieselIndex, setEditingDieselIndex] = useState(null);
  const [editingStockIndex, setEditingStockIndex] = useState(null);
  
  // Form data for editing
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    dcNumber: '',
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    amount: 0
  });

  const [saleData, setSaleData] = useState({
    client: '',
    billNumber: '',
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    amount: 0,
    // paymentMode: 'cash',
    // paymentStatus: 'pending',
    receivedAmount: 0,
    discount: 0,
    balance: 0,
    cashPaid: 0,
    onlinePaid: 0
  });

  const [expenseData, setExpenseData] = useState({
    category: 'meals',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [dieselData, setDieselData] = useState({
    stationName: '',
    volume: 0,
    rate: 0,
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [stockData, setStockData] = useState({
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    value: 0,
    notes: ''
  });

  const [completeData, setCompleteData] = useState({
    closingOdometer: 0,
    finalRemarks: '',
    mortality: 0
  });

  useEffect(() => {
    if (id) {
      fetchTrip();
      fetchVendors();
      fetchCustomers();
    }
  }, [id]);

  const fetchTrip = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/trip/${id}`);
      setTrip(data.data);
    } catch (err) {
      console.error('Error fetching trip:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data } = await api.get('/vendor');
      if (data.success) {
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/customer');
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const addPurchase = async (purchaseData) => {
    try {
      const { data } = await api.post(`/trip/${id}/purchase`, purchaseData);
      setTrip(data.data);
      setShowPurchaseModal(false);
      alert('Purchase added successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const addSale = async (saleData) => {
    try {
      const { data } = await api.post(`/trip/${id}/sale`, saleData);
      setTrip(data.data);
      setShowSaleModal(false);
      alert('Sale added successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const addExpense = async (expenseData) => {
    try {
      const currentExpenses = trip.expenses || [];
      const newExpenses = [...currentExpenses, expenseData];
      const { data } = await api.put(`/trip/${id}/expenses`, { expenses: newExpenses });
      setTrip(data.data);
      setShowExpenseModal(false);
      alert('Expense added successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const completeTrip = async (completionData) => {
    try {
      const { data } = await api.put(`/trip/${id}/complete`, completionData);
      setTrip(data.data);
      setShowCompleteModal(false);
      alert('Trip completed successfully!');
      navigate('/supervisor/trips');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Helper functions for calculations
  const calculateAvgWeight = (birds, weight) => {
    if (birds > 0 && weight > 0) {
      return (weight / birds).toFixed(2);
    }
    return 0;
  };

  const calculateAmount = (weight, ratePerKg) => {
    return (weight * ratePerKg).toFixed(2);
  };

  // Edit handlers
  const handleEditPurchase = async (e) => {
    e.preventDefault();
    try {
      const cleanedPurchaseData = {
        ...purchaseData,
        supplier: purchaseData.supplier === '' ? null : purchaseData.supplier
      };

      const { data } = await api.put(`/trip/${id}/purchase/${editingPurchaseIndex}`, cleanedPurchaseData);
      if (data.success) {
        setTrip(data.data);
        setShowPurchaseModal(false);
        setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
        setEditingPurchaseIndex(null);
        alert('Purchase updated successfully!');
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      alert(error.response?.data?.message || 'Failed to update purchase');
    }
  };

  const handleEditSale = async (e) => {
    e.preventDefault();
    try {
      const cleanedSaleData = {
        ...saleData,
        client: saleData.client === '' ? null : saleData.client
      };

      const { data } = await api.put(`/trip/${id}/sale/${editingSaleIndex}`, cleanedSaleData);
      if (data.success) {
        setTrip(data.data);
        setShowSaleModal(false);
        setSaleData({ client: '', billNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, /* paymentMode: 'cash', paymentStatus: 'pending', */ receivedAmount: 0, discount: 0, balance: 0, cashPaid: 0, onlinePaid: 0 });
        setEditingSaleIndex(null);
        alert('Sale updated successfully!');
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      alert(error.response?.data?.message || 'Failed to update sale');
    }
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/trip/${id}/expenses/${editingExpenseIndex}`, expenseData);
      if (data.success) {
        setTrip(data.data);
        setShowExpenseModal(false);
        setExpenseData({ category: 'meals', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
        setEditingExpenseIndex(null);
        alert('Expense updated successfully!');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert(error.response?.data?.message || 'Failed to update expense');
    }
  };

  const handleEditDiesel = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/trip/${id}/diesel/${editingDieselIndex}`, dieselData);
      if (data.success) {
        setTrip(data.data);
        setShowDieselModal(false);
        setEditingDieselIndex(null);
        setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
        alert('Diesel record updated successfully!');
      }
    } catch (error) {
      console.error('Error updating diesel record:', error);
      alert(error.response?.data?.message || 'Failed to update diesel record');
    }
  };

  const handleEditStock = async (e) => {
    e.preventDefault();
    try {
      const cleanedStockData = {
        birds: Number(stockData.birds),
        weight: Number(stockData.weight),
        rate: Number(stockData.rate),
        notes: stockData.notes
      };

      const { data } = await api.put(`/trip/${id}/stock/${editingStockIndex}`, cleanedStockData);
      if (data.success) {
        setTrip(data.data);
        setShowStockModal(false);
        setEditingStockIndex(null);
        setStockData({ birds: 0, weight: 0, avgWeight: 0, rate: 0, value: 0, notes: '' });
        alert('Stock updated successfully!');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.message || 'Failed to update stock');
    }
  };

  function extract_excel_data(trip) {
    const data = trip;

    // Extract basic information
    const basic_info = {
        'DATE': data.date,
        'VEHICLE NO': data.vehicle.vehicleNumber,
        'PLACE': data.place,
        'SUPERVISOR': data.supervisor.name,
        'DRIVER': data.driver,
        'LABOUR': data.labour || 'N/A',
        'START LOCATION (ROUTE)': data.route?.from || 'N/A',
        'END LOCATION (ROUTE)': data.route?.to || 'N/A',
    };

    // Extract expenses
    const expenses = {};
    data.expenses.forEach(expense => {
        expenses[expense.category.toUpperCase()] = expense.amount;
    });

    // Extract diesel information
    const diesel_info = {
        'DIESEL': {
            'VOL': data.diesel.totalVolume,
            'RATE': data.diesel.stations[0].rate,
            'AMT': data.diesel.totalAmount
        }
    };

    // Extract purchases
    const purchases = data.purchases.map(purchase => ({
        'DRIVER NAME': data.driver,
        'SUP': (data.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-')) 
          ? 'Transferred Purchase' 
          : (purchase.supplier?.vendorName || 'N/A'),
        'PARTICULOUR': 'PURCHASE',
        'DC NO': purchase.dcNumber,
        'BIRDS': purchase.birds,
        'WEIGHT': purchase.weight,
        'AVG': purchase.avgWeight,
        'RATE': purchase.rate,
        'AMOUNT': purchase.amount,
        'LESS TDS': 0, // Assuming no TDS for simplicity
        'BALANCE': purchase.amount,
        'REMARKS': ''
    }));

    // Extract sales
    const sales = data.sales.map(sale => ({
        'DRIVER NAME': data.driver,
        'SUP': sale.client.shopName,
        'PARTICULOUR': 'SALE',
        'DC NO': sale.billNumber,
        'BIRDS': sale.birds,
        'WEIGHT': sale.weight,
        'AVG': sale.avgWeight,
        'RATE': sale.rate,
        'AMOUNT': sale.amount,
        'LESS TDS': 0, // Assuming no TDS for simplicity
        'BALANCE': sale.receivedAmount,
        'REMARKS': ''
    }));

    return { basic_info, expenses, diesel_info, purchases, sales };
}



  const downloadExcel = () => {
    if (!trip) return;

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Trip Report', {
        views: [{ showGridLines: false }]
    });

    // Set column widths to match reference
    worksheet.columns = [
        { width: 9 },    // A
        { width: 4.27 },   // B
        { width: 4.91 },   // C
        { width: 6 },   // D
        { width: 2.91 },   // E
        { width: 15.18 },   // F
        { width: 6.55 },   // G
        { width: 5.73 },   // H
        { width: 6.91 },   // I
        { width: 6.45 },   // J
        { width: 6 },   // K
        { width: 7.82},   // L
        { width: 6.91 },   // M
        { width: 7.81 },   // N
        { width: 4.91 },   // O
        { width: 10 },   // P
        { width: 10 }    // Q
    ];

    // Styles
    const headerStyle = {
        font: { bold: true, size: 12 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: { top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const subHeaderStyle = {
        font: { bold: true, size: 11 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D3D3D3' } }
    };

    const totalStyle = {
        font: { bold: true, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } },
        color: { argb: 'FFFFFF' }
    };

    const yellowHighlight = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }
    };

    // PARTICULARS Section (Top section)
    worksheet.mergeCells('B1:D1');
    const particularsCell = worksheet.getCell('B1');
    particularsCell.value = 'PARTICULARS';
    particularsCell.style = { font: { bold: true, size: 14 } };

    // Date and vehicle details
    worksheet.mergeCells('A2:B2');
    worksheet.getCell('A2').value = 'DATE';
    worksheet.getCell('A2').style = subHeaderStyle;

    worksheet.mergeCells('C2:D2');
    worksheet.getCell('C2').value = new Date(trip.date || trip.createdAt).toLocaleDateString();
    worksheet.getCell('C2').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('E2:F2');
    worksheet.getCell('E2').value = 'VEHICLE NO';
    worksheet.getCell('E2').style = subHeaderStyle;

    worksheet.mergeCells('G2:H2');
    worksheet.getCell('G2').value = trip.vehicle?.vehicleNumber || 'N/A';
    worksheet.getCell('G2').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('I2:J2');
    worksheet.getCell('I2').value = 'PLACE';
    worksheet.getCell('I2').style = subHeaderStyle;

    worksheet.mergeCells('K2:L2');
    worksheet.getCell('K2').value = trip.place || 'N/A';
    worksheet.getCell('K2').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('M2:N2');
    worksheet.getCell('M2').value = 'SUPERVISOR';
    worksheet.getCell('M2').style = subHeaderStyle;

    worksheet.mergeCells('O2:P2');
    worksheet.getCell('O2').value = trip.supervisor?.name || 'N/A';
    worksheet.getCell('O2').style = { alignment: { horizontal: 'left' } };

    // Row 3: Driver, Labour, Start Location, End Location
    worksheet.mergeCells('A3:B3');
    worksheet.getCell('A3').value = 'DRIVER';
    worksheet.getCell('A3').style = subHeaderStyle;

    worksheet.mergeCells('C3:D3');
    worksheet.getCell('C3').value = trip.driver || 'N/A';
    worksheet.getCell('C3').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('E3:F3');
    worksheet.getCell('E3').value = 'LABOUR';
    worksheet.getCell('E3').style = subHeaderStyle;

    worksheet.mergeCells('G3:H3');
    worksheet.getCell('G3').value = trip.labour || 'N/A';
    worksheet.getCell('G3').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('I3:J3');
    worksheet.getCell('I3').value = 'START LOCATION (ROUTE)';
    worksheet.getCell('I3').style = subHeaderStyle;

    worksheet.mergeCells('K3:L3');
    worksheet.getCell('K3').value = trip.route?.from || 'N/A';
    worksheet.getCell('K3').style = { alignment: { horizontal: 'left' } };

    worksheet.mergeCells('M3:N3');
    worksheet.getCell('M3').value = 'END LOCATION (ROUTE)';
    worksheet.getCell('M3').style = subHeaderStyle;

    worksheet.mergeCells('O3:P3');
    worksheet.getCell('O3').value = trip.route?.to || 'N/A';
    worksheet.getCell('O3').style = { alignment: { horizontal: 'left' } };

    // Column headers for purchases (now at row 5 since we added row 3)
    const headers = [
        { col: 'A', value: 'S N', width: 5 },
        { col: 'B', value: 'SUPPLIERS', width: 15 },
        { col: 'D', value: 'DC NO', width: 10 },
        { col: 'F', value: 'BIRDS', width: 10 },
        { col: 'H', value: 'WEIGHT', width: 10 },
        { col: 'J', value: 'AVG', width: 10 },
        { col: 'K', value: 'RATE', width: 10 },
        { col: 'L', value: 'AMOUNT', width: 12 },
        { col: 'N', value: 'PART', width: 12 },
        { col: 'O', value: 'AMOUNT', width: 10 }
    ];

    headers.forEach(h => {
        worksheet.getCell(`${h.col}5`).value = h.value;
        worksheet.getCell(`${h.col}5`).style = subHeaderStyle;
        worksheet.getColumn(h.col).width = h.width;
    });

    // Merge cells for multi-column headers
    worksheet.mergeCells('B5:C5');
    worksheet.mergeCells('D5:E5');
    worksheet.mergeCells('F5:G5');
    worksheet.mergeCells('H5:I5');
    worksheet.mergeCells('M5:N5');

    // Add purchase data
    let currentRow = 6;
    (trip.purchases || []).forEach((purchase, index) => {
        worksheet.getCell(`A${currentRow}`).value = index + 1;
        worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = (trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-')) 
          ? 'Transferred Purchase' 
          : (purchase.supplier?.vendorName || 'N/A');

        worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
        worksheet.getCell(`D${currentRow}`).value = purchase.dcNumber || 'N/A';
        worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
        worksheet.getCell(`F${currentRow}`).value = purchase.birds || 0;
        worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
        worksheet.getCell(`H${currentRow}`).value = purchase.weight || 0;
        worksheet.getCell(`H${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`J${currentRow}`).value = purchase.weight && purchase.birds ?
            (purchase.weight / purchase.birds).toFixed(2) : '0.00';
        worksheet.getCell(`J${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`K${currentRow}`).value = purchase.rate || 0;
        worksheet.getCell(`K${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`L${currentRow}`).value = purchase.amount || 0;
        worksheet.getCell(`L${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.mergeCells(`M${currentRow}:N${currentRow}`);
        worksheet.getCell(`M${currentRow}`).value = 'SUSP';
        worksheet.getCell(`M${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.getCell(`O${currentRow}`).value = purchase.amount || 0;
        worksheet.getCell(`O${currentRow}`).style = { alignment: { horizontal: 'right' } };

        currentRow++;
    });

    // Total row for purchases
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).style = totalStyle;

    worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
    worksheet.getCell(`D${currentRow}`).style = totalStyle;

    worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
    worksheet.getCell(`F${currentRow}`).value = trip.summary?.totalBirdsPurchased || 0;
    worksheet.getCell(`F${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
    worksheet.getCell(`H${currentRow}`).value = trip.summary?.totalWeightPurchased || 0;
    worksheet.getCell(`H${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`J${currentRow}`).value = trip.summary?.totalBirdsPurchased && trip.summary?.totalWeightPurchased ?
        (trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased).toFixed(2) : '0.00';
    worksheet.getCell(`J${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`K${currentRow}`).style = totalStyle;
    worksheet.getCell(`L${currentRow}`).style = totalStyle;

    worksheet.mergeCells(`M${currentRow}:N${currentRow}`);
    worksheet.getCell(`M${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`M${currentRow}`).style = totalStyle;

    worksheet.getCell(`O${currentRow}`).value = trip.summary?.totalPurchaseAmount || 0;
    worksheet.getCell(`O${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    currentRow += 2;

    // VEHICLE EXP Section
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const vehicleExpCell = worksheet.getCell(`A${currentRow}`);
    vehicleExpCell.value = 'VEHICLE EXP';
    vehicleExpCell.style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } },
        alignment: { horizontal: 'left' }
    };
    currentRow++;

    // Vehicle exp headers
    worksheet.getCell(`A${currentRow}`).value = 'S N';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    worksheet.getCell(`B${currentRow}`).value = 'NCRBIRDS DETAILBILL';
    worksheet.getCell(`B${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`D${currentRow}`).value = 'WEIGHT';
    worksheet.getCell(`D${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`E${currentRow}`).value = 'AVG';
    worksheet.getCell(`E${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`F${currentRow}`).value = 'RATE';
    worksheet.getCell(`F${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`G${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`G${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`H${currentRow}`).value = 'CASH';
    worksheet.getCell(`H${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`I${currentRow}`).value = 'ONLINE';
    worksheet.getCell(`I${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`J${currentRow}`).value = 'DISC';
    worksheet.getCell(`J${currentRow}`).style = subHeaderStyle;

    currentRow++;

    // Add sales data
    (trip.sales || []).forEach((sale, index) => {
        worksheet.getCell(`A${currentRow}`).value = index + 1;
        worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'center' } };

        worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = sale.client?.shopName || 'N/A';

        worksheet.getCell(`D${currentRow}`).value = sale.weight || 0;
        worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`E${currentRow}`).value = sale.weight && (sale.birdsCount || sale.birds) ?
            (sale.weight / (sale.birdsCount || sale.birds)).toFixed(2) : '0.00';
        worksheet.getCell(`E${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`F${currentRow}`).value = sale.ratePerKg || sale.rate || 0;
        worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`G${currentRow}`).value = sale.totalAmount || sale.amount || 0;
        worksheet.getCell(`G${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`H${currentRow}`).value = sale.cashPayment || 0; // || (sale.paymentMode === 'cash' ? sale.amount : 0) || 0;
        worksheet.getCell(`H${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`I${currentRow}`).value = sale.onlinePayment || 0; // || (sale.paymentMode === 'online' ? sale.amount : 0) || 0;
        worksheet.getCell(`I${currentRow}`).style = { alignment: { horizontal: 'right' } };

        worksheet.getCell(`J${currentRow}`).value = sale.discount || 0;
        worksheet.getCell(`J${currentRow}`).style = { alignment: { horizontal: 'right' } };

        currentRow++;
    });

    // Total sales row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).style = { font: { bold: true } };

    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    worksheet.getCell(`B${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`D${currentRow}`).value = trip.summary?.totalWeightSold || 0;
    worksheet.getCell(`D${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.totalBirdsSold && trip.summary?.totalWeightSold ?
        (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) : '0.00';
    worksheet.getCell(`E${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = trip.summary?.averageRate || 0;
    worksheet.getCell(`F${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`G${currentRow}`).value = trip.summary?.totalSalesAmount || 0;
    worksheet.getCell(`G${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`H${currentRow}`).value = trip.summary?.totalCashPayment || 0;
    worksheet.getCell(`H${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`I${currentRow}`).value = trip.summary?.totalOnlinePayment || 0;
    worksheet.getCell(`I${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`J${currentRow}`).value = trip.summary?.totalDiscount || 0;
    worksheet.getCell(`J${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    currentRow += 2;

    // DIESEL Section
    worksheet.getCell(`A${currentRow}`).value = 'DIESEL';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = 'VOL';
    worksheet.getCell(`B${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`C${currentRow}`).value = 'RATE';
    worksheet.getCell(`C${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`D${currentRow}`).value = 'AMT';
    worksheet.getCell(`D${currentRow}`).style = subHeaderStyle;

    currentRow++;

    // Add diesel data
    if (trip.diesel?.stations) {
        trip.diesel.stations.forEach(station => {
            worksheet.getCell(`A${currentRow}`).value = station.name || '';
            worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'left' } };

            worksheet.getCell(`B${currentRow}`).value = station.volume || 0;
            worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

            worksheet.getCell(`C${currentRow}`).value = station.rate || 0;
            worksheet.getCell(`C${currentRow}`).style = { alignment: { horizontal: 'right' } };

            worksheet.getCell(`D${currentRow}`).value = station.amount || 0;
            worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

            currentRow++;
        });
    }

    // Total diesel row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`B${currentRow}`).value = trip.diesel?.totalVolume || 0;
    worksheet.getCell(`B${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = '';
    worksheet.getCell(`C${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`D${currentRow}`).value = trip.diesel?.totalAmount || 0;
    worksheet.getCell(`D${currentRow}`).style = { font: { bold: true }, alignment: { horizontal: 'right' } };

    currentRow += 2;

    // OP READING and other metrics
    worksheet.getCell(`A${currentRow}`).value = 'OP READING';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.opening || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'CL READING';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.closing || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL RUNNING KM';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.totalDistance || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL DIESEL VOL';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.diesel?.totalVolume || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'VEHICLE AVERAGE';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.vehicleReadings?.totalDistance && trip.diesel?.totalVolume ?
        (trip.vehicleReadings.totalDistance / trip.diesel.totalVolume).toFixed(2) : '0.00';
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow += 2;

    // PROFIT & LOSS SUMMARY
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const profitLossCell = worksheet.getCell(`A${currentRow}`);
    profitLossCell.value = 'PROFIT & LOSS SUMMARY';
    profitLossCell.style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } },
        alignment: { horizontal: 'left' }
    };
    currentRow++;

    // Financial breakdown
    worksheet.getCell(`A${currentRow}`).value = 'RENT AMT PER KM';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.rentPerKm || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'GROSS RENT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.totalKm ? (trip.totalKm * (trip.rentPerKm || 0)) : 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'LESS DIESEL AMT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.dieselAmount || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'NETT RENT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.totalKm ?
        ((trip.totalKm * (trip.rentPerKm || 0)) - (trip.dieselAmount || 0)) : 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'BIRDS PROFIT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.birdsProfit || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PROFIT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.netProfit || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'PROFIT PER KG';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.totalWeightSold ?
        (trip.summary.netProfit / trip.summary.totalWeightSold).toFixed(2) : '0.00';
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow += 2;

    // WEIGHT LOSS TRACKING
    worksheet.getCell(`A${currentRow}`).value = '';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`B${currentRow}`).value = 'BIRDS';
    worksheet.getCell(`B${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`C${currentRow}`).value = 'WEIGHT';
    worksheet.getCell(`C${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`D${currentRow}`).value = 'AVG';
    worksheet.getCell(`D${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`E${currentRow}`).value = 'RATE';
    worksheet.getCell(`E${currentRow}`).style = subHeaderStyle;

    worksheet.getCell(`F${currentRow}`).value = 'AMOUNT';
    worksheet.getCell(`F${currentRow}`).style = subHeaderStyle;

    currentRow++;

    // Death birds row
    worksheet.getCell(`A${currentRow}`).value = 'DEATH BIRDS';
    worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'left' } };

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.totalBirdsLost || 0;
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = (trip.summary?.totalWeightLost || 0).toFixed(2);
    worksheet.getCell(`C${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`D${currentRow}`).value = trip.summary?.totalBirdsPurchased > 0 ?
        ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00';
    worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.avgPurchaseRate?.toFixed(2) || 0;
    worksheet.getCell(`E${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = (trip.summary?.totalLosses || 0).toFixed(2);
    worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    // Natural weight loss row
    worksheet.getCell(`A${currentRow}`).value = 'NATURAL WEIGHT LOSS';
    worksheet.getCell(`A${currentRow}`).style = { alignment: { horizontal: 'left' } };

    worksheet.getCell(`B${currentRow}`).value = '-';
    worksheet.getCell(`B${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = trip.status === 'completed' ?
        (trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00';
    worksheet.getCell(`C${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`D${currentRow}`).value = trip.summary?.totalBirdsPurchased > 0 ?
        ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00';
    worksheet.getCell(`D${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00';
    worksheet.getCell(`E${currentRow}`).style = { alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = trip.status === 'completed' ?
        ((trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)).toFixed(2) : '0.00';
    worksheet.getCell(`F${currentRow}`).style = { alignment: { horizontal: 'right' } };

    currentRow++;

    // Total weight loss row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL W LOSS';
    worksheet.getCell(`A${currentRow}`).style = totalStyle;

    worksheet.getCell(`B${currentRow}`).value = trip.summary?.totalBirdsLost || 0;
    worksheet.getCell(`B${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`C${currentRow}`).value = ((trip.summary?.totalWeightLost || 0) +
        (trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0) : 0)).toFixed(2);
    worksheet.getCell(`C${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`D${currentRow}`).value = '-';
    worksheet.getCell(`D${currentRow}`).style = totalStyle;

    worksheet.getCell(`E${currentRow}`).value = trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00';
    worksheet.getCell(`E${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    worksheet.getCell(`F${currentRow}`).value = ((trip.summary?.totalLosses || 0) +
        (trip.status === 'completed' ? ((trip.summary?.birdWeightLoss || 0) *
        (trip.summary?.avgPurchaseRate || 0)) : 0)).toFixed(2);
    worksheet.getCell(`F${currentRow}`).style = { ...totalStyle, alignment: { horizontal: 'right' } };

    // Add borders to all cells
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Generate Excel file
    workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = `Trip_${trip.tripId}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(blob, fileName);
    });
};

const downloadExcel2 = () => {
  
    const generateExcel = () => {
      const { basic_info, expenses, diesel_info, purchases, sales } = extract_excel_data(trip);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('SALES BOOK');
  
      // Add basic information
      worksheet.mergeCells('A1:D1');
      worksheet.getCell('A1').value = 'PERTICULARS';

      Object.keys(basic_info).forEach((info, index) => {
        worksheet.mergeCells(`A${index + 2}:B${index + 2}`);
        worksheet.mergeCells(`C${index + 2}:D${index + 2}`);
        worksheet.getCell(`A${index + 2}`).value = info;
        worksheet.getCell(`C${index + 2}`).value = basic_info[info];
      });
  
      // Add expenses
      worksheet.mergeCells(`A8:D8`);
      worksheet.getCell(`A8`).value = 'VEHICLE EXPENSES';
      worksheet.getCell(`D8`).value = 'AMT';
      let rowIndex = 9;
      Object.entries(expenses).forEach(([category, amount]) => {
        worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
        worksheet.getCell(`A${rowIndex}`).value = category;
        worksheet.getCell(`D${rowIndex}`).value = amount;
        rowIndex++;
      });
  
      // Add diesel information
      const diesel = diesel_info['DIESEL'];
      worksheet.getCell(`A${rowIndex}`).value = 'DIESEL';
      worksheet.getCell(`B${rowIndex}`).value = 'VOL';
      worksheet.getCell(`C${rowIndex}`).value = diesel['VOL'];
      worksheet.getCell(`D${rowIndex}`).value = 'RATE';
      worksheet.getCell(`E${rowIndex}`).value = diesel['RATE'];
      worksheet.getCell(`F${rowIndex}`).value = 'AMT';
      worksheet.getCell(`G${rowIndex}`).value = diesel['AMT'];
      rowIndex += 2;
  
      // Add purchases
      const purchaseHeaders = [
        'S N', 'SUPPLIERS', 'DC NO',
        'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT', 'BALANCE',
      ];
  
      let purchaseCells = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
      purchaseHeaders.forEach((header, index) => {
        worksheet.getCell(`${purchaseCells[index]}:1`).value = header || '';
      });
  
      console.log(purchases);
      // rowIndex++;
      purchases.forEach(purchase => {
        Object.keys(purchase).forEach((value, index) => {
          console.log(`${purchaseCells[index]}:2`)
          worksheet.getCell(`${purchaseCells[index]}:2`).value = purchase[value];
        });
        // rowIndex++;
      });
  
      // Add sales
      sales.forEach(sale => {
        Object.values(sale).forEach((value, index) => {
          worksheet.getCell(`${String.fromCharCode(65 + index)}${rowIndex}`).value = value;
        });
        rowIndex++;
      });
  
      // Generate Excel file
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'SalesBook.xlsx');
      });
    
      
}
  generateExcel()
}

  const downloadPDF = () => {
    downloadTripPDF(trip);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Trip not found</p>
      </div>
    );
  }

  // Check access permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const isOwner = trip.supervisor?.id === user?.id;
  
  if (!isAdmin && (!isSupervisor || !isOwner)) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          {isSupervisor ? 'You can only view your own trips.' : 'You do not have permission to view this trip.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{trip.vehicle?.vehicleNumber || 'N/A'}</h1>
          <p className="text-gray-600 mt-1">{trip.tripId || 'N/A'}</p>
          {trip.type === 'transferred' && (
            <p className="text-orange-600 text-sm font-medium mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
              Transferred Trip - Contains transferred stock from Trip{' '}
              {trip.transferredFrom?.tripId ? (
                <Link
                  to={`/trips/${trip.transferredFrom.id}`}
                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  rel="noopener noreferrer"
                >
                  {trip.transferredFrom.tripId}
                </Link>
              ) : (
                'another trip'
              )}
            </p>
          )}
          <p className="text-gray-500 text-sm mt-1">Manage trip details and operations</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          {/* Excel Download Button - Available for all users */}
          <button
            onClick={downloadExcel2}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={20} />
            Download Excel
          </button>
          
          {/* PDF Download Button */}
          <button
            onClick={downloadPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FileText size={20} />
            Download PDF
          </button>
          
          {/* Supervisor-only buttons */}
          {isSupervisor && trip.status !== 'completed' && (
            <>
              {/* Only show Add Purchase button for non-transferred trips */}
              {trip.type !== 'transferred' && (
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Purchase
                </button>
              )}
              <button
                onClick={() => setShowSaleModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Sale
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Expense
              </button>
              <button
                onClick={() => setShowCompleteModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Complete Trip
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trip Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{trip.vehicle?.vehicleNumber}</h3>
              <p className="text-sm text-gray-500">{trip.vehicle?.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{trip.place}</h3>
              <p className="text-sm text-gray-500">Location</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{trip.driver}</h3>
              <p className="text-sm text-gray-500">Driver</p>
            </div>
          </div>
        </div> */}

        {/* Comprehensive Trip Details for Admins */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            {/* PARTICULARS Section */}
            <div className="bg-green-600 text-white px-6 py-3">
              <h3 className="text-lg font-bold">PARTICULARS</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DATE</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(trip.date || trip.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VEHICLE NO</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.vehicle?.vehicleNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLACE</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.place || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SUPERVISOR</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.supervisor?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DRIVER</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.driver || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LABOUR</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.labour || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">START LOCATION ( ROUTE )</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.route?.from || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">END LOCATION ( ROUTE )</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.route?.to || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor/Purchase Details Section */}
            <div className="border-t">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">PURCHASE DETAILS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">S N</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">SUPPLIERS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">DC NO</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">BIRDS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">WEIGHT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">AVG</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">AMOUNT</th>
                   
                    </tr>
                  </thead>
                  <tbody>
                    {trip.purchases?.map((purchase, index) => (
                      <tr key={purchase.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-') 
                            ? 'Transferred Purchase' 
                            : (purchase.supplier?.vendorName || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.dcNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.weight || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {purchase.weight && purchase.birds ? (purchase.weight / purchase.birds).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{(purchase.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(purchase.amount || 0).toFixed(2)}</td>
                       
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-black text-white font-bold">
                      <td className="px-4 py-3 border-r">TOTAL</td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">{trip.summary?.totalBirdsPurchased || 0}</td>
                      <td className="px-4 py-3 border-r">{(trip.summary?.totalWeightPurchased || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">
                        {trip.summary?.totalBirdsPurchased && trip.summary?.totalWeightPurchased 
                          ? (trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased).toFixed(2) 
                          : '0.00'}
                      </td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</td>
                     
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer/Sales Details Section */}
            <div className="border-t">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">SALES DETAILS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">S N</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">DELIVERY DETAILS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">BILL NO</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">BIRDS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">WEIGHT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">AVG</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">TOTAL</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">CASH RECEIPT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">ONLINE RECEIPT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">DISC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sales Entries */}
                    {trip.sales?.map((sale, index) => (
                      <tr key={`sale-${sale.id}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.client?.shopName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.billNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.birdsCount || sale.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.weight || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {sale.weight && (sale.birdsCount || sale.birds) ? (sale.weight / (sale.birdsCount || sale.birds)).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{(sale.ratePerKg || sale.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.totalAmount || sale.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.cashPaid || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.onlinePaid || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{(sale.discount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    
                    {/* Stocks Entries */}
                    {trip.stocks?.map((stock, index) => (
                      <tr key={`stock-${index}`} className="border-b hover:bg-blue-100 bg-blue-100">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(trip.sales?.length || 0) + index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                          <span className="text-blue-700 font-semibold">Stock Point #{index + 1}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{stock.billNumber || ''}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{stock.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(stock.weight || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                          {stock.weight && stock.birds ? (stock.weight / stock.birds).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">₹{(stock.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-800 border-r">₹{(stock.value || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                      </tr>
                    ))}

                    {/* Transfer Entries */}
                    {trip.transfers?.map((transfer, index) => (
                      <tr key={`transfer-${index}`} className="border-b hover:bg-gray-50 bg-orange-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{(trip.sales?.length || 0) + (trip.stocks?.length || 0) + index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">Transferred to Trip #{transfer.transferredTo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{new Date(transfer.transferredAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{transfer.transferredStock?.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{(transfer.transferredStock?.weight || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {transfer.transferredStock?.avgWeight || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{(transfer.transferredStock?.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">
                          ₹{((transfer.transferredStock?.birds || 0) * (transfer.transferredStock?.rate || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                      </tr>
                    ))}

                    {/* Transferred Sales Entries - Show transferred stock data */}
                    {trip.transferHistory?.map((transfer, transferIndex) => {
                      const transferredStock = transfer.transferredStock;
                      const totalAmount = (transferredStock?.birds || 0) * (transferredStock?.rate || 0);
                      
                      return (
                        <tr key={`transfer-sales-${transferIndex}`} className="border-b hover:bg-purple-100 bg-purple-100">
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(trip.sales?.length || 0) + (trip.stocks?.length || 0) + (trip.transfers?.length || 0) + transferIndex + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                            <span className="text-purple-800 font-bold">INTRA 2 CROSSING (Transfer Sale)</span>
                            <div className="text-xs text-purple-700">
                              (To Trip #{transfer.transferredTo?.tripId ? (
                                <Link 
                                  to={`/trips/${transfer.transferredTo.id}`}
                                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                  {transfer.transferredTo.tripId}
                                </Link>
                              ) : (
                                transfer.transferredTo || 'N/A'
                              )})
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r">{new Date(transfer.transferredAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{transferredStock?.birds || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(transferredStock?.weight || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                            {(transferredStock?.avgWeight).toFixed(2) || (transferredStock?.weight && transferredStock?.birds ? (transferredStock.weight / transferredStock.birds).toFixed(2) : '0.00')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">₹{(transferredStock?.rate || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-purple-800 border-r">₹{totalAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                          <td className="px-4 py-3 text-sm text-gray-500">-</td>
                        </tr>
                      );
                    })}
                    {/* Total Sales Row */}
                    <tr className="bg-black text-white font-bold">
                      <td className="px-4 py-3 border-r">TOTAL SALE</td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">{trip.summary?.totalBirdsSold || 0}</td>
                      <td className="px-4 py-3 border-r">{(trip.summary?.totalWeightSold || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">
                        {trip.summary?.totalBirdsSold && trip.summary?.totalWeightSold 
                          ? (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) 
                          : '0.00'}
                      </td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.averageRate || (trip.sales?.length > 0 ? trip.sales.reduce((acc, sale) => acc + sale.rate, 0) / trip.sales.length : 0)).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalSalesAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalCashPaid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalOnlinePaid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">₹{(trip.summary?.totalDiscount || 0).toFixed(2)}</td>
                    </tr>


                    {/* Total Transfer Row */}
                    {trip.transfers && trip.transfers.length > 0 && (
                      <tr className="bg-orange-600 text-white font-bold">
                        <td className="px-4 py-3 border-r">TOTAL TRANSFER</td>
                        <td className="px-4 py-3 border-r"></td>
                        <td className="px-4 py-3 border-r"></td>
                        <td className="px-4 py-3 border-r">{trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.birds || 0), 0)}</td>
                        <td className="px-4 py-3 border-r">{(trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.weight || 0), 0)).toFixed(2)}</td>
                        <td className="px-4 py-3 border-r">
                          {(() => {
                            const totalTransferBirds = trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.birds || 0), 0);
                            const totalTransferWeight = trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.weight || 0), 0);
                            return totalTransferBirds > 0 ? (totalTransferWeight / totalTransferBirds).toFixed(2) : '0.00';
                          })()}
                        </td>
                        <td className="px-4 py-3 border-r">-</td>
                        <td className="px-4 py-3 border-r">
                          ₹{(trip.transfers.reduce((sum, transfer) => sum + ((transfer.transferredStock?.birds || 0) * (transfer.transferredStock?.rate || 0)), 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 border-r">-</td>
                        <td className="px-4 py-3 border-r">-</td>
                        <td className="px-4 py-3">-</td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">WEIGHT LOSS TRACKING</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r"></th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">BIRDS</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">WEIGHT</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">AVG</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody> 
                          <tr className="border-b">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">DEATH BIRDS</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.summary?.totalBirdsLost || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{(trip.summary?.totalWeightLost || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              {trip.summary?.totalBirdsPurchased > 0 ? ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{trip.summary?.avgPurchaseRate?.toFixed(2) || 0}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{(trip.summary?.totalLosses || 0).toFixed(2)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">NATURAL WEIGHT LOSS</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">-</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              {trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              {trip.summary?.totalBirdsPurchased > 0 ? ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              ₹{trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                              ₹{trip.status === 'completed' ? 
                                ((trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                          <tr className="bg-black text-white font-bold">
                            <td className="px-3 py-2 border-r">TOTAL W LOSS</td>
                            <td className="px-3 py-2 border-r">{trip.summary?.totalBirdsLost || 0}</td>
                            <td className="px-3 py-2 border-r">
                              {((trip.summary?.totalWeightLost || 0) + (trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0) : 0)).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-r">
                              -
                            </td>
                            <td className="px-3 py-2 border-r">₹{trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00'}</td>
                            <td className="px-3 py-2">
                              ₹{((trip.summary?.totalLosses || 0) + (trip.status === 'completed' ? 
                                ((trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)) : 0)).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">DIESEL CONSUMPTION</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">DIESEL</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">VOL</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">AMT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            trip.diesel?.stations && trip.diesel.stations.map((station, index) => (
                              <tr key={index} className="border-b">
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">{station.name}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">{(station.volume || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{(station.rate || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{(station.amount || 0).toFixed(2)}</td>
                              </tr>
                            ))
                          }

  {(() => {
        const totals = trip.diesel.stations.reduce(
          (acc, s) => {
            acc.volume += s.volume;
            acc.rate += s.rate;
            acc.amount += s.amount;
            return acc;
          },
          { volume: 0, rate: 0, amount: 0 }
        );

        return (
          <tr className="bg-gray-100 font-bold">
            <td className="px-3 py-2 border-r">TOTAL</td>
            <td className="px-3 py-2 border-r">{(totals.volume || 0).toFixed(2)}</td>
            <td className="px-3 py-2 border-r">₹{(totals.rate || 0).toFixed(2)}</td>
            <td className="px-3 py-2">₹{(totals.amount || 0).toFixed(2)}</td>
          </tr>
        );
      })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Metrics and Financial Breakdown - Side by Side */}
            <div className="border-t">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">TRIP METRICS</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">OP READING:</span>
                        <span className="font-semibold">{trip.vehicleReadings?.opening || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">CL READING:</span>
                        <span className="font-semibold">{trip.vehicleReadings?.closing || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL RUNNING KM:</span>
                        <span className="font-semibold">{(trip.vehicleReadings?.totalDistance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL DIESEL VOL:</span>
                        <span className="font-semibold">{(trip.diesel?.totalVolume || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-gray-800 text-white px-3 py-2 rounded">
                        <span className="text-sm font-bold">VEHICLE AVERAGE:</span>
                        <span className="font-bold">
                          {trip.vehicleReadings?.totalDistance && trip.diesel?.totalVolume ? (trip.vehicleReadings?.totalDistance / trip.diesel?.totalVolume).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">FINANCIAL BREAKDOWN</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">RENT AMT PER KM:</span>
                        <span className="font-semibold">₹{(trip.rentPerKm || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">GROSS RENT:</span>
                        <span className="font-semibold">₹{(trip.totalKm ? (trip.totalKm * (trip.rentPerKm || 0)) : 0).toFixed(2)}</span>
                      </div>
                      {/* <div className="flex justify-between">
                        <span className="text-sm text-gray-600">LESS DIESEL AMT:</span>
                        <span className="font-semibold">₹{(trip.dieselAmount || 0).toFixed(2)}</span>
                      </div> */}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">NETT RENT:</span>
                        <span className="font-semibold">₹{(trip.totalKm ? ((trip.totalKm * (trip.rentPerKm || 0)) - (trip.dieselAmount || 0)) : 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">BIRDS PROFIT:</span>
                        <span className="font-semibold">₹{(trip.summary?.birdsProfit || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-gray-800 text-white px-3 py-2 rounded">
                        <span className="text-sm font-bold">NET PROFIT:</span>
                        <span className="font-bold">₹{(trip.summary?.netProfit || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-gray-200 px-3 py-2 rounded">
                        <span className="text-sm font-bold">MARGIN:</span>
                        <span className="font-bold">₹{(trip.summary?.totalWeightSold) ? (trip.summary.netProfit / trip.summary.totalWeightSold).toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'purchases', 'sales', 'stock', 'expenses', 'diesel', 'losses', 'financials'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Trip Summary</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
                    {/* Edit button - only show for completed trips */}
                    {trip.status === 'completed' && (
                      <button
                        onClick={() => setShowEditTripModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Place: {trip.place}</span>
                </div>
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Vehicle: {trip.vehicle?.vehicleNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Driver: {trip.driver}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <span className="block">Labours:</span>
                        <span className="block mt-1">{trip.labour || 'N/A'}</span>
                </div>
              </div>

                    {trip.vehicleReadings?.opening && (
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          Opening Odometer: {trip.vehicleReadings.opening} km
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Sales:</span>
                      <span className="font-medium text-right">₹{trip.summary?.totalSalesAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Purchase:</span>
                      <span className="font-medium text-right">₹{trip.summary?.totalPurchaseAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gross Profit:</span>
                      <span className="font-medium text-green-600 text-right">₹{trip.summary?.totalProfitMargin?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Expenses:</span>
                      <span className="font-medium text-right">₹{trip.summary?.totalExpenses?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Diesel Cost:</span>
                      <span className="font-medium text-right">₹{trip.summary?.totalDieselAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Mortality & Weight Loss :</span>
                      <span className="font-medium text-red-600 text-right">₹{trip.summary?.totalLosses?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3 mt-3">
                      <span className="text-sm font-medium text-gray-900">Net Profit:</span>
                      <span className="text-lg font-semibold text-green-600 text-right">
                        ₹{trip.status === 'completed' ? (trip.summary?.netProfit?.toFixed(2) || '0.00') : Math.max(0, trip.summary?.netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Purchases</h3>
                {/* Only show Add Purchase button for non-transferred trips */}
                {trip.status !== 'completed' && trip.type !== 'transferred' && (
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Purchase
                  </button>
                )}
              </div>
              {/* Informational message for transferred trips */}
              {trip.type === 'transferred' && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-700">
                        <strong>Transferred Trip:</strong> This trip contains transferred stock and cannot be modified. 
                        Purchase records show the transferred stock from the original trip.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {trip.purchases && trip.purchases.length > 0 ? (
                <div className="space-y-3">
                  {trip.purchases.map((purchase, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">DC: {purchase.dcNumber}</h4>
                          <p className="text-sm text-gray-600">
                            {trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-') 
                              ? 'Transferred from another trip' 
                              : `Vendor: ${purchase.supplier?.vendorName || 'N/A'}`
                            }
                          </p>
                          <p className="text-sm text-gray-600">
                            Birds: {purchase.birds} | Weight: {purchase.weight}kg | Rate: ₹{purchase.rate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{purchase.amount?.toLocaleString()}</p>
                          {/* <p className="text-sm text-gray-500">{purchase.paymentMode}</p> */}
                          {/* Edit button for completed trips - Admin/Superadmin only - Not for transferred trips */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && trip.type !== 'transferred' && (
                            <button
                              onClick={() => {
                                // Extract supplier ID properly - handle both populated and non-populated supplier fields
                                let supplierId = '';
                                if (typeof purchase.supplier === 'string') {
                                  supplierId = purchase.supplier;
                                } else if (purchase.supplier && (purchase.supplier._id || purchase.supplier.id)) {
                                  supplierId = purchase.supplier._id || purchase.supplier.id;
                                }
                                
                                setPurchaseData({
                                  supplier: supplierId,
                                  dcNumber: purchase.dcNumber || '',
                                  birds: purchase.birds || 0,
                                  weight: purchase.weight || 0,
                                  avgWeight: purchase.avgWeight || 0,
                                  rate: purchase.rate || 0,
                                  amount: purchase.amount || 0
                                });
                                setEditingPurchaseIndex(index);
                                setShowPurchaseModal(true);
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No purchases recorded yet.</p>
              )}
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Delivery Details' : 'Sales'}
                </h3>
                {isSupervisor && trip.status !== 'completed' && (
                  <button
                    onClick={() => setShowSaleModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Sale
                  </button>
                )}
              </div>
              {trip.sales && trip.sales.length > 0 ? (
                isAdmin ? (
                  // Admin view - Detailed table
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">S.N.</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Delivery Detail</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Bill No</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Birds</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Weight</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Avg</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Rate</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Total</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Cash</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Online</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Disc</th>
                          {/* Edit column for completed trips - Admin/Superadmin only */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {trip.sales.map((sale, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{sale.client?.shopName || 'N/A'}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{sale.billNumber || 'N/A'}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{sale.birds || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{sale.weight || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              {sale.weight && sale.birds ? (sale.weight / sale.birds).toFixed(2) : '0.00'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{sale.rate || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{sale.amount?.toLocaleString() || '0'}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{(sale.cashPaid || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{(sale.onlinePaid || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(sale.discount || 0).toLocaleString()}</td>
                            {/* Edit button for completed trips - Admin/Superadmin only */}
                            {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <button
                                  onClick={() => {
                                    // Extract client ID properly - handle both populated and non-populated client fields
                                    let clientId = '';
                                    if (typeof sale.client === 'string') {
                                      clientId = sale.client;
                                    } else if (sale.client && (sale.client._id || sale.client.id)) {
                                      clientId = sale.client._id || sale.client.id;
                                    }
                                    
                                    setSaleData({
                                      client: clientId,
                                      billNumber: sale.billNumber || '',
                                      birds: sale.birds || 0,
                                      weight: sale.weight || 0,
                                      avgWeight: sale.avgWeight || 0,
                                      rate: sale.rate || 0,
                                      amount: sale.amount || 0,
                                      // paymentMode: sale.paymentMode || 'cash',
                                      // paymentStatus: sale.paymentStatus || 'pending',
                                      receivedAmount: sale.receivedAmount || 0,
                                      discount: sale.discount || 0,
                                      balance: sale.balance || 0,
                                      cashPaid: sale.cashPaid || 0,
                                      onlinePaid: sale.onlinePaid || 0
                                    });
                                    setEditingSaleIndex(index);
                                    setShowSaleModal(true);
                                  }}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                                >
                                  <Edit size={10} />
                                  Edit
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900" colSpan={trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') ? "4" : "3"}>TOTAL</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{trip.summary?.totalBirdsSold || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{trip.summary?.totalWeightSold || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                            {trip.summary?.totalWeightSold && trip.summary?.totalBirdsSold ? 
                              (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) : '0.00'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.averageRate || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.totalSalesAmount?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(trip.summary?.totalCashPaid || 0).toLocaleString()}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(trip.summary?.totalOnlinePaid || 0).toLocaleString()}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(trip.summary?.totalDiscount || 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Supervisor view - Simple cards
                  <div className="space-y-3">
                    {trip.sales.map((sale, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">Bill: {sale.billNumber}</h4>
                            <p className="text-sm text-gray-600">Customer: {sale.client?.shopName}</p>
                            <p className="text-sm text-gray-600">
                              Birds: {sale.birds} | Weight: {sale.weight}kg | Rate: ₹{sale.rate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">₹{sale.amount?.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Balance: ₹{sale.balance?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-gray-500 text-center py-8">No sales recorded yet.</p>
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
                {trip.status !== 'completed' && (
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Expense
                  </button>
                )}
              </div>
              {trip.expenses && trip.expenses.length > 0 ? (
                <div className="space-y-3">
                  {trip.expenses.map((expense, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{expense.category}</h4>
                          <p className="text-sm text-gray-600">{expense.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">₹{expense.amount?.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{expense.receipt}</p>
                          {/* Edit button for completed trips - Admin/Superadmin only */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <button
                              onClick={() => {
                                setExpenseData({
                                  category: expense.category || 'meals',
                                  description: expense.description || '',
                                  amount: expense.amount || 0,
                                  date: expense.date || new Date().toISOString().split('T')[0]
                                });
                                setEditingExpenseIndex(index);
                                setShowExpenseModal(true);
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No expenses recorded yet.</p>
              )}
            </div>
          )}

          {/* Diesel Tab */}
          {activeTab === 'diesel' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Diesel Consumption</h3>
              {trip.diesel && trip.diesel.stations && trip.diesel.stations.length > 0 ? (
                <div className="space-y-3">
                  {trip.diesel.stations.map((station, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{station.name}</h4>
                          <p className="text-sm text-gray-600">Receipt: {station.receipt}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">₹{station.amount?.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{station.volume}L @ ₹{station.rate}</p>
                          {/* Edit button for completed trips - Admin/Superadmin only */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <button
                              onClick={() => {
                                setDieselData({
                                  stationName: station.name || '',
                                  volume: station.volume || 0,
                                  rate: station.rate || 0,
                                  amount: station.amount || 0,
                                  date: station.timestamp ? new Date(station.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                                });
                                setEditingDieselIndex(index);
                                setShowDieselModal(true);
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₹{trip.diesel.totalAmount?.toLocaleString()} ({trip.diesel.totalVolume}L)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No diesel records yet.</p>
              )}
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>
              
              {/* Stock Summary */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">Total Stock Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-blue-600">Total Birds in Stock</div>
                    <div className="font-medium text-blue-800">{trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Stock Weight</div>
                    <div className="font-medium text-blue-800">{trip.stocks?.reduce((sum, stock) => sum + (stock.weight || 0), 0).toFixed(2) || '0.00'} kg</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Stock Value</div>
                    <div className="font-medium text-blue-800">₹{trip.stocks?.reduce((sum, stock) => sum + (stock.value || 0), 0).toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Stock Entries</div>
                    <div className="font-medium text-blue-800">{trip.stocks?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Stock Entries List */}
              {trip.stocks && trip.stocks.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Stock Entries</h4>
                  {trip.stocks.map((stock, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">Stock Entry #{index + 1}</h5>
                          <p className="text-sm text-gray-500">
                            Added: {new Date(stock.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Edit button for completed trips - Admin/Superadmin only */}
                        {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                          <button
                            onClick={() => {
                              setStockData({
                                birds: stock.birds || 0,
                                weight: stock.weight || 0,
                                avgWeight: stock.avgWeight || 0,
                                rate: stock.rate || 0,
                                value: stock.value || 0,
                                notes: stock.notes || ''
                              });
                              setEditingStockIndex(index);
                              setShowStockModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Edit size={12} />
                            Edit
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Birds:</span>
                          <span className="font-medium ml-2">{stock.birds}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium ml-2">{stock.weight.toFixed(2)} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rate:</span>
                          <span className="font-medium ml-2">₹{stock.rate.toFixed(2)}/kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Value:</span>
                          <span className="font-medium ml-2">₹{stock.value.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {stock.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-gray-600 text-sm">Notes:</span>
                          <p className="text-sm text-gray-800 mt-1">{stock.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                  <p className="text-gray-500">No stock entries found</p>
                  <p className="text-sm text-gray-400 mt-1">Stock entries will appear here when added to the trip</p>
                </div>
              )}

              {/* Remaining Birds Calculation */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-3">Birds Remaining Calculation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Birds Purchased:</span>
                    <span className="font-medium">{trip.summary?.totalBirdsPurchased || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Birds Sold:</span>
                    <span className="font-medium">{trip.summary?.totalBirdsSold || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Birds in Stock:</span>
                    <span className="font-medium">{trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Death Birds:</span>
                    <span className="font-medium">{trip.summary?.mortality || 0}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-medium">Remaining Birds:</span>
                    <span className="font-medium text-green-600">{trip.summary?.birdsRemaining || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Losses Tab */}
          {activeTab === 'losses' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Death Birds & Losses</h3>
              {trip.losses && trip.losses.length > 0 ? (
                <div className="space-y-3">
                  {trip.losses.map((loss, index) => (
                    <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-red-900">Death Record #{index + 1}</h4>
                          <p className="text-sm text-red-700">Reason: {loss.reason || 'Not specified'}</p>
                          <p className="text-sm text-red-700">
                            Birds: {loss.quantity} | Weight: {loss.weight}kg | Avg: {loss.avgWeight}kg | Rate: ₹{loss.rate}
                          </p>
                          <p className="text-sm text-red-600">
                            Date: {new Date(loss.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">₹{loss.total?.toFixed(2)}</p>
                          <p className="text-sm text-red-500">Loss Amount</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Losses Summary */}
                  <div className="p-4 bg-red-100 rounded-lg border border-red-300">
                    <h4 className="font-medium text-red-900 mb-3">Losses Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{trip.summary?.totalBirdsLost || 0}</div>
                        <div className="text-red-700">Total Birds Lost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{(trip.summary?.totalWeightLost || 0).toFixed(2)} kg</div>
                        <div className="text-red-700">Total Weight Lost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">₹{(trip.summary?.totalLosses || 0).toFixed(2)}</div>
                        <div className="text-red-700">Total Loss Amount</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No death birds recorded yet.</p>
                  <p className="text-sm text-gray-400">Losses will appear here when death birds are added to the trip.</p>
                </div>
              )}
            </div>
          )}

          {/* Financials Tab */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Financial Analysis</h3>
              
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-3">Revenue Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium">₹{(trip.summary?.totalSalesAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchase:</span>
                      <span className="font-medium">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Profit:</span>
                      <span className="font-medium text-green-600">₹{(trip.summary?.totalProfitMargin || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className="font-medium">
                        {trip.summary?.totalSalesAmount > 0 
                          ? ((trip.summary?.totalProfitMargin / trip.summary?.totalSalesAmount) * 100).toFixed(2)
                          : '0.00'}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-3">Cost Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchases:</span>
                      <span className="font-medium">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses:</span>
                      <span className="font-medium">₹{(trip.summary?.totalExpenses || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Diesel Cost:</span>
                      <span className="font-medium">₹{(trip.summary?.totalDieselAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mortality & Weight Loss :</span>
                      <span className="font-medium">₹{(trip.summary?.totalLosses || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Profit Analysis */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">Net Profit Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{trip.status === 'completed' ? (trip.summary?.netProfit || 0).toFixed(2) : '0.00'}
                    </div>
                    <div className="text-blue-700">Net Profit</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {trip.summary?.totalWeightSold > 0 
                        ? (trip.summary?.profitPerKg || 0).toFixed(2)
                        : '0.00'}
                    </div>
                    <div className="text-blue-700">Profit per Kg</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {trip.summary?.totalSalesAmount > 0 
                        ? ((trip.summary?.netProfit / trip.summary?.totalSalesAmount) * 100).toFixed(2)
                        : '0.00'}%
                    </div>
                    <div className="text-blue-700">Net Profit Margin</div>
                  </div>
                </div>
              </div>

              {/* Trip Status Impact */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Trip Status Impact</h4>
                <div className="text-sm text-gray-600">
                  {trip.status === 'completed' ? (
                    <p>✅ <strong>Completed Trip:</strong> All financial calculations are final and include complete data.</p>
                  ) : (
                    <p>⚠️ <strong>Ongoing Trip:</strong> Net profit shows 0.00 as the trip is still in progress. Final calculations will be available upon completion.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPurchaseIndex !== null ? 'Edit Purchase' : 'Add Purchase'}
            </h3>
            <form onSubmit={editingPurchaseIndex !== null ? handleEditPurchase : addPurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={purchaseData.supplier}
                  onChange={(e) => setPurchaseData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a supplier</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id || vendor.id} value={vendor._id || vendor.id}>
                      {vendor.vendorName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DC Number</label>
                <input
                  type="text"
                  value={purchaseData.dcNumber}
                  onChange={(e) => setPurchaseData(prev => ({ ...prev, dcNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DC number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birds</label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseData.birds}
                    onChange={(e) => {
                      const birds = Number(e.target.value);
                      const avgWeight = birds > 0 && purchaseData.weight > 0 ? purchaseData.weight / birds : 0;
                      const amount = purchaseData.weight * purchaseData.rate;
                      setPurchaseData(prev => ({ 
                        ...prev, 
                        birds, 
                        avgWeight: Number(avgWeight.toFixed(2)),
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of birds"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseData.weight}
                    onChange={(e) => {
                      const weight = Number(e.target.value);
                      const avgWeight = purchaseData.birds > 0 && weight > 0 ? weight / purchaseData.birds : 0;
                      const amount = weight * purchaseData.rate;
                      setPurchaseData(prev => ({ 
                        ...prev, 
                        weight, 
                        avgWeight: Number(avgWeight.toFixed(2)),
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Weight in kg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseData.rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      const amount = purchaseData.weight * rate;
                      setPurchaseData(prev => ({ 
                        ...prev, 
                        rate, 
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rate per kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseData.amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Weight per Bird</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseData.avgWeight}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setEditingPurchaseIndex(null);
                    setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingPurchaseIndex !== null ? 'Update Purchase' : 'Add Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingSaleIndex !== null ? 'Edit Sale' : 'Add Sale'}
            </h3>
            <form onSubmit={editingSaleIndex !== null ? handleEditSale : addSale} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={saleData.client}
                  onChange={(e) => setSaleData(prev => ({ ...prev, client: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a client</option>
                  {customers.map((customer) => (
                    <option key={customer._id || customer.id} value={customer._id || customer.id}>
                      {customer.shopName} - {customer.ownerName || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={saleData.billNumber}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  placeholder="System generated"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birds</label>
                  <input
                    type="number"
                    min="0"
                    value={saleData.birds}
                    onChange={(e) => {
                      const birds = Number(e.target.value);
                      const avgWeight = birds > 0 && saleData.weight > 0 ? saleData.weight / birds : 0;
                      const amount = saleData.weight * saleData.rate;
                      setSaleData(prev => ({ 
                        ...prev, 
                        birds, 
                        avgWeight: Number(avgWeight.toFixed(2)),
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of birds"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleData.weight}
                    onChange={(e) => {
                      const weight = Number(e.target.value);
                      const avgWeight = saleData.birds > 0 && weight > 0 ? weight / saleData.birds : 0;
                      const amount = weight * saleData.rate;
                      setSaleData(prev => ({ 
                        ...prev, 
                        weight, 
                        avgWeight: Number(avgWeight.toFixed(2)),
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Weight in kg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleData.rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      const amount = saleData.weight * rate;
                      setSaleData(prev => ({ 
                        ...prev, 
                        rate, 
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rate per kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleData.amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Weight per Bird</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saleData.avgWeight}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    setEditingSaleIndex(null);
                    setSaleData({ client: '', billNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, /* paymentMode: 'cash', paymentStatus: 'pending', */ receivedAmount: 0, discount: 0, balance: 0, cashPaid: 0, onlinePaid: 0 });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSaleIndex !== null ? 'Update Sale' : 'Add Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingExpenseIndex !== null ? 'Edit Expense' : 'Add Expense'}
            </h3>
            <form onSubmit={editingExpenseIndex !== null ? handleEditExpense : addExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="meals">Meals</option>
                  <option value="parking">Parking</option>
                  <option value="toll">Toll</option>
                  <option value="loading/unloading">Loading/Unloading Charges</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="tea">Tea</option>
                  <option value="lunch">Lunch</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Expense description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={expenseData.date}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseModal(false);
                    setEditingExpenseIndex(null);
                    setExpenseData({ category: 'meals', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  {editingExpenseIndex !== null ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Diesel Modal */}
      {showDieselModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingDieselIndex !== null ? 'Edit Diesel Record' : 'Add Diesel Record'}
            </h3>
            <form onSubmit={editingDieselIndex !== null ? handleEditDiesel : (e) => {
              e.preventDefault();
              addExpense(dieselData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
                <input
                  type="text"
                  value={dieselData.stationName}
                  onChange={(e) => setDieselData(prev => ({ ...prev, stationName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Fuel station name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (L)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dieselData.volume}
                    onChange={(e) => {
                      const volume = Number(e.target.value);
                      const amount = volume * dieselData.rate;
                      setDieselData(prev => ({ 
                        ...prev, 
                        volume, 
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Volume in liters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per L</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dieselData.rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      const amount = dieselData.volume * rate;
                      setDieselData(prev => ({ 
                        ...prev, 
                        rate, 
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rate per liter"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dieselData.amount}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  placeholder="Auto-calculated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={dieselData.date}
                  onChange={(e) => setDieselData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDieselModal(false);
                    setEditingDieselIndex(null);
                    setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingDieselIndex !== null ? 'Update Diesel Record' : 'Add Diesel Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingStockIndex !== null ? 'Edit Stock' : 'Add Stock'}
            </h3>
            <form onSubmit={editingStockIndex !== null ? handleEditStock : (e) => {
              e.preventDefault();
              // Add stock functionality would go here
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birds</label>
                  <input
                    type="number"
                    min="0"
                    value={stockData.birds}
                    onChange={(e) => setStockData(prev => ({ ...prev, birds: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of birds"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockData.weight}
                    onChange={(e) => setStockData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Weight in kg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockData.rate}
                  onChange={(e) => setStockData(prev => ({ ...prev, rate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rate per kg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={stockData.notes}
                  onChange={(e) => setStockData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Stock notes"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStockModal(false);
                    setEditingStockIndex(null);
                    setStockData({ birds: 0, weight: 0, avgWeight: 0, rate: 0, value: 0, notes: '' });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  {editingStockIndex !== null ? 'Update Stock' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Complete Trip</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              completeTrip(completeData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closing Odometer
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min={trip?.vehicleReadings?.opening || 0}
                  value={completeData.closingOdometer}
                  onChange={(e) => setCompleteData(prev => ({ ...prev, closingOdometer: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Min: ${trip?.vehicleReadings?.opening || 0}`}
                  required
                />
                {trip?.vehicleReadings?.opening && (
                  <p className="text-xs text-gray-500 mt-1">
                    Opening reading: {trip.vehicleReadings.opening}
                  </p>
                )}
                {completeData.closingOdometer > 0 && trip?.vehicleReadings?.opening && 
                 completeData.closingOdometer < trip.vehicleReadings.opening && (
                  <p className="text-xs text-red-500 mt-1">
                    Closing reading must be greater than opening reading ({trip.vehicleReadings.opening})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Remarks</label>
                <textarea
                  value={completeData.finalRemarks}
                  onChange={(e) => setCompleteData(prev => ({ ...prev, finalRemarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any final notes about the trip..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mortality (Death Birds)</label>
                <input
                  type="number"
                  min="0"
                  value={completeData.mortality}
                  onChange={(e) => setCompleteData(prev => ({ ...prev, mortality: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Number of birds that died"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeData.closingOdometer > 0 && trip?.vehicleReadings?.opening && 
                           completeData.closingOdometer < trip.vehicleReadings.opening}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Complete Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      <EditTripModal
        isOpen={showEditTripModal}
        onClose={() => setShowEditTripModal(false)}
        trip={trip}
        onSuccess={() => {
          fetchTrip(); // Refresh trip data
        }}
      />
    </div>
  );
}
