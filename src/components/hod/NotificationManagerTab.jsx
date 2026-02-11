import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Send, Users, UserCheck, Bell, MessageSquare, Clock, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function NotificationManagerTab({ profile, role = 'hod' }) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState('student'); // student | faculty | all
    const [loading, setLoading] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: '' }

    // Robust ID lookup: Handle normalized camelCase (hodId) and raw JSON keys (HOD ID)
    const senderId = profile?.hodId || profile?.['HOD ID'] || profile?.coordinatorId || profile?.['Coordinator ID'];

    // Fetch recent notifications sent by this User
    useEffect(() => {
        if (senderId) {
            fetchRecent();
        } else {
            console.warn("NotificationManager: No senderId found in profile", profile);
        }
    }, [senderId]);

    const fetchRecent = async () => {
        if (!senderId) return;
        try {
            // SIMPLIFIED QUERY: Remove orderBy to bypass Firestore Index requirement
            const q = query(
                collection(db, "notifications"),
                where("senderUid", "==", senderId)
            );
            const snap = await getDocs(q);

            // Client-side Sort
            const sorted = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

            setRecentNotifications(sorted.slice(0, 10));
            cleanupExpired(sorted);
        } catch (err) {
            console.error("Error fetching recent notifications:", err);
        }
    };

    const cleanupExpired = async (notifications) => {
        const now = new Date();
        const expired = notifications.filter(n => {
            if (!n.expiresAt) return false;
            const exp = n.expiresAt.toDate ? n.expiresAt.toDate() : new Date(n.expiresAt);
            return exp < now;
        });

        if (expired.length > 0) {
            console.log(`Cleaning up ${expired.length} expired notifications...`);
            for (const n of expired) {
                try {
                    await deleteDoc(doc(db, "notifications", n.id));
                } catch (e) {
                    console.error("Cleanup failed for", n.id, e);
                }
            }
            // Refresh
            fetchRecent();
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notification? It will be removed for all recipients.")) return;

        try {
            await deleteDoc(doc(db, "notifications", id));
            setRecentNotifications(prev => prev.filter(n => n.id !== id));
            setStatus({ type: 'success', msg: 'Notification deleted successfully.' });
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            console.error("Error deleting notification:", err);
            setStatus({ type: 'error', msg: 'Failed to delete notification.' });
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        // Robust Department Check
        const dept = profile?.dept || profile?.Department;
        if (!dept) {
            setStatus({ type: 'error', msg: 'Error: Your profile does not have a department assigned.' });
            return;
        }

        if (!senderId) {
            setStatus({ type: 'error', msg: 'Error: Could not determine your User ID. contact Admin.' });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const payload = {
                title: title.trim(),
                message: message.trim(),
                senderUid: senderId,
                senderName: profile.name || profile.Name || 'Staff',
                senderRole: role,
                targetRole, // 'student', 'faculty', 'all'
                targetDept: dept, // Locked to sender's dept
                timestamp: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours from now
                readBy: []
            };

            await addDoc(collection(db, "notifications"), payload);

            setTitle('');
            setMessage('');
            setStatus({ type: 'success', msg: 'Notification sent successfully!' });
            fetchRecent(); // Refresh list

            // Auto-dismiss success message
            setTimeout(() => setStatus(null), 3000);

        } catch (err) {
            console.error("Error sending notification:", err);
            setStatus({ type: 'error', msg: 'Failed to send notification. ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="text-indigo-600" /> Notification Center
                    </h2>
                    <p className="text-gray-500">Broadcast messages to your department ({profile?.dept || profile?.Department || 'Unknown'})</p>
                </div>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Compose Form */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-gray-400" /> Compose Message
                    </h3>

                    <form onSubmit={handleSend} className="space-y-6">

                        {/* Target Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTargetRole('student')}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${targetRole === 'student'
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-sm'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Users size={18} /> Students
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetRole('faculty')}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${targetRole === 'faculty'
                                        ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold shadow-sm'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <UserCheck size={18} /> Faculty
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetRole('all')}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${targetRole === 'all'
                                        ? 'bg-gray-900 border-gray-900 text-white font-bold shadow-md'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    All Dept
                                </button>
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject / Title</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                placeholder="e.g. Important: Tomorrow's Schedule Change"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                            <textarea
                                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-gray-300"
                                placeholder="Type your announcement here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                            />
                        </div>

                        {/* Status Message */}
                        {status && (
                            <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                } animate-in fade-in slide-in-from-top-2`}>
                                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <p className="text-sm font-medium">{status.msg}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>Sending...</>
                            ) : (
                                <>
                                    <Send size={20} /> Send Broadcast
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Column: History & Alerts */}
                <div className="space-y-6 h-fit">

                    {/* Recent Broadcasts */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock size={16} /> Recent Broadcasts
                        </h3>

                        <div className="space-y-4">
                            {recentNotifications.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-8">No messages sent yet.</p>
                            ) : (
                                recentNotifications.map(notif => (
                                    <div key={notif.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${notif.targetRole === 'student' ? 'bg-indigo-100 text-indigo-700' :
                                                notif.targetRole === 'faculty' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                To: {notif.targetRole}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400">
                                                    {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                                </span>
                                                <button
                                                    onClick={() => handleDelete(notif.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Delete Notification"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="font-semibold text-gray-900 text-sm mb-1 pr-6">{notif.title}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm animate-in fade-in slide-in-from-right-2 duration-700">
                        <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <AlertCircle size={16} /> Bunking Reports
                        </h3>
                        <BunkerAlertsList dept={profile?.dept || profile?.Department} />
                    </div>

                </div>
            </div>
        </div>
    );
}

function BunkerAlertsList({ dept }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!dept) return;

        // Query Security Alerts (Fetch recent 20, filter BUNKING client-side to avoid Index error)
        const q = query(
            collection(db, "securityAlerts"),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Client Filter: Type == BUNKING AND (Dept match or ALL)
            const filtered = data.filter(a => {
                if (a.type !== 'BUNKING') return false;

                // Normalize depts for comparison (remove non-alphanumeric, uppercase)
                const alertDept = (a.dept || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const myDept = (dept || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

                // Check for loose matches (e.g. AID vs AIDS)
                const isDeptMatch = !alertDept || alertDept === 'ALL' ||
                    alertDept === myDept ||
                    (myDept.length > 0 && alertDept.includes(myDept)) ||
                    (alertDept.length > 0 && myDept.includes(alertDept));

                return isDeptMatch;
            });

            setAlerts(filtered.slice(0, 10)); // Take top 10 after filtering
            setLoading(false);
        });

        return () => unsubscribe();
    }, [dept]);

    if (loading) return <div className="text-sm text-gray-400 py-4">Loading alerts...</div>;

    if (alerts.length === 0) {
        return (
            <div className="text-sm text-gray-500 italic bg-white/50 p-4 rounded-lg border border-red-100/50">
                No active bunking reports in your department.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {alerts.map(alert => (
                <div key={alert.id} className="bg-white px-3 py-2 rounded-lg border-l-4 border-red-500 shadow-sm flex items-center justify-between hover:bg-red-50/50 transition-colors group">
                    <div className="flex flex-col min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-gray-900 text-sm truncate">{alert.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">({alert.rollNumber})</span>
                        </div>
                        <p className="text-xs text-gray-600 italic truncate group-hover:text-gray-900 transition-colors">"{alert.reason}"</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 font-medium">
                            {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
