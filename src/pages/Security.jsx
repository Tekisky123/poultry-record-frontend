import { useState } from 'react';
import { Database, Download, FileJson, FileSpreadsheet, FileText, Shield, FileCode, ChevronDown, Check } from 'lucide-react';
import api from '../lib/axios';

export default function Security() {
    const [downloading, setDownloading] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState('json');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const formats = [
        { id: 'json', name: 'JSON Format', description: 'Full Structure', icon: FileJson, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { id: 'csv', name: 'CSV Format', description: 'Spreadsheets', icon: FileText, color: 'text-green-600', bg: 'bg-green-100' },
        { id: 'excel', name: 'Excel Format', description: 'MS Excel', icon: FileSpreadsheet, color: 'text-emerald-700', bg: 'bg-emerald-100' },
        { id: 'bson', name: 'BSON Format', description: 'Binary JSON', icon: FileCode, color: 'text-purple-700', bg: 'bg-purple-100' },
    ];

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const response = await api.get(`/security/download-backup?format=${selectedFormat}`, {
                responseType: 'blob' // Important for handling binary data
            });

            // Create a URL for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from header or generate default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `db_backup_${new Date().toISOString().slice(0, 10)}.zip`;

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match) filename = match[1];
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download backup. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const selectedFormatData = formats.find(f => f.id === selectedFormat);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Security & Backup</h1>
                    <p className="text-gray-600">Manage system security and data backups</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gray-50/50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Database Backup</h2>
                    </div>
                </div>

                <div className="p-8">
                    <div className="max-w-xl mx-auto space-y-6">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-bold text-gray-900">Download Backup Archive</h3>
                            <p className="text-gray-500 mt-2">
                                Select your preferred format and download a secured ZIP archive of your entire database.
                            </p>
                        </div>

                        {/* Control Section */}
                        <div className="bg-gray-50 p-2 rounded-xl flex flex-col sm:flex-row gap-3 border border-gray-200 relative">
                            {/* Custom Dropdown */}
                            <div className="relative flex-1">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors shadow-sm"
                                    disabled={downloading}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md ${selectedFormatData.bg} ${selectedFormatData.color}`}>
                                            <selectedFormatData.icon size={20} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-900 text-sm">{selectedFormatData.name}</div>
                                            <div className="text-xs text-gray-500">{selectedFormatData.description}</div>
                                        </div>
                                    </div>
                                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        {formats.map((format) => (
                                            <button
                                                key={format.id}
                                                onClick={() => {
                                                    setSelectedFormat(format.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-none"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md ${format.bg} ${format.color}`}>
                                                        <format.icon size={18} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-medium text-gray-900 text-sm">{format.name}</div>
                                                        <div className="text-xs text-gray-500">{format.description}</div>
                                                    </div>
                                                </div>
                                                {selectedFormat === format.id && (
                                                    <Check size={16} className="text-blue-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Download Button */}
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className={`
                                    relative overflow-hidden flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold text-white transition-all shadow-md sm:w-auto w-full group
                                    ${downloading
                                        ? 'bg-blue-700 cursor-wait'
                                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95'
                                    }
                                `}
                            >
                                {/* Progress/Activity Background Animation */}
                                {downloading && (
                                    <div className="absolute inset-0 bg-blue-500/20">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-[shimmer_1.5s_infinite]"></div>
                                    </div>
                                )}

                                <Download size={20} className={`relative z-10 ${downloading ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                                <span className="relative z-10">{downloading ? 'Processing...' : 'Download'}</span>
                            </button>
                        </div>

                        {/* Overlay for dropdown close */}
                        {isDropdownOpen && (
                            <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                        )}

                        <div className="text-center pt-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium border border-yellow-100">
                                <Shield size={12} />
                                Secure file transfer protocol active
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inject Custom CSS for Animations */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) skewX(-12deg); }
                    100% { transform: translateX(200%) skewX(-12deg); }
                }
            `}</style>
        </div>
    );
}
