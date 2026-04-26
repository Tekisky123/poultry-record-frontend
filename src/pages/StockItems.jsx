import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Package, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function StockItems() {
    const [stocks, setStocks] = useState({ bird: null, feed: null });
    const [loading, setLoading] = useState(true);
    const [showBirdModal, setShowBirdModal] = useState(false);
    const [showFeedModal, setShowFeedModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const defaultDate = new Date().toISOString().split('T')[0];
    const [birdData, setBirdData] = useState({ birds: '', weight: '', rate: '', date: defaultDate });
    const [feedData, setFeedData] = useState({ weight: '', rate: '', date: defaultDate });

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        setLoading(true);
        try {
            const [birdRes, feedRes] = await Promise.all([
                api.get('/inventory-stock', { params: { inventoryType: 'bird', type: 'opening' } }),
                api.get('/inventory-stock', { params: { inventoryType: 'feed', type: 'opening' } })
            ]);
            setStocks({
                bird: birdRes.data.success && birdRes.data.data.length > 0 ? birdRes.data.data.sort((a,b) => new Date(a.date) - new Date(b.date))[0] : null,
                feed: feedRes.data.success && feedRes.data.data.length > 0 ? feedRes.data.data.sort((a,b) => new Date(a.date) - new Date(b.date))[0] : null
            });
        } catch (error) {
            console.error("Error fetching opening stocks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBirdSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && stocks.bird?._id) {
                await api.put(`/inventory-stock/${stocks.bird._id}`, {
                    ...birdData,
                    type: 'opening',
                    inventoryType: 'bird',
                    amount: Number(birdData.weight) * Number(birdData.rate)
                });
                alert("Birds Opening Stock updated successfully!");
            } else {
                await api.post('/inventory-stock/purchase', {
                    ...birdData,
                    type: 'opening',
                    inventoryType: 'bird',
                    amount: Number(birdData.weight) * Number(birdData.rate)
                });
                alert("Birds Opening Stock added successfully!");
            }
            setShowBirdModal(false);
            setIsEditMode(false);
            fetchStocks();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save Birds Opening Stock");
        }
    };

    const handleFeedSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && stocks.feed?._id) {
                await api.put(`/inventory-stock/${stocks.feed._id}`, {
                    ...feedData,
                    type: 'opening',
                    inventoryType: 'feed',
                    amount: Number(feedData.weight) * Number(feedData.rate)
                });
                alert("Feed Opening Stock updated successfully!");
            } else {
                await api.post('/inventory-stock/purchase', {
                    ...feedData,
                    type: 'opening',
                    inventoryType: 'feed',
                    amount: Number(feedData.weight) * Number(feedData.rate)
                });
                alert("Feed Opening Stock added successfully!");
            }
            setShowFeedModal(false);
            setIsEditMode(false);
            fetchStocks();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save Feed Opening Stock");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this opening stock?")) return;
        try {
            await api.delete(`/inventory-stock/${id}`);
            alert("Deleted successfully!");
            fetchStocks();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete opening stock");
        }
    };

    const openBirdEdit = () => {
        setBirdData({
            birds: stocks.bird.birds || '',
            weight: stocks.bird.weight || '',
            rate: stocks.bird.rate || '',
            date: stocks.bird.date ? new Date(stocks.bird.date).toISOString().split('T')[0] : defaultDate
        });
        setIsEditMode(true);
        setShowBirdModal(true);
    };

    const openFeedEdit = () => {
        setFeedData({
            weight: stocks.feed.weight || '',
            rate: stocks.feed.rate || '',
            date: stocks.feed.date ? new Date(stocks.feed.date).toISOString().split('T')[0] : defaultDate
        });
        setIsEditMode(true);
        setShowFeedModal(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                        <Package className="w-8 h-8 text-orange-600" />
                        Stock Items (Opening Stocks)
                    </h1>
                    <p className="text-gray-500 mt-1">Manage opening balance for stock items</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setIsEditMode(false); setBirdData({birds: '', weight: '', rate: '', date: defaultDate}); setShowBirdModal(true); }} 
                        disabled={!!stocks.bird}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${stocks.bird ? 'bg-orange-300 text-white cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                    >
                        <Plus size={18} /> Add Birds Stock
                    </button>
                    <button 
                        onClick={() => { setIsEditMode(false); setFeedData({weight: '', rate: '', date: defaultDate}); setShowFeedModal(true); }} 
                        disabled={!!stocks.feed}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${stocks.feed ? 'bg-yellow-300 text-white cursor-not-allowed' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                    >
                        <Plus size={18} /> Add Feed Stock
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-200 text-sm font-semibold uppercase text-gray-700">
                        <tr>
                            <th className="p-4 border-r border-gray-200">Item Name</th>
                            <th className="p-4 border-r border-gray-200 text-right">No. of Birds</th>
                            <th className="p-4 border-r border-gray-200 text-right">Quantity (kg)</th>
                            <th className="p-4 border-r border-gray-200 text-right">Rate (₹)</th>
                            <th className="p-4 border-r border-gray-200 text-right">Amount (₹)</th>
                            <th className="p-4 border-r border-gray-200 text-center">Date</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {stocks.bird && (
                            <tr className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-900 border-r border-gray-200">Birds Opening Stock</td>
                                <td className="p-4 text-right border-r border-gray-200 text-blue-700 font-medium">{stocks.bird.birds ? stocks.bird.birds.toLocaleString('en-IN') : '-'}</td>
                                <td className="p-4 text-right border-r border-gray-200 text-orange-700 font-medium">{stocks.bird.weight?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-right border-r border-gray-200 text-gray-600">{stocks.bird.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-right border-r border-gray-200 text-gray-900 font-semibold">{stocks.bird.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-center border-r border-gray-200 text-gray-600">{new Date(stocks.bird.date).toLocaleDateString('en-GB')}</td>
                                <td className="p-4 flex justify-center gap-3">
                                    <button onClick={openBirdEdit} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(stocks.bird._id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        )}
                        {stocks.feed && (
                            <tr className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-900 border-r border-gray-200">Feed Opening Stock</td>
                                <td className="p-4 text-right border-r border-gray-200 text-gray-500 font-medium">-</td>
                                <td className="p-4 text-right border-r border-gray-200 text-yellow-700 font-medium">{stocks.feed.weight?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-right border-r border-gray-200 text-gray-600">{stocks.feed.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-right border-r border-gray-200 text-gray-900 font-semibold">{stocks.feed.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-center border-r border-gray-200 text-gray-600">{new Date(stocks.feed.date).toLocaleDateString('en-GB')}</td>
                                <td className="p-4 flex justify-center gap-3">
                                    <button onClick={openFeedEdit} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(stocks.feed._id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        )}
                        {!stocks.bird && !stocks.feed && (
                            <tr>
                                <td colSpan="7" className="p-6 text-center text-gray-500 italic">No opening stock added yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bird Modal */}
            {showBirdModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowBirdModal(false)} className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 rounded-full p-1 transition-colors"><X size={20}/></button>
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">{isEditMode ? 'Edit' : 'Add'} Birds Opening Stock</h2>
                        <form onSubmit={handleBirdSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" required value={birdData.date} onChange={e => setBirdData({...birdData, date: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">No. of Birds</label>
                                <input type="number" required value={birdData.birds} onChange={e => setBirdData({...birdData, birds: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                                <input type="number" step="any" required value={birdData.weight} onChange={e => setBirdData({...birdData, weight: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                                <input type="number" step="any" required value={birdData.rate} onChange={e => setBirdData({...birdData, rate: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500" />
                            </div>
                            <div className="bg-orange-50 p-4 rounded-md border border-orange-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-orange-800">Total Amount</span>
                                <span className="font-bold text-lg text-orange-900">₹ {((Number(birdData.weight) || 0) * (Number(birdData.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <button type="submit" className="w-full bg-orange-600 text-white rounded-md py-2.5 font-medium hover:bg-orange-700 transition-colors mt-2">{isEditMode ? 'Update' : 'Save'} Stock</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Feed Modal */}
            {showFeedModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowFeedModal(false)} className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 rounded-full p-1 transition-colors"><X size={20}/></button>
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">{isEditMode ? 'Edit' : 'Add'} Feed Opening Stock</h2>
                        <form onSubmit={handleFeedSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" required value={feedData.date} onChange={e => setFeedData({...feedData, date: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                                <input type="number" step="any" required value={feedData.weight} onChange={e => setFeedData({...feedData, weight: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                                <input type="number" step="any" required value={feedData.rate} onChange={e => setFeedData({...feedData, rate: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-yellow-800">Total Amount</span>
                                <span className="font-bold text-lg text-yellow-900">₹ {((Number(feedData.weight) || 0) * (Number(feedData.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <button type="submit" className="w-full bg-yellow-600 text-white rounded-md py-2.5 font-medium hover:bg-yellow-700 transition-colors mt-2">{isEditMode ? 'Update' : 'Save'} Stock</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
