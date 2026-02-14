
import { useState, useEffect } from 'react';
import { X, User, Phone, BookOpen, Clock, Calendar, CheckCircle, AlertCircle, ScanLine, Activity } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export default function StudentDetailModal({ student, onClose, onScanAnother }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, percentage: 0 });

    useEffect(() => {
        if (student?.id && activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, student]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            // Fetch recent 20 logs
            const q = query(
                collection(db, "attendanceLogs"),
                where("uid", "==", student.uid || student.id),
                orderBy("timestamp", "desc"),
                limit(20)
            );
            const snap = await getDocs(q);
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setHistory(logs);

            // Calculate simple stats (mock or real if we had aggregate data)
            // For now, let's just show the logs
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
            // 1. Log Security Alert
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
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
            });

            // 2. Find Recipients (HOD, Coordinator of Student's Dept)
            const dept = student.dept || student.branch;
            if (!dept) {
                toast.error("Student has no Department assigned. Cannot route alert.");
                setReporting(false);
                return;
            }

            const recipients = [];

            // Helper to get docs from multiple potential fields
            const getRecipientsByRole = async (collectionName, roleName, fieldsToCheck) => {
                const results = [];
                // Run queries in parallel for each potential field name
                await Promise.all(fieldsToCheck.map(async (field) => {
                    const q = query(collection(db, collectionName), where(field, "==", dept));
                    const snap = await getDocs(q);
                    snap.forEach(d => {
                        // Avoid duplicates if same user found via multiple queries
                        if (!results.find(r => r.uid === d.id)) {
                            results.push({ uid: d.id, role: roleName });
                        }
                    });
                }));
                return results;
            };

            // HOD: Check 'dept', 'Department', 'branch'
            const hods = await getRecipientsByRole("hods", "hod", ["dept", "Department", "branch"]);
            recipients.push(...hods);

            // Coordinator: Check 'branch', 'dept', 'Department'
            const coords = await getRecipientsByRole("coordinators", "coordinator", ["branch", "dept", "Department"]);
            recipients.push(...coords);

            // Mentor
            if (student.mentorId) {
                recipients.push({ uid: student.mentorId, role: 'faculty' });
            }

            if (recipients.length === 0) {
                toast.warning(`Alert logged, but no HOD/Coordinator found for ${dept}.`);
            } else {
                console.log(`Sending alerts to ${recipients.length} recipients:`, recipients);
            }

            // 3. Send Notifications (Ephemeral)
            const batchPromises = recipients.map(r => {
                return addDoc(collection(db, "notifications"), {
                    title: `🚨 BUNKING ALERT: ${student.name}`,
                    message: `Student ${student.name} (${student.rollNumber || student.id}) was reported for bunking class.`,
                    senderUid: currentUser?.uid || 'system',
                    senderName: 'Security/Faculty',
                    senderRole: 'system',
                    targetUid: r.uid, // Direct Target
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">

                {/* HEADER */}
                <div className={`p-6 ${isOnCampus ? 'bg-green-50' : 'bg-gray-50'} border-b border-gray-100 flex flex-col items-center text-center relative`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 shadow-sm transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>

                    <div className={`w-28 h-28 rounded-full border-4 shadow-xl mb-4 flex items-center justify-center text-4xl font-bold
                        ${isOnCampus ? 'border-white bg-green-100 text-green-600' : 'border-white bg-gray-200 text-gray-500'}
                    `}>
                        {student.profileImage ? (
                            <img src={student.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            student.name?.charAt(0)
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                    <p className="text-gray-500 font-mono font-medium">{student.id}</p>

                    <div className={`mt-3 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm
                        ${isOnCampus ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                    `}>
                        <Activity size={16} className={isOnCampus ? "animate-pulse" : ""} />
                        {isOnCampus ? "CURRENTLY ON CAMPUS" : "CHECKED OUT / ABSENT"}
                    </div>
                    {student.lastTime && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Clock size={12} /> Last Activity: {student.lastTime}
                        </p>
                    )}
                </div>

                {/* TABS */}
                <div className="flex border-b border-gray-100">
                    <TabButton id="overview" label="Overview" icon={User} active={activeTab} set={setActiveTab} />
                    <TabButton id="history" label="Activity Log" icon={Calendar} active={activeTab} set={setActiveTab} />
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[300px]">

                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Academic Info */}
                            <Section title="Academic Details" icon={BookOpen}>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoItem label="Branch" value={student.dept || student.branch} />
                                    <InfoItem label="Year" value={student.year ? `Year ${student.year}` : 'N/A'} />
                                    <InfoItem label="Section" value={student.section || 'N/A'} />
                                    <InfoItem label="Roll No" value={student.rollNumber || student.id} />
                                </div>
                            </Section>

                            {/* Contact Info */}
                            <Section title="Contact Information" icon={Phone}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoItem label="Mobile" value={student.mobile} />
                                    <InfoItem label="Email" value={student.email} />
                                    <InfoItem label="Parent Name" value={student.parentName} />
                                    <InfoItem label="Parent Contact" value={student.parentMobile} highlight />
                                </div>
                            </Section>

                            {/* Mentor */}
                            <Section title="Mentorship" icon={User}>
                                <InfoItem label="Assigned Mentor ID" value={student.mentorId || 'Not Assigned'} />
                            </Section>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="font-bold text-gray-800 mb-2">Recent Campus Activity</h3>
                            {loadingHistory ? (
                                <div className="text-center py-8 text-gray-400">Loading history...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">No recent activity logs found.</div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${log.type === 'ENTRY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {log.type === 'ENTRY' ? <CheckCircle size={18} /> : <LogOutIcon size={18} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{log.type === 'ENTRY' ? 'Checked In' : 'Checked Out'}</p>
                                                    <p className="text-xs text-gray-500">{new Date(log.timestamp?.toDate()).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono font-bold text-gray-900">
                                                    {new Date(log.timestamp?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-[10px] text-gray-400 uppercase">{log.gate || 'Main Gate'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* FOOTER actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleReportBunking}
                        disabled={reporting}
                        className="flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <AlertCircle size={18} /> {reporting ? 'Reporting...' : 'Report Bunking'}
                    </button>
                    <button
                        onClick={onScanAnother}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        <ScanLine size={18} /> Scan Next
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
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors border-b-2
                ${isActive ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}
            `}
        >
            <Icon size={16} /> {label}
        </button>
    );
}

function Section({ title, icon: Icon, children }) {
    return (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Icon size={14} /> {title}
            </h4>
            {children}
        </div>
    );
}

function InfoItem({ label, value, highlight }) {
    return (
        <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">{label}</p>
            <p className={`font-semibold ${highlight ? 'text-indigo-600' : 'text-gray-900'}`}>
                {value || <span className="text-gray-300 italic">N/A</span>}
            </p>
        </div>
    );
}

// Icon Helper
const LogOutIcon = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
);
