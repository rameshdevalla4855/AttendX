import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowDownRight, ArrowUpRight, Clock, Calendar } from 'lucide-react';

export default function UserAttendanceHistory() {
    const { currentUser } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        // Query logs where uid == currentUser.uid
        // Note: Sort temporarily removed if index is missing, but ideally: orderBy("timestamp", "desc")
        const q = query(
            collection(db, "attendanceLogs"),
            where("uid", "==", currentUser.uid),
            orderBy("timestamp", "desc"),
            limit(5) // Show top 5 recent
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A',
                dateString: doc.data().timestamp?.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) || 'N/A'
            }));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user history: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (loading) return (
        <div className="flex items-center justify-center py-8 text-gray-400 animate-pulse">
            <Clock size={20} className="mr-2" /> Loading stats...
        </div>
    );

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Clock size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No activity recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log, index) => {
                const isEntry = log.type === 'ENTRY';
                // Enhanced Date Format: "Monday, Oct 24"
                const fullDate = log.timestamp?.toDate().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) || 'N/A';

                return (
                    <div key={log.id} className="group flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 relative">
                        {/* Timeline Connector */}
                        {index !== logs.length - 1 && (
                            <div className="absolute left-[27px] top-12 bottom-[-16px] w-0.5 bg-gray-100 group-hover:bg-gray-200 transition-colors"></div>
                        )}

                        {/* Icon Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 z-10 ${isEntry ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {isEntry ? <ArrowDownRight size={20} strokeWidth={2.5} /> : <ArrowUpRight size={20} strokeWidth={2.5} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className={`font-bold text-base ${isEntry ? 'text-green-800' : 'text-orange-800'}`}>
                                        {isEntry ? 'Checked In' : 'Checked Out'}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                                        <Calendar size={12} />
                                        {fullDate}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                                        {log.time}
                                    </span>
                                    {log.isLate && <span className="text-[10px] text-red-500 font-bold mt-1 block tracking-wide uppercase">Late</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
