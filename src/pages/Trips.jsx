// src/pages/Trips.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Loader2,
  X,
  Users,
  Fuel,
  Receipt,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { downloadTripsExcel } from '../utils/downloadTripsExcel';

// Zod Schema for Trip validation - will be updated dynamically based on user role
const createTripSchema = (userRole) => z.object({
  place: z.string().optional(), // Now optional - general reference
  vehicle: z.string().min(1, 'Vehicle is required'),
  supervisor: userRole === 'admin' || userRole === 'superadmin'
    ? z.string().min(1, 'Supervisor is required')
    : z.string().optional(),
  driver: z.string()
    .min(2, 'Driver name must be at least 2 characters')
    .max(50, 'Driver name cannot exceed 50 characters'),
  labour: z.string().optional(),
  route: z.object({
    from: z.string().min(2, 'Start location is required'),
    to: z.string().min(2, 'End location is required'),
    distance: z.number().optional()
  }),
  vehicleReadings: z.object({
    opening: z.number().min(0, 'Opening reading must be positive')
  })
});

const getStatusColor = (status) => {
  const colors = {
    completed: 'bg-green-100 text-green-800',
    ongoing: 'bg-blue-100 text-blue-800',
    started: 'bg-yellow-100 text-yellow-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusText = (status) => {
  const texts = {
    completed: 'Completed',
    ongoing: 'In Progress',
    started: 'Started'
  };
  return texts[status] || status;
};

const formatDateDisplay = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toFixed(decimals);
};

const getProductName = (trip) => {
  const vendorSet = new Set();

  // Extract vendors from a list of purchases
  const collectVendors = (purchases = []) => {
    purchases.forEach((purchase) => {
      const vendorName =
        purchase?.supplier?.vendorName ||
        purchase?.vendorName ||
        purchase?.supplierName ||
        '';

      if (vendorName?.trim()) {
        vendorSet.add(vendorName.trim());
      }
    });
  };

  // Extract vendors from purchaseVendors array if exists
  const collectVendorNames = (vendorNames = []) => {
    vendorNames.forEach((name) => {
      if (name?.trim()) vendorSet.add(name.trim());
    });
  };

  // 🔥 Recursive function to find all vendors from nested transferred trips
  const resolveTripVendors = (currentTrip) => {
    if (!currentTrip) return;

    // 1. Collect vendors from purchases
    collectVendors(currentTrip?.purchases);
    collectVendors(currentTrip?.originalPurchases);

    // 2. Collect vendor list (if any)
    if (Array.isArray(currentTrip?.purchaseVendors)) {
      collectVendorNames(currentTrip.purchaseVendors);
    }

    // 3. If still no vendors found & trip is transferred → go deeper
    if (
      vendorSet.size === 0 &&
      currentTrip?.type === "transferred" &&
      currentTrip?.transferredFrom
    ) {
      resolveTripVendors(currentTrip.transferredFrom);
    }
  };

  // Start with initial trip
  resolveTripVendors(trip);

  // Final result
  if (vendorSet.size === 0) {
    return "N/A";
  }

  return Array.from(vendorSet).join(", ");
};


const getVehicleMiscExpenses = (trip) => {
  if (!trip?.expenses?.length) return null;
  return trip.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
};

const getColumnValue = (value, formatter = (val) => val ?? '-') => formatter(value);

