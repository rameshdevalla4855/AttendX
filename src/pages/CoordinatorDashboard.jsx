import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { Layout, GitBranch, Users, LogOut, Calendar, User, Bell, PieChart, ScanLine } from 'lucide-react';
import UserProfile from '../components/UserProfile';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import QrScanner from '../components/QrScanner';
import StudentDetailModal from '../components/hod/StudentDetailModal';
import { Toaster, toast } from 'sonner';

// Tabs
import StructureManager from '../components/coordinator/StructureManager';
import FacultyMapper from '../components/coordinator/FacultyMapper';
import TimetableManager from '../components/coordinator/TimetableManager';
import NotificationManagerTab from '../components/hod/NotificationManagerTab';
import AttendanceStatusTab from '../components/hod/AttendanceStatusTab';

export default function CoordinatorDashboard() {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('structure');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profile, setProfile] = useState(null);

    // Scanner State
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannedProfile, setScannedProfile] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    const [manualId, setManualId] = useState('');

    // Fetch Profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    const q = query(collection(db, "coordinators"), where("email", "==", currentUser.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data());
                    }
                } catch (err) {
                    console.error("Error fetching Coordinator profile:", err);
                }
            }
        };
        fetchProfile();
    }, [currentUser]);

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
            toast.error(err.code === 'permission-denied'
                ? "Access Denied: Permission error."
                : `Error fetching details: ${err.message}`);
        } finally {
            setScanLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900 flex flex-col">
            <Helmet>
                <title>Coordinator Portal | SFM System</title>
            </Helmet>
            <Toaster position="top-center" richColors />

            {/* HEADER - Fixed Glass */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">SFM Admin</h1>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">Coordinator</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Global Scan Button */}
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
                        {profile?.name?.charAt(0) || <User size={18} />}
                    </button>
                </div>
            </header>

            <UserProfile
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                profile={profile}
                onLogout={logout}
                role="coordinator"
            />

            {/* MAIN CONTENT */}
            <main className="flex-1 pt-20 pb-28 px-4 md:px-6 max-w-7xl mx-auto w-full">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="min-h-[500px]">
                        {activeTab === 'structure' && <StructureManager profile={profile} />}
                        {activeTab === 'faculty' && <FacultyMapper profile={profile} />}
                        {activeTab === 'timetable' && <TimetableManager profile={profile} />}
                        {activeTab === 'status' && <AttendanceStatusTab profile={profile} />}
                        {activeTab === 'notify' && <NotificationManagerTab profile={profile} role="coordinator" />}
                    </div>
                </div>
            </main>

            {/* BOTTOM NAVIGATION */}
            <nav className="fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl z-40 flex justify-between items-center px-4 py-2 ring-1 ring-gray-900/5">
                <NavTab id="structure" label="Struct" icon={GitBranch} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="faculty" label="Faculty" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Mobile Scan Button */}
                <div className="relative -top-6">
                    <button
                        onClick={() => { setIsScannerOpen(true); setScannedProfile(null); }}
                        className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 border-4 border-slate-50 flex items-center justify-center transform hover:scale-105 transition-transform"
                    >
                        <ScanLine size={24} />
                    </button>
                </div>

                <NavTab id="timetable" label="Time" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="notify" label="Notify" icon={Bell} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>

            {/* STUDENT LOOKUP / SCANNER MODAL */}
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

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-14 ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-50 -translate-y-2 shadow-sm' : ''
                }`}>
                <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'
                }`}>
                {label}
            </span>
            {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
        </button>
    );
}
