import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Bell, Check, Info, Clock } from 'lucide-react';

export default function NotificationDropdown({ currentUser, role, dept }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!currentUser?.uid) return;

        // Query Logic:
        // 1. Target UID matches current user
        // OR
        // 2. Target Role matches current role AND (Target Dept is 'ALL' or matches current dept)

        // Firestore OR queries are limited, so we might need two listeners or client-side filter.
        // For simplicity and scalability limitations in standard firestore, we'll listen to a "notifications" collection
        // and filter client-side for the broad casts if needed, OR relies on a composite index.

        // Let's try a simplified approach:
        // We will listen to notifications where 'targetUid' == currentUser.uid (Direct messages)
        // AND 'targetRole' == role (Broadcasts)

        // Since we can't do complex OR in one stream easily without duplication, let's just query for the Role/Dept broadcast 
        // and assume direct messages are rare or handled separately, OR better yet:
        // Just Query for "targetRole" == role (e.g. 'student') 
        // AND sort by date. Then client-filter for Dept.

        const q = query(
            collection(db, "notifications"),
            where("targetRole", "in", [role, 'all']),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(msg => {
                // Client-side filtering for Department
                if (msg.targetDept && msg.targetDept !== 'ALL' && msg.targetDept !== dept) {
                    return false;
                }

                // Filter Expired
                if (msg.expiresAt) {
                    try {
                        // Handle Firestore Timestamp or Date object
                        const exp = msg.expiresAt.toDate ? msg.expiresAt.toDate() : new Date(msg.expiresAt);
                        if (exp < new Date()) return false;
                    } catch (e) {
                        // If invalid date, keep it safely or hide? Hide to be safe.
                        return false;
                    }
                }

                return true;
            });

            setNotifications(msgs);
            // Simple unread count: count messages that don't have this user's ID in 'readBy' array
            // Optimization: For broad casts, 'readBy' array might get large. 
            // For now, let's just show total recent messages as "unread" if we want, or just a dot if there are any.
            // Let's assume all are "new" for now or use a local storage "lastReadTime" comparison.

            const lastReadTime = localStorage.getItem(`lastReadNotif_${currentUser.uid}`) || 0;
            const newCount = msgs.filter(m => m.timestamp?.toMillis() > Number(lastReadTime)).length;
            setUnreadCount(newCount);
        });

        return () => unsubscribe();
    }, [currentUser, role, dept]);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Mark as read (locally) by updating timestamp
            setUnreadCount(0);
            localStorage.setItem(`lastReadNotif_${currentUser.uid}`, Date.now());
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5">
                    <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10 backdrop-blur-md bg-white/80">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-800">Notifications</h3>
                            {unreadCount > 0 && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">{unreadCount} New</span>}
                        </div>
                        <button className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors">Mark all read</button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {notifications.length === 0 ? (
                            <div className="py-12 px-6 text-center text-gray-400 flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <Bell size={20} className="opacity-50" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">No notifications yet</p>
                                <p className="text-xs mt-1">We'll notify you when something arrives!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif, idx) => {
                                    const isNew = notif.timestamp?.toMillis() > Number(localStorage.getItem(`lastReadNotif_${currentUser.uid}`) || 0);

                                    return (
                                        <div key={notif.id || idx} className={`p-4 hover:bg-gray-50 transition-colors relative group ${isNew ? 'bg-indigo-50/30' : ''}`}>
                                            {isNew && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                                            <div className="flex gap-4">
                                                <div className="mt-1 shrink-0">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${notif.senderRole === 'admin' ? 'bg-gradient-to-br from-gray-800 to-black' :
                                                        notif.senderRole === 'hod' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                                                            'bg-gradient-to-br from-blue-500 to-cyan-500'
                                                        }`}>
                                                        {notif.senderRole?.charAt(0).toUpperCase() || 'S'}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {notif.senderRole || 'System'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                                            {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                        </span>
                                                    </div>
                                                    <h4 className={`text-sm font-bold text-gray-900 leading-tight mb-1 ${isNew ? 'text-indigo-900' : ''}`}>
                                                        {notif.title}
                                                    </h4>
                                                    {notif.expiresAt && (
                                                        <p className="text-[10px] text-amber-600 font-medium mb-1 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            Expiries {notif.expiresAt.toDate ? notif.expiresAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'soon'}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                            <button className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors">View All History</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