const REPORT_COLUMNS = [
  {
    key: 'deliveryDate',
    label: 'Delivery Date',
    locked: true,
    defaultSelected: true,
    render: (trip) => formatDateDisplay(trip?.date)
  },
  {
    key: 'vehicleNo',
    label: 'Vehicle No',
    locked: true,
    defaultSelected: true,
    render: (trip) => trip?.vehicle?.vehicleNumber || 'N/A'
  },
  {
    key: 'driverName',
    label: 'Driver Name',
    locked: true,
    defaultSelected: true,
    render: (trip) => trip?.driver || 'N/A'
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    locked: true,
    defaultSelected: true,
    render: (trip) => trip?.supervisor?.name || 'N/A'
  },
  {
    key: 'productName',
    label: 'Products',
    locked: true,
    defaultSelected: true,
    render: (trip) => getProductName(trip)
  },
  {
    key: 'profitAmount',
    label: 'Profit',
    locked: true,
    defaultSelected: true,
    render: (trip) => formatCurrency(trip?.summary?.netProfit)
  },
  {
    key: 'rentAmount',
    label: 'Rent',
    locked: true,
    defaultSelected: true,
    render: (trip) => formatCurrency(trip?.summary?.grossRent)
  },
  {
    key: 'margin',
    label: 'Margin',
    locked: true,
    defaultSelected: true,
    render: (trip) => formatNumber(trip?.summary?.profitPerKg ?? trip?.summary?.margin ?? null, 1)
  },
  {
    key: 'route',
    label: 'Route',
    locked: true,
    defaultSelected: true,
    render: (trip) => {
      const from = trip?.route?.from || 'N/A';
      const to = trip?.route?.to || 'N/A';
      return `${from} → ${to}`;
    }
  },
  {
    key: 'liftingDate',
    label: 'Lifting Date',
    render: (trip) => formatDateDisplay(trip?.liftingDate || trip?.createdAt)
  },
  {
    key: 'startEndPoint',
    label: 'Start & End Point',
    render: (trip) => {
      const from = trip?.route?.from || 'N/A';
      const to = trip?.route?.to || 'N/A';
      return `${from} → ${to}`;
    }
  },
  {
    key: 'birdsTotal',
    label: 'No of Birds (Total)',
    render: (trip) => getColumnValue(trip?.summary?.totalBirdsPurchased, (val) => val?.toLocaleString('en-IN') || '-')
  },
  {
    key: 'quantityWeight',
    label: 'Quantity (Weight)',
    render: (trip) => getColumnValue(trip?.summary?.totalWeightPurchased, (val) => `${formatNumber(val, 2)} kg`)
  },
  {
    key: 'birdsAverage',
    label: 'Birds Average',
    render: (trip) => {
      if (!trip?.summary?.totalBirdsPurchased || !trip?.summary?.totalWeightPurchased) return '-';
      const avg = trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased;
      return formatNumber(avg, 2);
    }
  },
  {
    key: 'rate',
    label: 'Rate',
    render: (trip) => formatCurrency(trip?.summary?.avgPurchaseRate)
  },
  {
    key: 'purchaseAmount',
    label: 'Purchase Amount',
    render: (trip) => formatCurrency(trip?.summary?.totalPurchaseAmount)
  },
  {
    key: 'receivableAmount',
    label: 'Receivable Amount',
    render: (trip) => formatCurrency(trip?.summary?.totalReceivedAmount)
  },
  {
    key: 'cashReceiptAmount',
    label: 'Cash Receipt Amount',
    render: (trip) => formatCurrency(trip?.summary?.totalCashPaid)
  },
  {
    key: 'bankReceiptAmount',
    label: 'Bank Receipt Amount',
    render: (trip) => formatCurrency(trip?.summary?.totalOnlinePaid)
  },
  {
    key: 'noDeathBirds',
    label: 'No Death Birds',
    render: (trip) => getColumnValue(trip?.summary?.totalBirdsLost, (val) => val?.toLocaleString('en-IN') || '-')
  },
  {
    key: 'amountDeathBirds',
    label: 'Amount of Death Birds',
    render: (trip) => formatCurrency(trip?.summary?.totalLosses)
  },
  {
    key: 'weightLossQty',
    label: 'Weight Loss Qty',
    render: (trip) => getColumnValue(trip?.summary?.birdWeightLoss, (val) => `${formatNumber(val, 2)} kg`)
  },
  {
    key: 'weightLossAmount',
    label: 'Weight Loss Amount',
    render: (trip) => {
      const lossQty = trip?.summary?.birdWeightLoss || 0;
      const rate = trip?.summary?.avgPurchaseRate || 0;
      const amount = lossQty * rate;
      return amount ? formatCurrency(amount) : '-';
    }
  },
  {
    key: 'vehicleMiscAmount',
    label: 'Vehicle Misc Amount',
    render: (trip) => {
      const misc = getVehicleMiscExpenses(trip);
      return misc ? formatCurrency(misc) : '-';
    }
  },
  {
    key: 'dieselAmount',
    label: 'Diesel Amount',
    render: (trip) => formatCurrency(trip?.diesel?.totalAmount)
  },
  {
    key: 'vehicleRunningKm',
    label: 'Vehicle Running KM',
    render: (trip) => getColumnValue(trip?.vehicleReadings?.totalDistance, (val) => `${formatNumber(val, 0)} km`)
  },
  {
    key: 'dieselVolume',
    label: 'Diesel Vol',
    render: (trip) => getColumnValue(trip?.diesel?.totalVolume, (val) => `${formatNumber(val, 2)} L`)
  },
  {
    key: 'vehicleAvg',
    label: 'Vehicle Avg',
    render: (trip) => getColumnValue(trip?.summary?.fuelEfficiency, (val) => `${formatNumber(val, 2)} km/L`)
  }
];

