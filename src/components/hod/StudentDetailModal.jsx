import { useState, useEffect } from 'react';
import { X, User, Phone, BookOpen, Clock, Calendar, CheckCircle, AlertCircle, ScanLine, Activity, Mail, Trash2, ShieldAlert, MapPin, ChevronRight, UserCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export default function StudentDetailModal({ student, onClose, onScanAnother }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (student?.id && activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, student]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const q = query(
                collection(db, "attendanceLogs"),
                where("uid", "==", student.uid || student.id),
                orderBy("timestamp", "desc"),
                limit(20)
            );
            const snap = await getDocs(q);
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setHistory(logs);
        } catch (err) {
            console.error("Failed to load history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const { currentUser } = useAuth();
    const [reporting, setReporting] = useState(false);

    const handleReportBunking = async () => {
        if (!window.confirm(`REPORT BUNKING?\n\nAre you sure you want to report ${student.name} for bunking?\nThis will alert the HOD, Coordinator, and Mentor.`)) return;

        setReporting(true);
        try {
            await addDoc(collection(db, "securityAlerts"), {
                uid: student.uid || student.id,
                name: student.name,
                rollNumber: student.rollNumber || student.id,
                dept: student.dept || student.branch,
                type: 'BUNKING',
                reason: 'Reported by Faculty/Staff',
                reporterId: currentUser?.uid || 'unknown',
                timestamp: serverTimestamp(),
                date: new Date().toLocaleDateString('en-CA'),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });

            const dept = student.dept || student.branch;
            if (!dept) {
                toast.error("Student has no Department assigned. Cannot route alert.");
                setReporting(false);
                return;
            }

            const recipients = [];
            const getRecipientsByRole = async (collectionName, roleName, fieldsToCheck) => {
                const results = [];
                await Promise.all(fieldsToCheck.map(async (field) => {
                    const q = query(collection(db, collectionName), where(field, "==", dept));
                    const snap = await getDocs(q);
                    snap.forEach(d => {
                        if (!results.find(r => r.uid === d.id)) {
                            results.push({ uid: d.id, role: roleName });
                        }
                    });
                }));
                return results;
            };

            const hods = await getRecipientsByRole("hods", "hod", ["dept", "Department", "branch"]);
            recipients.push(...hods);
            const coords = await getRecipientsByRole("coordinators", "coordinator", ["branch", "dept", "Department"]);
            recipients.push(...coords);
            if (student.mentorId) {
                recipients.push({ uid: student.mentorId, role: 'faculty' });
            }

            const batchPromises = recipients.map(r => {
                return addDoc(collection(db, "notifications"), {
                    title: `🚨 BUNKING ALERT: ${student.name}`,
                    message: `Student ${student.name} (${student.rollNumber || student.id}) was reported for bunking class.`,
                    senderUid: currentUser?.uid || 'system',
                    senderName: 'Security/Faculty',
                    senderRole: 'system',
                    targetUid: r.uid,
                    targetRole: r.role,
                    targetDept: dept,
                    timestamp: serverTimestamp(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    readBy: []
                });
            });

            await Promise.all(batchPromises);
            toast.error("Bunking Incident Reported. Authorities Notified.");
            onClose();
        } catch (err) {
            console.error("Error reporting bunking:", err);
            toast.error("Failed to report incident.");
        } finally {
            setReporting(false);
        }
    };

    if (!student) return null;

    const isOnCampus = student.status === 'ON CAMPUS' || student.status === 'INSIDE';

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/20">

                {/* HEADER SECTION */}
                <div className={`relative px-8 pt-10 pb-12 flex flex-col items-center text-center overflow-hidden
                    ${isOnCampus ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-slate-700 to-slate-800'}
                `}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white backdrop-blur-md border border-white/10"
                    >
                        <X size={20} />
                    </button>

                    <div className="relative mb-6">
                        <div className={`w-32 h-32 rounded-[2rem] border-4 border-white/30 shadow-2xl flex items-center justify-center text-5xl font-black overflow-hidden bg-white/20 backdrop-blur-sm text-white
                            animate-in zoom-in-75 duration-500
                        `}>
                            {student.profileImage ? (
                                <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                student.name?.charAt(0)
                            )}
                        </div>
                        <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl shadow-lg border-2 border-white
                            ${isOnCampus ? 'bg-emerald-500' : 'bg-slate-400'}
                        `}>
                            {isOnCampus ? <CheckCircle size={18} className="text-white" /> : <Clock size={18} className="text-white" />}
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-white px-4 leading-tight">{student.name}</h2>
                    <p className="text-white/70 font-mono font-bold tracking-widest mt-1 uppercase">{student.id}</p>

                    <div className={`mt-6 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl border backdrop-blur-md
                        ${isOnCampus ? 'bg-emerald-400/20 border-emerald-400/30 text-emerald-50' : 'bg-white/10 border-white/10 text-slate-100'}
                    `}>
                        <Activity size={14} className={isOnCampus ? "animate-pulse" : ""} />
                        {isOnCampus ? "Currently Inside Campus" : "Outside / Not Logged"}
                    </div>
                </div>

                {/* TABS BAR */}
                <div className="px-8 -mt-6 relative z-10">
                    <div className="bg-white rounded-2xl p-1.5 shadow-xl border border-slate-100 flex gap-1">
                        <TabButton id="overview" label="Student Details" icon={UserCircle2} active={activeTab} set={setActiveTab} />
                        <TabButton id="history" label="Digital Footprint" icon={MapPin} active={activeTab} set={setActiveTab} />
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto px-8 pt-8 pb-4">
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Detailed Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ModernInfoCard title="Academic Profile" icon={BookOpen} color="indigo">
                                    <div className="space-y-3 mt-2">
                                        <DetailRow label="Department" value={student.dept || student.branch} />
                                        <DetailRow label="Academic Year" value={student.year ? `Year ${student.year}` : 'N/A'} />
                                        <DetailRow label="Class Section" value={student.section || 'N/A'} />
                                        <DetailRow label="Global Roll ID" value={student.rollNumber || student.id} highlighted />
                                    </div>
                                </ModernInfoCard>

                                <ModernInfoCard title="Primary Contact" icon={Phone} color="emerald">
                                    <div className="space-y-3 mt-2">
                                        <DetailRow label="Mobile Number" value={student.mobile} copyable />
                                        <DetailRow label="Institutional Email" value={student.email} />
                                        <DetailRow label="Guardian" value={student.parentName} />
                                        <DetailRow label="Emergency Contact" value={student.parentMobile} highlighted />
                                    </div>
                                </ModernInfoCard>

                                <div className="md:col-span-2">
                                    <ModernInfoCard title="Administrative Assignment" icon={ShieldAlert} color="amber">
                                        <div className="flex items-center justify-between mt-2">
                                            <DetailRow label="Assigned Mentor" value={student.mentorId || 'Not Assigned'} />
                                            <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase">System Verified</div>
                                        </div>
                                    </ModernInfoCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Recent Portal Interactions</h3>
                                <div className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase">Last 20 Logs</div>
                            </div>

                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Logs...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                                        <Calendar size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Activity Records Found</p>
                                </div>
                            ) : (
                                <div className="space-y-3 pr-2">
                                    {history.map((log, idx) => (
                                        <div key={log.id} className="group relative flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:-translate-y-0.5">
                                            {idx !== history.length - 1 && (
                                                <div className="absolute left-10 top-14 w-0.5 h-6 bg-slate-100"></div>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl shadow-sm
                                                    ${log.type === 'ENTRY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
                                                `}>
                                                    {log.type === 'ENTRY' ? <LogInIcon size={20} /> : <LogOutIcon size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">{log.type === 'ENTRY' ? 'Campus Entry' : 'Campus Exit'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.timestamp?.toDate()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1.5 justify-end text-slate-900">
                                                    <Clock size={12} className="text-slate-300" />
                                                    <p className="text-sm font-black italic">
                                                        {new Date(log.timestamp?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{log.gate || 'South Gate'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-4 bg-white text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-all border border-slate-200 active:scale-95"
                    >
                        Dismiss
                    </button>

                    <button
                        onClick={handleReportBunking}
                        disabled={reporting}
                        className="flex-1 py-4 bg-rose-50 text-rose-700 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2.5 border border-rose-100 active:scale-95 disabled:opacity-50"
                    >
                        <ShieldAlert size={18} /> {reporting ? 'Routing Alert...' : 'Flag Protocol'}
                    </button>

                    <button
                        onClick={onScanAnother}
                        className="flex-1 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2.5 active:scale-95 group"
                    >
                        <ScanLine size={18} className="transition-transform group-hover:scale-110" />
                        Next Scan
                    </button>
                </div>
            </div>
        </div>
    );
}

function TabButton({ id, label, icon: Icon, active, set }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
            `}
        >
            <Icon size={16} /> {label}
        </button>
    );
}

function ModernInfoCard({ title, icon: Icon, color, children }) {
    const colors = {
        indigo: 'bg-indigo-50/50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50/50 text-amber-600 border-amber-100'
    };

    return (
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className={`flex items-center gap-2.5 mb-2`}>
                <div className={`p-2 rounded-xl ${colors[color]}`}>
                    <Icon size={16} />
                </div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function DetailRow({ label, value, highlighted, copyable }) {
    return (
        <div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-tight mb-0.5">{label}</p>
            <div className="flex items-center gap-2">
                <p className={`text-sm font-bold tracking-tight ${highlighted ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {value || <span className="text-slate-300 font-medium italic italic">Unspecified</span>}
                </p>
                {copyable && value && <ChevronRight size={12} className="text-slate-200" />}
            </div>
        </div>
    );
}

const LogInIcon = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
);

const LogOutIcon = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
