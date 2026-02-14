import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';
import UserProfile from '../components/UserProfile';
import { academicService } from '../services/academicService';
import { User, ShieldCheck, Calendar, Home, History, LogOut, BrainCircuit, ExternalLink } from 'lucide-react';
import gniLogo from '../assets/gni-logo.png';

// Tabs
import StudentHomeTab from '../components/student/StudentHomeTab';
import StudentTimetableTab from '../components/student/StudentTimetableTab';
import StudentHistoryTab from '../components/student/StudentHistoryTab';
import LearnifyTab from '../components/student/LearnifyTab'; // Restored
import NotificationDropdown from '../components/common/NotificationDropdown';

// ... imports remain the same

export default function StudentDashboard() {
    // ... existing state and logic ...
    const { currentUser, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percentage: 85 });
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [status, setStatus] = useState('OUTSIDE');
    const [prevStatus, setPrevStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('home');

    // ... renderContent and useEffects remain same ...

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <StudentHomeTab profile={profile} status={status} timetable={timetable} attendanceStats={attendanceStats} />;
            case 'timetable': return <StudentTimetableTab timetable={timetable} profile={profile} onBack={() => setActiveTab('home')} />;
            case 'history': return <StudentHistoryTab profile={profile} onBack={() => setActiveTab('home')} />;
            case 'learnify': return <LearnifyTab />; // Restored
            default: return <StudentHomeTab profile={profile} status={status} timetable={timetable} attendanceStats={attendanceStats} />;
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    const q = query(collection(db, "students"), where("email", "==", currentUser.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                        setProfile(data);

                        const rawBranch = data.dept || data.branch || data.Branch || data.Depertment;
                        const rawYear = data.year || data.Year;

                        if (rawBranch && rawYear) {
                            const branch = rawBranch.toUpperCase();
                            const year = rawYear.toString().replace(/\D/g, '');
                            const section = data.section || "1";

                            if (branch && year) {
                                try {
                                    const [myClasses, myTimetable, myStats] = await Promise.all([
                                        academicService.getClassAssignments(branch, year, section),
                                        academicService.getTimetable(branch, year, section),
                                        academicService.getStudentOverallAttendance(branch, year, section, data.rollNumber, data.id)
                                    ]);

                                    setAssignments(myClasses);
                                    setTimetable(myTimetable?.schedule || {});
                                    setAttendanceStats(myStats);
                                } catch (e) {
                                    console.error("Error fetching academic data:", e);
                                }
                            }
                        }
                    }
                } catch (err) { console.error(err); }
            }
        };
        fetchProfile();
    }, [currentUser]);

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
                    const newStatus = lastLog.type === 'ENTRY' ? 'INSIDE' : 'OUTSIDE';

                    setStatus(newStatus);

                    if (prevStatus && prevStatus !== newStatus) {
                        if (newStatus === 'INSIDE') {
                            toast.success('Welcome to Campus! 🎓', {
                                description: `Entry recorded at ${new Date().toLocaleTimeString()}`,
                                duration: 4000,
                            });
                        } else {
                            toast.info('Goodbye! 👋', {
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


    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
            <Helmet>
                <title>Student Dashboard | AttendX</title>
            </Helmet>
            <Toaster position="top-center" richColors />

            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={profile} onLogout={logout} />

            {/* Header - Sticky Glass */}
            <header className="fixed top-0 left-0 right-0 h-[72px] bg-white/80 backdrop-blur-xl border-b border-indigo-50/50 z-30 px-6 flex justify-between items-center transition-all duration-300">
                <div className="flex items-center gap-4 flex-1">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-200/50 shrink-0 transform hover:scale-105 transition-transform duration-300">
                        <ShieldCheck size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none font-display">AttendX</h1>
                        <p className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase mt-1">My Campus Portal</p>
                    </div>
                </div>

                {/* Centered Logo - Always visible now */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <img src={gniLogo} alt="GNI Logo" className="h-11 sm:h-14 w-auto object-contain mix-blend-multiply" />
                </div>

                <div className="flex items-center gap-4 flex-1 justify-end">
                    <NotificationDropdown currentUser={currentUser} role="student" dept={profile?.departmentGroup || profile?.dept} />

                    <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="group relative"
                    >
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-50 flex items-center justify-center text-indigo-700 font-bold shadow-sm group-hover:border-indigo-200 transition-all overflow-hidden">
                            {/* Initials or User Icon */}
                            {profile?.name ? (
                                <span className="text-sm">{profile.name.charAt(0)}</span>
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full ring-2 ring-indigo-500 ring-offset-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pt-[72px] md:pl-72 w-full max-w-[1920px] mx-auto">
                <div className="p-6 md:p-10 max-w-7xl mx-auto w-full pb-28 md:pb-10">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                        {renderContent()}
                    </div>
                </div>
            </main>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-indigo-50/50 pt-[72px] px-6 z-20">
                <div className="flex flex-col h-full py-8">
                    <nav className="space-y-2 flex-1">
                        <div className="px-3 mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Menu</span>
                        </div>
                        <SidebarItem id="home" label="Overview" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <SidebarItem id="timetable" label="My Timetable" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <SidebarItem id="history" label="Attendance History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />

                        <div className="pt-8 mt-6 border-t border-slate-50">
                            <div className="px-3 mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Academic AI</span>
                            </div>
                            <SidebarItem
                                id="learnify"
                                label="Learnify AI"
                                icon={BrainCircuit}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                isSpecial={true}
                            />
                        </div>
                    </nav>

                    {/* User Mini Profile in Sidebar Bottom */}
                    <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-sm">
                            {profile?.name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{profile?.name || 'Student'}</p>
                            <p className="text-xs text-slate-500 truncate">{profile?.rollNumber}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 4. Mobile Bottom Navigation - Glass Dock */}
            <nav className="md:hidden fixed bottom-5 left-5 right-5 bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl z-40 flex justify-between items-center px-4 py-2.5 ring-1 ring-gray-900/5">
                <NavTab id="home" label="Overview" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="timetable" label="Schedule" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Special Middle Button for History or AI */}
                <div className="relative -top-2">
                    <button
                        onClick={() => setActiveTab('learnify')}
                        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transform hover:scale-105 transition-all duration-300 ${activeTab === 'learnify' ? 'bg-indigo-600 text-white shadow-indigo-300' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                    >
                        <BrainCircuit size={22} className={activeTab === 'learnify' ? 'animate-pulse' : ''} />
                    </button>
                    {activeTab === 'learnify' && (
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Learnify</span>
                    )}
                </div>

                <NavTab id="history" label="History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Profile Trigger on Mobile too */}
                <button
                    onClick={() => setIsProfileOpen(true)}
                    className="flex flex-col items-center gap-1 transition-all duration-300 min-w-[3rem]"
                >
                    <div className="p-2 rounded-xl text-slate-400 hover:bg-slate-50">
                        <User size={22} />
                    </div>
                </button>
            </nav>
        </div>
    );
}

function SidebarItem({ id, label, icon: Icon, activeTab, setActiveTab, isSpecial }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                }`}
        >
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-100"></div>
            )}
            <Icon size={isSpecial ? 22 : 20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-indigo-600 group-hover:scale-110'}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`relative z-10 font-medium tracking-wide ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'} transition-transform duration-300`}>{label}</span>
        </button>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col items-center gap-1 transition-all duration-300 min-w-[3.5rem] group`}
        >
            <div className={`p-2.5 rounded-2xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-4 scale-110 rotate-2'
                : 'text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                }`}>
                <Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} />
            </div>

            <span className={`text-[10px] font-black transition-all duration-300 absolute -bottom-2 ${isActive ? 'opacity-100 translate-y-0 text-indigo-700 scale-100' : 'opacity-0 translate-y-2 scale-90'
                }`}>
                {label}
            </span>
        </button>
    );
}
