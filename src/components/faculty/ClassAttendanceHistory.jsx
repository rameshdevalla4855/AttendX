import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, BookOpen, Edit2, CheckCircle } from 'lucide-react';

export default function ClassAttendanceHistory({ onEditClass }) {
    const { currentUser } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentUser) return;

            try {
                // Fetch recent attendance submissions by this faculty
                // Note: Index required for complex queries (facultyId + timestamp)
                // Fallback to client-side sort if needed for prototype
                const q = query(
                    collection(db, 'attendance_periods'),
                    where('facultyId', '==', currentUser.uid)
                    // orderBy('timestamp', 'desc'), 
                    // limit(20)
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
    }, [currentUser]);

    const handleEdit = (log) => {
        // Reconstruct Session Object for AttendanceMarking
        // Log has: branch, year, section, date, startTime, endTime, subjectCode, subjectName
        const session = {
            context: `${log.branch} Yr ${log.year} (${log.section})`,
            time: `${log.startTime} - ${log.endTime}`,
            subjectCode: log.subjectCode,
            subjectName: log.subjectName,
            facultyId: log.facultyId,
            facultyName: log.facultyName,
            date: log.date // Crucial for editing past records
        };

        if (onEditClass) onEditClass(session);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading history...</div>;
    }

    if (logs.length === 0) {
        return (
            <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                <BookOpen size={32} className="mx-auto mb-3 opacity-20" />
                <p>No clean records found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="bg-white border boundary-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <CheckCircle size={20} className="text-indigo-600" />
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
                                    <Calendar size={14} />
                                    <span>{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    <span>{log.startTime} - {log.endTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded text-xs uppercase tracking-wider">
                                        {log.branch} - {log.year} ({log.section})
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                Submitted {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Recently'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => handleEdit(log)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-semibold text-sm"
                    >
                        <Edit2 size={16} />
                        Edit Record
                    </button>
                </div>
            ))}
        </div>
    );
}
