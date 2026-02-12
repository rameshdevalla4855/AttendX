import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';
import UserProfile from '../components/UserProfile';
import { academicService } from '../services/academicService';
import { User, ShieldCheck, Calendar, Home, History, LogOut, BrainCircuit, ExternalLink } from 'lucide-react';

// Tabs
import StudentHomeTab from '../components/student/StudentHomeTab';
import StudentTimetableTab from '../components/student/StudentTimetableTab';
import StudentHistoryTab from '../components/student/StudentHistoryTab';
import LearnifyTab from '../components/student/LearnifyTab'; // Restored
import NotificationDropdown from '../components/common/NotificationDropdown';

export default function StudentDashboard() {
    const { currentUser, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percentage: 85 });
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [status, setStatus] = useState('OUTSIDE');
    const [prevStatus, setPrevStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('home');

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <StudentHomeTab profile={profile} status={status} timetable={timetable} attendanceStats={attendanceStats} />;
            case 'timetable': return <StudentTimetableTab timetable={timetable} profile={profile} onBack={() => setActiveTab('home')} />;
            case 'history': return <StudentHistoryTab onBack={() => setActiveTab('home')} />;
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
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-gray-900">
            <Helmet>
                <title>Student Dashboard | SFM System</title>
            </Helmet>
            <Toaster position="top-center" richColors />

            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={profile} onLogout={logout} />

            {/* Header - Sticky */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 shrink-0">
                        <ShieldCheck size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight hidden xs:block">SFM Student</h1>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight xs:hidden">SFM</h1>
                        <p className="text-xs text-gray-500 font-medium">My Campus</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NotificationDropdown currentUser={currentUser} role="student" dept={profile?.departmentGroup || profile?.dept} />

                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                    >
                        {profile?.name?.charAt(0) || <User size={20} />}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full md:ml-64 md:max-w-[calc(100%-16rem)]">
                <div className="animate-in fade-in zoom-in duration-500">
                    {renderContent()}
                </div>
            </main>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col fixed left-0 top-[73px] bottom-0 w-64 bg-white border-r border-gray-200 pt-6 px-4 z-20">
                <nav className="space-y-2 flex-1">
                    <SidebarItem id="home" label="Overview" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="timetable" label="My Timetable" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="history" label="Attendance History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <div className="px-4 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Learning</span>
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
                <div className="pb-8">
                   {/* Sign Out removed as per user request */}
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-40 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="timetable" label="Time" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="learnify" label="AI Tutor" icon={BrainCircuit} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="history" label="History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>
        </div>
    );
}

function SidebarItem({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
        >
            <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
            <span className="font-semibold">{label}</span>
        </button>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1 min-w-[4rem] transition-all duration-300 ${isActive ? 'text-indigo-600 -translate-y-1' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
            {isActive && <span className="w-1 h-1 bg-indigo-600 rounded-full absolute -bottom-2"></span>}
        </button>
    );
}
