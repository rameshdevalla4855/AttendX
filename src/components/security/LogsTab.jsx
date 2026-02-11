import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Clock, Search, User } from 'lucide-react';

export default function LogsTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        // Query logs for TODAY
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const logsQuery = query(
            collection(db, "attendanceLogs"),
            where("timestamp", ">=", startOfDay),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isVisitor: doc.data().role === 'visitor'
            }));

            setLogs(logsData);
            setLoading(false);
        });

        return () => {
            unsubscribeLogs();
        };
    }, []);

    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        const matchesTerm = (
            (log.name && log.name.toLowerCase().includes(term)) ||
            (log.uid && log.uid.toLowerCase().includes(term)) ||
            (log.rollNumber && log.rollNumber.toLowerCase().includes(term)) ||
            (log.rollNo && log.rollNo.toLowerCase().includes(term)) ||
            (log.id && log.id.toLowerCase().includes(term)) ||
            (log.facultyId && log.facultyId.toLowerCase().includes(term))
        );

        if (!matchesTerm) return false;

        if (filterType === 'IN') return log.type === 'ENTRY';
        if (filterType === 'OUT') return log.type === 'EXIT';
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header / Filter */}
            <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search logs by Name or ID..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg">
                    {['ALL', 'IN', 'OUT'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${filterType === type
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {type === 'ALL' ? 'All Logs' : type === 'IN' ? 'Entries Only' : 'Exits Only'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <p className="text-center text-gray-500 py-8">Loading logs...</p>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <Clock size={48} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">No logs for today yet.</p>
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-colors hover:border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${log.role === 'faculty' ? 'bg-purple-100 text-purple-700' : log.role === 'visitor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {log.role === 'faculty' ? 'F' : log.role === 'visitor' ? 'V' : 'S'}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">{log.name || 'Unknown'}</h4>
                                    <p className="text-xs text-gray-500 font-mono">
                                        {/* Display Roll No / ID first, then Year, then Dept */}
                                        <span className="font-bold text-gray-600">
                                            {/* Logic: If rollNumber is valid and NOT equal to UID, show it. Else 'N/A' */}
                                            {log.rollNumber && log.rollNumber !== 'N/A' && log.rollNumber !== log.uid
                                                ? log.rollNumber
                                                : 'No ID'}
                                        </span>
                                        {log.year && log.year !== 'N/A' ? <span className="mx-1">• {log.year}</span> : ''}
                                        <span className="text-gray-300 mx-2">|</span>
                                        {log.dept || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${log.type === 'ENTRY' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                                    }`}>
                                    {log.type === 'ENTRY' ? 'IN' : 'OUT'}
                                </span>
                                <p className="text-xs text-gray-400 mt-1 font-medium">
                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
