import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, BookOpen, Edit2, CheckCircle, Filter, X } from 'lucide-react';

export default function ClassAttendanceHistory({ onEditClass, selectedClass }) {
    const { currentUser } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(''); // '2024-02-20'

    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentUser || !selectedClass) return;

            setLoading(true);
            try {
                // Base Query: Faculty + Class
                let constraints = [
                    where('facultyId', '==', currentUser.uid),
                    where('branch', '==', selectedClass.branch),
                    where('year', '==', Number(selectedClass.year)),
                    where('section', '==', selectedClass.section)
                ];

                // Add Date Filter if present
                if (dateFilter) {
                    constraints.push(where('date', '==', dateFilter));
                }

                // Note: Complex queries with multiple equality/range filters might need indexes.
                // We'll keep it simple for now and sort client-side if needed, 
                // or ensure index exists for (facultyId, branch, year, section, date).

                const q = query(
                    collection(db, 'attendance_periods'),
                    ...constraints
                    // limit(20) // Pagination later
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Client-side sort (descending date/time)
                data.sort((a, b) => {
                    const tA = a.timestamp?.toMillis() || 0;
                    const tB = b.timestamp?.toMillis() || 0;
                    return tB - tA;
                });

                setLogs(data);
            } catch (err) {
                console.error("Error fetching class history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [currentUser, selectedClass, dateFilter]);

    const handleEdit = (log) => {
        if (onEditClass) {
            onEditClass({
                context: `${log.branch} Yr ${log.year} (${log.section})`,
                time: `${log.startTime} - ${log.endTime}`,
                subjectCode: log.subjectCode,
                subjectName: log.subjectName,
                facultyId: log.facultyId,
                facultyName: log.facultyName,
                date: log.date // Crucial for editing past records
            });
        }
    };

    if (!selectedClass) {
        return <div className="p-8 text-center text-gray-400">Please select a class first.</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Filter size={16} />
                    <span className="font-semibold">Filters:</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-700"
                    />
                    {dateFilter && (
                        <button
                            onClick={() => setDateFilter('')}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Clear Date"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Loading records...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="py-16 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium text-gray-500">No attendance records found.</p>
                    <p className="text-xs mt-1">Try changing the date filter.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => (
                        <div key={log.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md hover:border-purple-200 transition-all group">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900">{log.subjectName}</h4>
                                        <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                                            {log.subjectCode}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-purple-400" />
                                            <span className="font-medium">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-purple-400" />
                                            <span>{log.startTime} - {log.endTime}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                        Submitted {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Recently'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleEdit(log)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all font-semibold text-sm border border-gray-200 hover:border-purple-600 hover:shadow-lg hover:shadow-purple-200"
                            >
                                <Edit2 size={16} />
                                <span className="group-hover:inline-block">Edit</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
