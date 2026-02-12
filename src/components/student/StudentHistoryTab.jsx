import React, { useState, useEffect } from 'react';
import UserAttendanceHistory from '../UserAttendanceHistory';
import { History, ArrowLeft, Users } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

// ... imports remain same

export default function StudentHistoryTab({ onBack, profile }) {
    const [subTab, setSubTab] = useState('attendance'); // attendance | visitors
    const { currentUser } = useAuth();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors md:hidden">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                        {subTab === 'attendance' ? <History className="text-indigo-600" /> : <Users className="text-indigo-600" />}
                        {subTab === 'attendance' ? 'Attendance Log' : 'Visitor History'}
                    </h2>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    <button
                        onClick={() => setSubTab('attendance')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === 'attendance' ? 'bg-white shadow-sm text-indigo-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setSubTab('visitors')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === 'visitors' ? 'bg-white shadow-sm text-indigo-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Visitors
                    </button>
                </div>
            </div>

            {subTab === 'attendance' ? (
                <div className="bg-white rounded-[1.5rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden p-6">
                    <UserAttendanceHistory />
                </div>
            ) : (
                <VisitorHistoryList studentProfile={profile} />
            )}
        </div>
    );
}

function VisitorHistoryList({ studentProfile }) {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVisits = async () => {
            if (!studentProfile?.id) return;
            try {
                const q = query(
                    collection(db, "visitorVisits"),
                    where("studentId", "==", studentProfile.id),
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
    }, [studentProfile]);

    if (loading) return <div className="text-center py-12 text-slate-400 font-medium">Loading history...</div>;

    if (visits.length === 0) return (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-900 font-bold text-lg">No visitors recorded yet</p>
            <p className="text-slate-500 text-sm mt-1">Your visitor history will appear here.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-[1.5rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-50">
                {visits.map(visit => (
                    <div key={visit.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">{visit.visitorName}</h4>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <span className="capitalize font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{visit.relation}</span>
                                <span className="text-slate-300">•</span>
                                <span>{new Date(visit.date).toLocaleDateString()}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${visit.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                                visit.status === 'EXITED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                    visit.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                                }`}>
                                {visit.status.replace('_', ' ')}
                            </span>
                            {visit.entryTime && (
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
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
