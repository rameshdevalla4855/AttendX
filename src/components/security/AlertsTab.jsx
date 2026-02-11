import React, { useState, useEffect } from 'react';
import { AlertOctagon, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

export default function AlertsTab() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const cleanupExpired = async (list) => {
        const now = new Date();
        const expired = list.filter(a => {
            if (!a.expiresAt) return false;
            const exp = a.expiresAt.toDate ? a.expiresAt.toDate() : new Date(a.expiresAt);
            return exp < now;
        });

        if (expired.length > 0) {
            console.log(`Cleaning up ${expired.length} expired alerts...`);
            for (const a of expired) {
                try {
                    await deleteDoc(doc(db, "securityAlerts", a.id));
                } catch (e) {
                    console.error("Cleanup failed:", e);
                }
            }
        }
    };

    useEffect(() => {
        const q = query(
            collection(db, "securityAlerts"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter valid for display (Exclude BUNKING alerts)
            const valid = data.filter(a => {
                if (a.type === 'BUNKING') return false; // Hide bunking alerts from security view

                if (!a.expiresAt) return true;
                const exp = a.expiresAt.toDate ? a.expiresAt.toDate() : new Date(a.expiresAt);
                return exp > new Date();
            });

            setAlerts(valid);
            setLoading(false);

            // Trigger cleanup of ALL fetched (including expired)
            cleanupExpired(data);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-50 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertOctagon className="text-red-600" /> Recent Alerts
            </h2>

            {loading ? (
                <div className="text-center text-gray-400 py-10">Loading alerts...</div>
            ) : alerts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <ShieldAlert size={32} className="text-green-500" />
                    </div>
                    <p className="font-medium text-gray-600">All Quiet</p>
                    <p className="text-sm">No security incidents recorded.</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-white border-l-4 border-red-500 rounded-r-xl shadow-sm p-4 animate-in slide-in-from-left-2 duration-300">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-red-600 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        {alert.type || 'ALERT'}
                                    </h4>
                                    <p className="text-gray-900 font-medium mt-1">{alert.reason}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">User: {alert.name} ({alert.uid})</p>
                                </div>
                                <span className="text-xs font-mono text-gray-400">
                                    {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