const DEFAULT_SELECTED_COLUMNS = REPORT_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.key);
const LOCKED_COLUMN_KEYS = new Set(REPORT_COLUMNS.filter((col) => col.locked).map((col) => col.key));

export default function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_SELECTED_COLUMNS);
  const [isReportFilterOpen, setIsReportFilterOpen] = useState(false);
  const reportFilterRef = useRef(null);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Date Filter Modal States
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [tempDateFilter, setTempDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const openDateFilterModal = () => {
    setTempDateFilter(dateFilter);
    setShowDateFilterModal(true);
  };

  const handleApplyDateFilter = () => {
    setDateFilter(tempDateFilter);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setShowDateFilterModal(false);
  };

  // Debug user information
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);

  // Check if user has access
  const hasAccess = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'supervisor';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperadmin = user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const canCreateTrip = user?.role === 'supervisor';

  // React Hook Form with Zod validation
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(createTripSchema(user?.role)),
    defaultValues: {
      place: '',
      vehicle: '',
      supervisor: user?.role === 'supervisor' ? user?.id : '',
      driver: '',
      labour: '',
      route: {
        from: '',
        to: '',
        distance: 0
      },
      vehicleReadings: {
        opening: 0
      }
    }
  });

  // Fetch trips with pagination and filters
  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching trips...');

      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(vehicleFilter && vehicleFilter !== 'all' && { vehicle: vehicleFilter }),
        ...(dateFilter.startDate && { startDate: dateFilter.startDate }),
        ...(dateFilter.endDate && { endDate: dateFilter.endDate })
      });

      const { data } = await api.get(`/trip?${params}`);

      // Handle response structure - backend returns trips and pagination at root level
      if (data.success) {
        const newTrips = data.trips || [];

        if (pagination.currentPage === 1) {
          setTrips(newTrips);
        } else {
          // Append new trips and avoid duplicates
          setTrips(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewTrips = newTrips.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNewTrips];
          });
        }

        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            totalPages: data.pagination.pages || 1,
            totalItems: data.pagination.total || 0,
            itemsPerPage: pagination.itemsPerPage
          }));
        }
      } else {
        // Fallback for different response structures
        const fallbackTrips = data.data?.trips || data.data || data.trips || [];
        if (pagination.currentPage === 1) {
          setTrips(fallbackTrips);
        } else {
          setTrips(prev => [...prev, ...fallbackTrips]);
        }
      }
      setIsError(false);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vehicles and supervisors for form
  const fetchFormData = async () => {
    try {
      if (isAdmin) {
        const [vehiclesRes, supervisorsRes] = await Promise.all([
          api.get('/vehicle'),
          api.get('/user?role=supervisor')
        ]);
        setVehicles(vehiclesRes.data.data || []);
        setSupervisors(supervisorsRes.data.data || []);
      } else if (isSupervisor) {
        const vehiclesRes = await api.get('/vehicle');
        setVehicles(vehiclesRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching form data:', err);
    }
  };

  useEffect(() => {
    fetchFormData();
  }, [user?.role]);

  // Fetch trips when pagination or filters change
  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, statusFilter, vehicleFilter, dateFilter.startDate, dateFilter.endDate, user?.role]);

  // Update form when user changes
  useEffect(() => {
    if (user?.role) {
      console.log('User role changed, updating form defaults');
      reset({
        place: '',
        vehicle: '',
        supervisor: user?.role === 'supervisor' ? user?.id : '',
        driver: '',
        labour: '',
        route: { from: '', to: '', distance: 0 },
        vehicleReadings: { opening: 0 }
      });
    }
  }, [user?.role, user?.id, reset]);

  // Infinite Scroll Observer
  const observer = useRef();
  const lastTripElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.currentPage < pagination.totalPages) {
        console.log('Loading more trips... Page:', pagination.currentPage + 1);
        setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, pagination.currentPage, pagination.totalPages]);

  useEffect(() => {
    if (!isReportFilterOpen) return;
    const handleClickOutside = (event) => {
      if (reportFilterRef.current && !reportFilterRef.current.contains(event.target)) {
        setIsReportFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isReportFilterOpen]);

  // Handle click outside for download dropdown
  useEffect(() => {
    if (!isDownloadDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setIsDownloadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDownloadDropdownOpen]);

  // CRUD operations
  const addTrip = async (tripData) => {
    try {
      setIsSubmitting(true);
      console.log('Adding trip:', tripData);
      console.log('Supervisor field value:', tripData.supervisor);
      console.log('Supervisor field type:', typeof tripData.supervisor);
      const { data } = await api.post('/trip', tripData);
      console.log('Add trip response:', data);
      setShowAddModal(false);
      setEditingTrip(null);
      reset();
      alert('Trip created successfully!');
      // Refetch trips to get updated list with pagination
      await fetchTrips();
    } catch (err) {
      console.error('Error adding trip:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTrip = async ({ id, ...tripData }) => {
    try {
      setIsSubmitting(true);
      console.log('Updating trip:', { id, ...tripData });
      const { data } = await api.put(`/trip/${id}`, tripData);
      console.log('Update trip response:', data);
      setShowAddModal(false);
      setEditingTrip(null);
      reset();
      alert('Trip updated successfully!');
      // Refetch trips to get updated list with pagination
      await fetchTrips();
    } catch (err) {
      console.error('Error updating trip:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTrip = async (id) => {
    try {
      console.log('Deleting trip:', id);
      await api.delete(`/trip/${id}`);
      console.log('Trip deleted successfully');
      alert('Trip deleted successfully!');
      // Refetch trips to get updated list with pagination
      await fetchTrips();
    } catch (err) {
      console.error('Error deleting trip:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = async (trip) => {
    setEditingTrip(trip);
    setValue('place', trip.place || '');
    setValue('vehicle', trip.vehicle?.id || trip.vehicle || '');
    setValue('supervisor', trip.supervisor?.id || trip.supervisor || '');
    setValue('driver', trip.driver || '');
    setValue('labour', trip.labour || '');
    setValue('route.from', trip.route?.from || '');
    setValue('route.to', trip.route?.to || '');
    setValue('route.distance', trip.route?.distance || 0);
    setValue('vehicleReadings.opening', trip.vehicleReadings?.opening || 0);
    setShowAddModal(true);
  };

  const handleDelete = async (trip) => {
    if (window.confirm(`Are you sure you want to delete trip ${trip.tripId}?`)) {
      await deleteTrip(trip.id);
    }
  };

  const handleView = async (trip) => {
    // Navigate to trip details page using React Router
    navigate(`/trips/${trip.id}`);
  };

  const onSubmit = (data) => {
    console.log('Form data being submitted:', data);

    // Ensure supervisor field is set for supervisors
    if (user?.role === 'supervisor') {
      data.supervisor = user.id;
    }

    // Ensure labour is a string (optional)
    data.labour = data.labour || '';

    console.log('Final form data after processing:', data);

    if (editingTrip) {
      updateTrip({ id: editingTrip.id, ...data });
    } else {
      addTrip(data);
    }
  };

  const handleAddNew = () => {
    setEditingTrip(null);
    const defaultValues = {
      place: '',
      vehicle: '',
      supervisor: user?.role === 'supervisor' ? user?.id : '',
      driver: '',
      labour: '',
      route: { from: '', to: '', distance: 0 },
      vehicleReadings: { opening: 0 }
    };
    console.log('Setting default values:', defaultValues);
    reset(defaultValues);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTrip(null);
    reset();
    setError('');
  };

  // Client-side search filter (only for search term, other filters are server-side)
  const filteredTrips = trips.filter(trip => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return trip.tripId?.toLowerCase().includes(searchLower) ||
      trip.vehicle?.vehicleNumber?.toLowerCase().includes(searchLower) ||
      trip.supervisor?.name?.toLowerCase().includes(searchLower) ||
      trip.driver?.toLowerCase().includes(searchLower);
  });

  // Reset to page 1 when filters change
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleVehicleFilterChange = (value) => {
    setVehicleFilter(value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleClearDateFilter = () => {
    setDateFilter({
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Fetch all trips for download (without pagination)
  const fetchAllTrips = async () => {
    try {
      // Build query parameters (same filters, but no pagination)
      const params = new URLSearchParams({
        page: 1,
        limit: 10000, // Large limit to get all records
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(vehicleFilter && vehicleFilter !== 'all' && { vehicle: vehicleFilter }),
        ...(dateFilter.startDate && { startDate: dateFilter.startDate }),
        ...(dateFilter.endDate && { endDate: dateFilter.endDate })
      });

      const { data } = await api.get(`/trip?${params}`);

      if (data.success && data.trips) {
        return data.trips;
      } else {
        return data.data?.trips || data.data || data.trips || [];
      }
    } catch (err) {
      console.error('Error fetching all trips:', err);
      throw err;
    }
  };

  // Download current page trips
  const handleDownloadCurrentPage = async () => {
    try {
      setIsDownloading(true);
      setIsDownloadDropdownOpen(false);

      // Use currently displayed trips (already filtered by search)
      const tripsToDownload = filteredTrips.length > 0 ? filteredTrips : trips;

      // Get active columns (selected columns)
      const columnsToExport = REPORT_COLUMNS.filter(col => selectedColumns.includes(col.key));

      if (tripsToDownload.length === 0) {
        alert('No trips available to download');
        return;
      }

      if (columnsToExport.length === 0) {
        alert('No columns selected for export');
        return;
      }

      downloadTripsExcel(tripsToDownload, columnsToExport, 'trips_current_page');
    } catch (err) {
      console.error('Error downloading trips:', err);
      alert('Error downloading trips. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download all trips
  const handleDownloadAllRecords = async () => {
    try {
      setIsDownloading(true);
      setIsDownloadDropdownOpen(false);

      // Fetch all trips with current filters
      const allTrips = await fetchAllTrips();

      if (allTrips.length === 0) {
        alert('No trips available to download');
        return;
      }

      // Apply client-side search filter if search term exists
      const filteredAllTrips = searchTerm
        ? allTrips.filter(trip => {
          const searchLower = searchTerm.toLowerCase();
          return trip.tripId?.toLowerCase().includes(searchLower) ||
            trip.vehicle?.vehicleNumber?.toLowerCase().includes(searchLower) ||
            trip.supervisor?.name?.toLowerCase().includes(searchLower) ||
            trip.driver?.toLowerCase().includes(searchLower);
        })
        : allTrips;

      // Get active columns (selected columns)
      const columnsToExport = REPORT_COLUMNS.filter(col => selectedColumns.includes(col.key));

      if (columnsToExport.length === 0) {
        alert('No columns selected for export');
        return;
      }

      downloadTripsExcel(filteredAllTrips, columnsToExport, 'trips_all_records');
    } catch (err) {
      console.error('Error downloading all trips:', err);
      alert('Error downloading trips. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isDateFilterActive = dateFilter.startDate || dateFilter.endDate;
  const activeColumns = REPORT_COLUMNS.filter((column) => selectedColumns.includes(column.key));

  const toggleColumnSelection = (key) => {
    if (LOCKED_COLUMN_KEYS.has(key)) {
      return;
    }
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((colKey) => colKey !== key) : [...prev, key]
    );
  };

  // Only show full page loader on initial load with no data
  if (isLoading && trips.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchTrips}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          {user?.role === 'customer'
            ? 'Customers cannot access trip information.'
            : 'You need appropriate privileges to access the Trips Management page.'
          }
        </p>
        <p className="text-sm text-gray-500">
          Current role: {user?.role || 'Not logged in'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trips Management</h1>
          <p className="text-gray-600 mt-1">
            {isSupervisor
              ? 'Create and manage your poultry transportation trips'
              : 'View and track all poultry transportation trips (read-only access)'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          {/* Download Button with Dropdown */}
          <div className="relative" ref={downloadDropdownRef}>
            <button
              onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
              disabled={isDownloading || trips.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download Report
                </>
              )}
              <ChevronDown size={16} />
            </button>

            {isDownloadDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={handleDownloadCurrentPage}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Download Current Page ({filteredTrips.length} records)
                </button>
                <button
                  onClick={handleDownloadAllRecords}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                >
                  <Download size={16} />
                  Download All Records
                </button>
              </div>
            )}
          </div>

          {/* New Trip Button */}
          {canCreateTrip && (
            <button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              New Trip
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search trips by ID, vehicle, or supervisor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="started">Started</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={vehicleFilter}
                onChange={(e) => handleVehicleFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNumber}
                  </option>
                ))}
              </select>
              <div className="relative" ref={reportFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsReportFilterOpen((prev) => !prev)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${isReportFilterOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                >
                  <Filter size={16} />
                  <span>Reports Filter</span>
                  {isReportFilterOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {isReportFilterOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                      <h3 className="text-sm font-semibold">Choose Columns to Display</h3>
                      <p className="text-xs text-blue-100 mt-1">
                        Yellow highlighted items are default and cannot be deselected
                      </p>
                    </div>
                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {REPORT_COLUMNS.map((option) => {
                        const isChecked = selectedColumns.includes(option.key);
                        return (
                          <label
                            key={option.key}
                            className={`flex items-center justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${option.locked
                              ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
                              : 'hover:bg-gray-50 border-l-4 border-transparent'
                              }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={option.locked}
                                onChange={() => toggleColumnSelection(option.key)}
                                className={`h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 ${option.locked
                                  ? 'text-yellow-600 cursor-not-allowed'
                                  : 'text-blue-600 cursor-pointer'
                                  }`}
                              />
                              <span className={`flex-1 ${option.locked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                {option.label}
                              </span>
                            </div>
                            {option.locked && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                                Default
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {selectedColumns.length} of {REPORT_COLUMNS.length} columns selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsReportFilterOpen(false)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date Filter */}
          {/* Date Filter & Active Filters Display */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={openDateFilterModal}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                title="Filter by Date Range"
              >
                <Calendar size={18} />
                <span>
                  {isDateFilterActive
                    ? `${formatDateDisplay(dateFilter.startDate)} - ${formatDateDisplay(dateFilter.endDate)}`
                    : 'Filter by Date'}
                </span>
              </button>

              {isDateFilterActive && (
                <button
                  onClick={handleClearDateFilter}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <X size={16} />
                  Clear
                </button>
              )}
            </div>

            {isDateFilterActive && (
              <div className="px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                Showing: {pagination.totalItems} trips
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto relative">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Fixed SL NO Column */}
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r-2 border-gray-300">
                SL NO
              </th>
              {/* Scrollable Columns */}
              {activeColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {/* Fixed STATUS Column */}
              <th className="sticky right-[130px] z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-l-2 border-gray-300" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>
                STATUS
              </th>
              {/* Fixed ACTIONS Column */}
              <th className="sticky right-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-gray-300" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + 3} className="px-6 py-10 text-center text-gray-500">
                  No trips found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredTrips.map((trip, index) => {
                const isLastElement = index === filteredTrips.length - 1;
                return (
                  <tr
                    key={trip.id}
                    className="group"
                    ref={isLastElement ? lastTripElementRef : null}
                  >
                    {/* Fixed SL NO Column */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-4 py-4 text-sm text-gray-900 border-r-2 border-gray-300 transition-colors">
                      {index + 1}
                    </td>
                    {/* Scrollable Columns */}
                    {activeColumns.map((column) => (
                      <td key={column.key} className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap group-hover:bg-gray-50 transition-colors">
                        {column.render(trip, index)}
                      </td>
                    ))}
                    {/* Fixed STATUS Column */}
                    <td className="sticky right-[130px] z-10 bg-white group-hover:bg-gray-50 px-4 py-4 border-l-2  border-gray-300 transition-colors" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                        {getStatusText(trip.status)}
                      </span>
                    </td>
                    {/* Fixed ACTIONS Column */}
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50 px-4 py-4 border-gray-300 transition-colors" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(trip)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View trip details"
                        >
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleEdit(trip)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit trip (Admin only)"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {isSuperadmin && (
                          <button
                            onClick={() => handleDelete(trip)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete trip (Superadmin only)"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Loading Indicator for Infinite Scroll */}
      {isLoading && trips.length > 0 && (
        <div className="py-4 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-sm">Loading more trips...</span>
        </div>
      )}

      {/* End of List Indicator */}
      {!isLoading && trips.length > 0 && pagination.currentPage >= pagination.totalPages && (
        <div className="py-8 text-center text-gray-500 text-sm">
          No more trips to load
        </div>
      )}

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Trips</div>
          <div className="text-2xl font-bold text-gray-900">{filteredTrips.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">
            ₹{filteredTrips.reduce((sum, trip) => sum + (trip.summary?.totalSalesAmount || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Profit</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹{filteredTrips.reduce((sum, trip) => sum + (trip.summary?.netProfit || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Birds Sold</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredTrips.reduce((sum, trip) => sum + (trip.summary?.totalBirdsSold || 0), 0).toLocaleString()}
          </div>
        </div>
      </div> */}

      {/* Trip Form Modal */}
      {/* Date Filter Modal */}
      {showDateFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
                Select Date Range
              </h2>
              <button
                onClick={() => setShowDateFilterModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={tempDateFilter.startDate}
                  onChange={(e) => setTempDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={tempDateFilter.endDate}
                  onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDateFilterModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDateFilter}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTrip ? 'Edit Trip' : 'Create New Trip'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Location *
                  </label>
                  <input
                    type="text"
                    {...register('route.from')}
                    placeholder="e.g., SNK, Hyderabad, Main Office"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.route?.from && <p className="text-red-500 text-xs mt-1">{errors.route.from.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Location *
                  </label>
                  <input
                    type="text"
                    {...register('route.to')}
                    placeholder="e.g., SNK, Hyderabad, Main Office"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.route?.to && <p className="text-red-500 text-xs mt-1">{errors.route.to.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area/Region (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('place')}
                    placeholder="e.g., SNK Area, North Zone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.place && <p className="text-red-500 text-xs mt-1">{errors.place.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle *
                  </label>
                  <select
                    {...register('vehicle')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNumber} - {vehicle.type}
                      </option>
                    ))}
                  </select>
                  {errors.vehicle && <p className="text-red-500 text-xs mt-1">{errors.vehicle.message}</p>}
                </div>

                {/* Always include supervisor field but hide for supervisors */}
                <div className={isAdmin ? '' : 'hidden'}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supervisor *
                  </label>
                  <select
                    {...register('supervisor')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) => console.log('Supervisor selected:', e.target.value)}
                  >
                    <option value="">Select Supervisor</option>
                    {supervisors.map(supervisor => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </option>
                    ))}
                  </select>
                  {errors.supervisor && <p className="text-red-500 text-xs mt-1">{errors.supervisor.message}</p>}
                </div>

                {/* Hidden supervisor field for supervisors */}
                {user?.role === 'supervisor' && (
                  <input
                    type="hidden"
                    {...register('supervisor')}
                    value={user?.id}
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    {...register('driver')}
                    placeholder="e.g., ALLABAKSH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.driver && <p className="text-red-500 text-xs mt-1">{errors.driver.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Odometer *
                  </label>
                  <input
                    type="number"
                    {...register('vehicleReadings.opening', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.vehicleReadings?.opening && <p className="text-red-500 text-xs mt-1">{errors.vehicleReadings.opening.message}</p>}
                </div>
              </div>

              {/* Labour Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Labour Worker (Optional)
                </label>
                <input
                  type="text"
                  {...register('labour')}
                  placeholder="Enter labour worker name (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.labour && <p className="text-red-500 text-xs mt-1">{errors.labour.message}</p>}
              </div>

              {/* Distance (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Distance (km) - Optional
                  </label>
                  <input
                    type="number"
                    {...register('route.distance', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Estimated trip distance if known</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTrip ? 'Update Trip' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}