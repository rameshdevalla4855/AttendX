import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { academicService } from '../services/academicService'; // Import Service
import { Helmet } from 'react-helmet-async';
import UserProfile from '../components/UserProfile';
import QrScanner from '../components/QrScanner';
import StudentDetailModal from '../components/hod/StudentDetailModal';
import { Toaster, toast } from 'sonner';
import { User, Briefcase, MapPin, Calendar, Home, History, LogOut, ScanLine, Bell } from 'lucide-react';

// Tabs
import FacultyHomeTab from '../components/faculty/FacultyHomeTab';
import FacultyScheduleTab from '../components/faculty/FacultyScheduleTab';
import FacultyHistoryTab from '../components/faculty/FacultyHistoryTab';
import AttendanceMarking from '../components/faculty/AttendanceMarking'; // Restore Import
import NotificationDropdown from '../components/common/NotificationDropdown';

export default function FacultyDashboard() {
    const { currentUser, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [assignments, setAssignments] = useState([]); // State for Classes
    const [schedule, setSchedule] = useState({}); // Weekly Schedule
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [status, setStatus] = useState('OUT'); // Default OUT
    const [prevStatus, setPrevStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [selectedSession, setSelectedSession] = useState(null); // Restore Marking State
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Scanner State
    const [scannedProfile, setScannedProfile] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    const [manualId, setManualId] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    // 1. Profile
                    const qProfile = query(collection(db, "faculty"), where("email", "==", currentUser.email));
                    const profileSnap = await getDocs(qProfile);
                    if (!profileSnap.empty) setProfile(profileSnap.docs[0].data());

                    // 2. Fetch Assignments & Schedule
                    if (currentUser.uid) {
                        const myClasses = await academicService.getMyAssignments(currentUser.uid);
                        setAssignments(myClasses);

                        const uniqueContexts = [...new Set(myClasses.map(c => `${c.branch}_${c.year}_${c.section}`))];
                        const fullSchedule = {};

                        await Promise.all(uniqueContexts.map(async (ctx) => {
                            const [branch, year, section] = ctx.split('_');
                            const tt = await academicService.getTimetable(branch, year, section);

                            if (tt?.schedule) {
                                Object.entries(tt.schedule).forEach(([day, slots]) => {
                                    if (!fullSchedule[day]) fullSchedule[day] = [];
                                    const mySlots = slots.filter(s => s.facultyId === currentUser.uid);
                                    mySlots.forEach(s => {
                                        fullSchedule[day].push({ ...s, context: `${branch} Yr ${year} (${section})` });
                                    });
                                });
                            }
                        }));
                        setSchedule(fullSchedule);
                    }
                } catch (err) { console.error(err); }
            }
        };
        fetchProfile();
    }, [currentUser]);

    // Real-time Status Listener
    useEffect(() => {
        if (currentUser?.uid) {
            const statusQ = query(
                collection(db, "attendanceLogs"),
                where("uid", "==", currentUser.uid),
                orderBy("timestamp", "desc"),
                limit(1)
            );

            const unsubscribe = onSnapshot(statusQ, (snapshot) => {
                if (!snapshot.empty) {
                    const lastLog = snapshot.docs[0].data();
                    const newStatus = lastLog.type === 'ENTRY' ? 'IN' : 'OUT';
                    setStatus(newStatus);

                    if (prevStatus && prevStatus !== newStatus) {
                        if (newStatus === 'IN') {
                            toast.success('Welcome back, Professor! 🎓', {
                                description: `Entry recorded at ${new Date().toLocaleTimeString()}`,
                                duration: 4000,
                            });
                        } else {
                            toast.info('Have a great day! 👋', {
                                description: `Exit recorded at ${new Date().toLocaleTimeString()}`,
                                duration: 4000,
                            });
                        }
                    }
                    setPrevStatus(newStatus);
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser, prevStatus]);

    const handleLookup = async (id) => {
        if (!id) return;
        setScanLoading(true);
        setScannedProfile(null);

        try {
            let studentData = null;
            let studentId = id.trim().toUpperCase();

            // 1. Try Direct System ID
            const docRef = doc(db, "students", studentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                studentData = { ...docSnap.data(), id: docSnap.id };
            } else {
                // 2. Try Barcode ID
                const studentsRef = collection(db, "students");
                const qBarcode = query(studentsRef, where("barcodeId", "==", id));
                const barcodeSnap = await getDocs(qBarcode);

                if (!barcodeSnap.empty) {
                    const d = barcodeSnap.docs[0];
                    studentData = { ...d.data(), id: d.id };
                    studentId = d.id;
                } else {
                    // 3. Try Roll Number
                    const qRoll = query(studentsRef, where("rollNumber", "==", studentId));
                    const rollSnap = await getDocs(qRoll);
                    if (!rollSnap.empty) {
                        const d = rollSnap.docs[0];
                        studentData = { ...d.data(), id: d.id };
                        studentId = d.id;
                    }
                }
            }

            if (studentData) {
                // Fetch Today's Log
                const today = new Date().toLocaleDateString('en-CA');
                const logsRef = collection(db, "attendanceLogs");
                const qLogsSafe = query(logsRef, where("uid", "==", studentId), where("date", "==", today));
                const logsSnap = await getDocs(qLogsSafe);

                let status = 'ABSENT';
                let lastTime = null;

                if (!logsSnap.empty) {
                    const logs = logsSnap.docs.map(d => d.data()).sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                    const latest = logs[0];
                    status = latest.type === 'ENTRY' ? 'ON CAMPUS' : 'CHECKED OUT';
                    lastTime = latest.timestamp?.toDate ? latest.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                }
                setScannedProfile({ ...studentData, status, lastTime });
            } else {
                toast.error(`Student not found for ID: ${id}`);
            }
        } catch (err) {
            console.error("Lookup failed", err);
            // Enhanced Error Reporting for User
            toast.error(err.code === 'permission-denied'
                ? "Access Denied: You don't have permission to view student details."
                : `Error fetching details: ${err.message}`);
        } finally {
            setScanLoading(false);
        }
    };

    const renderContent = () => {
        // Validation: Verify component exists before rendering
        if (selectedSession) {
            return <AttendanceMarking session={selectedSession} onBack={() => setSelectedSession(null)} />;
        }

        switch (activeTab) {
            case 'home': return <FacultyHomeTab profile={profile} status={status} schedule={schedule} />;
            case 'schedule': return (
                <FacultyScheduleTab
                    schedule={schedule}
                    assignments={assignments}
                    onBack={() => setActiveTab('home')}
                    onClassClick={(session) => setSelectedSession(session)}
                />
            );
            case 'history': return (
                <FacultyHistoryTab
                    onBack={() => setActiveTab('home')}
                    onEditClass={(session) => setSelectedSession(session)}
                />
            );
            default: return <FacultyHomeTab profile={profile} status={status} schedule={schedule} />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-gray-900">
            <Helmet>
                <title>Faculty Dashboard | SFM System</title>
            </Helmet>
            <Toaster position="top-center" richColors />

            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={profile} onLogout={logout} role="faculty" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl shadow-lg shadow-purple-200 flex items-center justify-center text-white shrink-0">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">SFM Faculty</h1>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">Academic Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setIsScannerOpen(true); setScannedProfile(null); }}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-bold text-xs shadow-md shadow-purple-200"
                    >
                        <ScanLine size={14} />
                        SCAN ID
                    </button>
                    <NotificationDropdown currentUser={currentUser} role="faculty" dept={profile?.dept} />
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-50 to-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shadow-sm"
                    >
                        {profile?.name?.charAt(0) || <User size={18} />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-20 pb-24 px-4 md:px-6 max-w-lg mx-auto w-full md:max-w-3xl lg:max-w-5xl">
                <div className="animate-in fade-in zoom-in duration-500">
                    {renderContent()}
                </div>
            </main>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col fixed left-0 top-[73px] bottom-0 w-64 bg-white border-r border-gray-200 pt-6 px-4 z-20">
                <nav className="space-y-2 flex-1">
                    <SidebarItem id="home" label="Overview" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="schedule" label="Teaching Schedule" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="history" label="Attendance Log" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>
                <div className="pb-8">
                    {/* Sign Out removed as per user request */}
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl z-40 flex justify-between items-center px-4 py-2 ring-1 ring-gray-900/5">
                <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="schedule" label="Schedule" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Mobile Scan Button */}
                <div className="relative -top-6">
                    <button
                        onClick={() => { setIsScannerOpen(true); setScannedProfile(null); }}
                        className="w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg shadow-purple-300 border-4 border-slate-50 flex items-center justify-center transform hover:scale-105 transition-transform"
                    >
                        <ScanLine size={24} />
                    </button>
                </div>

                <NavTab id="history" label="History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="w-10"></div> {/* Spacer for symmetry if needed, or just 3 tabs + scanner */}
            </nav>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <button onClick={() => setIsScannerOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 transition-colors">
                            <LogOut size={24} className="rotate-180" />
                        </button>

                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ScanLine className="text-purple-600" /> Student Lookup
                        </h2>

                        {scannedProfile ? (
                            <StudentDetailModal
                                student={scannedProfile}
                                onClose={() => { setScannedProfile(null); setIsScannerOpen(false); }}
                                onScanAnother={() => { setScannedProfile(null); setManualId(''); }}
                            />
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="bg-black rounded-lg overflow-hidden h-64 border-2 border-purple-500 relative shadow-inner">
                                    {!scanLoading && (
                                        <QrScanner onScan={handleLookup} onError={(e) => console.log(e)} />
                                    )}
                                    <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-lg pointer-events-none animate-pulse"></div>
                                    {scanLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white font-bold animate-pulse">
                                            Searching Database...
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-gray-500">Or type Roll No</span>
                                    </div>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); if (manualId) handleLookup(manualId); }} className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none uppercase font-mono"
                                        placeholder="e.g. 23WJ1A0..."
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value.toUpperCase())}
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-black"
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SidebarItem({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-gray-600 hover:bg-gray-50'
                }`}
        >
            <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-600'} />
            <span className="font-semibold">{label}</span>
        </button>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-16 ${isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-purple-50 -translate-y-2 shadow-sm' : ''
                }`}>
                <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'
                }`}>
                {label}
            </span>
            {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-purple-600 rounded-full"></span>
            )}
        </button>
    );
}
