import React, { useState, useEffect } from 'react';
import UserAttendanceHistory from '../UserAttendanceHistory';
import { History, ArrowLeft, Users } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function StudentHistoryTab({ onBack }) {
    const [subTab, setSubTab] = useState('attendance'); // attendance | visitors
    const { currentUser } = useAuth();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors md:hidden">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {subTab === 'attendance' ? <History className="text-indigo-600" /> : <Users className="text-indigo-600" />}
                        {subTab === 'attendance' ? 'Attendance Log' : 'Visitor History'}
                    </h2>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setSubTab('attendance')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'attendance' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setSubTab('visitors')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'visitors' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                        Visitors
                    </button>
                </div>
            </div>

            {subTab === 'attendance' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                    <UserAttendanceHistory />
                </div>
            ) : (
                <VisitorHistoryList currentUser={currentUser} />
            )}
        </div>
    );
}

function VisitorHistoryList({ currentUser }) {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVisits = async () => {
            if (!currentUser?.uid) return;
            try {
                const q = query(
                    collection(db, "visitorVisits"),
                    where("studentId", "==", currentUser.uid),
                    orderBy("timestamp", "desc")
                );
                const snap = await getDocs(q);
                setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchVisits();
    }, [currentUser]);

    if (loading) return <div className="text-center py-8 text-gray-500">Loading history...</div>;

    if (visits.length === 0) return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No visitors recorded yet.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
                {visits.map(visit => (
                    <div key={visit.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-gray-900">{visit.visitorName}</h4>
                            <p className="text-xs text-gray-500 flex gap-2">
                                <span className="capitalize">{visit.relation}</span>
                                <span>•</span>
                                <span>{new Date(visit.date).toLocaleDateString()}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${visit.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    visit.status === 'EXITED' ? 'bg-gray-100 text-gray-600' :
                                        visit.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                }`}>
                                {visit.status.replace('_', ' ')}
                            </span>
                            {visit.entryTime && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                    In: {visit.entryTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
