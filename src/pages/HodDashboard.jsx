import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
// import InitStructure from '../components/admin/InitStructure'; // Unused
import StructureManager from '../components/coordinator/StructureManager'; // Read-Only View
import { QrCode, Home, FileText, Settings, Upload, LogOut, ScanLine, BookOpen, Bell } from 'lucide-react';
import { db } from '../services/firebase';
import { Helmet } from 'react-helmet-async';
import gniLogo from '../assets/gni-logo.png';

// Import New Tab Components
import HomeTab from '../components/hod/HomeTab';
import AttendanceStatusTab from '../components/hod/AttendanceStatusTab';
import ImportDataTab from '../components/hod/ImportDataTab';
import SettingsTab from '../components/hod/SettingsTab';
import NotificationManagerTab from '../components/hod/NotificationManagerTab';
import UserProfile from '../components/UserProfile';
import QrScanner from '../components/QrScanner';
import StudentDetailModal from '../components/hod/StudentDetailModal';
import { Toaster } from 'sonner';

export default function HodDashboard() {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home'); // home | status | import | settings
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // HOD Profile State
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    const q = query(collection(db, "hods"), where("email", "==", currentUser.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data());
                    }
                } catch (err) {
                    console.error("Error fetching HOD profile:", err);
                }
            }
        };
        fetchProfile();
    }, [currentUser]);

    // Scanner / Lookup State
    const [scannedProfile, setScannedProfile] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    const [manualId, setManualId] = useState('');

    const handleLookup = async (id) => {
        if (!id) return;
        setScanLoading(true);
        setScannedProfile(null);

        try {
            let studentData = null;
            let studentId = id.trim().toUpperCase();

            // 1. Try Direct System ID (Roll No)
            const docRef = doc(db, "students", studentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                studentData = { ...docSnap.data(), id: docSnap.id };
            } else {
                // 2. Try Barcode ID (Bio Metric Code from ID Card)
                const studentsRef = collection(db, "students");
                // Check boolean/numeric matches too just in case? No, Firestore is strict types.
                // Assuming barcodeId is stored as string.
                const qBarcode = query(studentsRef, where("barcodeId", "==", id)); // Keep barcode raw in case it's case sensitive? usually numeric/code.
                const barcodeSnap = await getDocs(qBarcode);

                if (!barcodeSnap.empty) {
                    const d = barcodeSnap.docs[0];
                    studentData = { ...d.data(), id: d.id };
                    studentId = d.id;
                } else {
                    // 3. Try fallback RollNumber query (if doc ID is different from rollNo field)
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
                // Fetch Today's Log for Status
                const today = new Date().toLocaleDateString('en-CA');
                const logsRef = collection(db, "attendanceLogs");
                // Use the resolved studentId (Roll No) for log lookup
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
                alert(`Student not found for ID: ${id}`);
            }
        } catch (err) {
            console.error("Lookup failed", err);
            alert("Error fetching details");
        } finally {
            setScanLoading(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <HomeTab profile={profile} />;
            case 'structure': return <StructureManager readOnly={true} profile={profile} />;
            case 'status': return <AttendanceStatusTab profile={profile} />;
            case 'import': return <ImportDataTab />;
            case 'notify': return <NotificationManagerTab profile={profile} />;
            case 'settings': return <SettingsTab profile={profile} />;
            default: return <HomeTab profile={profile} />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-gray-900">
            <Helmet>
                <title>HOD Command Center | AttendX</title>
            </Helmet>
            <Toaster position="top-center" richColors />

            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={profile} onLogout={logout} role="hod" />

            {/* 1. Top Header - Fixed Glass */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white shrink-0">
                        <QrCode size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">AttendX HOD</h1>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">Control Center</p>
                    </div>
                </div>

                {/* Centered Logo */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
                    <img src={gniLogo} alt="GNI Logo" className="h-12 w-auto object-contain mix-blend-multiply" />
                </div>

                <div className="flex items-center gap-3 flex-1 justify-end">
                    <button
                        onClick={() => { setIsScannerOpen(true); setScannedProfile(null); }}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold text-xs shadow-md shadow-indigo-200"
                    >
                        <ScanLine size={14} />
                        SCAN ID
                    </button>
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                    >
                        {profile?.name?.charAt(0) || <QrCode size={18} />}
                    </button>
                </div>
            </header>

            {/* 2. Desktop Sidebar - Fixed Left */}
            <aside className="hidden md:flex flex-col fixed left-0 top-[73px] bottom-0 w-64 bg-white border-r border-gray-200 pt-6 px-4 z-20">
                <nav className="space-y-2 flex-1">
                    <div className="mb-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Overview</div>
                    <SidebarItem id="home" label="Dashboard" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="status" label="Attendance Status" icon={FileText} activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="mt-8 mb-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Management</div>
                    <SidebarItem id="structure" label="Academic Structure" icon={BookOpen} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="import" label="Import Data" icon={Upload} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="notify" label="Notifications" icon={Bell} activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="mt-8 mb-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">System</div>
                    <SidebarItem id="settings" label="Settings" icon={Settings} activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>
            </aside>

            {/* 3. Main Content Area */}
            <main className="flex-1 pt-20 pb-28 md:pl-72 px-4 md:px-6 max-w-[1600px] w-full mx-auto">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderContent()}
                </div>
            </main>

            {/* 4. Mobile Bottom Navigation - Glass Dock */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl z-40 flex justify-between items-center px-4 py-2 ring-1 ring-gray-900/5">
                <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="status" label="Status" icon={FileText} activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Mobile Scan Button - Floating Center */}
                <div className="relative -top-6">
                    <button
                        onClick={() => { setIsScannerOpen(true); setScannedProfile(null); }}
                        className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 border-4 border-slate-50 flex items-center justify-center transform hover:scale-105 transition-transform"
                    >
                        <ScanLine size={24} />
                    </button>
                </div>

                <NavTab id="notify" label="Notify" icon={Bell} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="settings" label="Settings" icon={Settings} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>

            {/* SCANNER MODAL */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <button onClick={() => setIsScannerOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 transition-colors">
                            <LogOut size={24} className="rotate-180" />
                        </button>

                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ScanLine className="text-indigo-600" /> Student Lookup
                        </h2>

                        {scannedProfile ? (
                            <StudentDetailModal
                                student={scannedProfile}
                                onClose={() => { setScannedProfile(null); setIsScannerOpen(false); }}
                                onScanAnother={() => { setScannedProfile(null); setManualId(''); }}
                            />
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="bg-black rounded-lg overflow-hidden h-64 border-2 border-indigo-500 relative shadow-inner">
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
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
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

// Sidebar Item Component (Premium Style)
function SidebarItem({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3.5 w-full px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 ring-1 ring-indigo-500/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            <Icon size={20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'}`} />
            <span className={`font-bold relative z-10 text-sm tracking-wide ${isActive ? '' : 'font-medium'}`}>{label}</span>

            {!isActive && (
                <div className="absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-slate-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            )}
        </button>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col items-center gap-1 transition-all duration-300 min-w-[4rem] group`}
        >
            <div className={`p-2.5 rounded-2xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-4 scale-110 rotate-3'
                : 'text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                }`}>
                <Icon size={isActive ? 22 : 24} strokeWidth={isActive ? 2.5 : 2} />
            </div>

            <span className={`text-[10px] font-bold transition-all duration-300 absolute -bottom-2 ${isActive ? 'opacity-100 translate-y-0 text-indigo-700 scale-100' : 'opacity-0 translate-y-2 scale-90'
                }`}>
                {label}
            </span>
        </button>
    );
}
