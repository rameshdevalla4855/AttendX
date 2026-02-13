import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { ScanLine, List, AlertTriangle, User, Shield, Home } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import gniLogo from '../assets/gni-logo.png';

// Import Security Tabs
import SecurityHomeTab from '../components/security/SecurityHomeTab';
import ScannerTab from '../components/security/ScannerTab';
import LogsTab from '../components/security/LogsTab';
import AlertsTab from '../components/security/AlertsTab';
import UserProfile from '../components/UserProfile';

export default function SecurityDashboard() {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home'); // home | scan | logs | alerts
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profile, setProfile] = useState(null);

    // Fetch Security Profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    const q = query(collection(db, "security"), where("email", "==", currentUser.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data());
                    }
                } catch (err) {
                    console.error("Error fetching Security profile:", err);
                }
            }
        };
        fetchProfile();
    }, [currentUser]);

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <SecurityHomeTab onNavigate={setActiveTab} />;
            case 'scan': return <ScannerTab currentUser={currentUser} />;
            case 'logs': return <LogsTab />;
            case 'alerts': return <AlertsTab />;
            default: return <SecurityHomeTab onNavigate={setActiveTab} />;
        }
    };

    return (
        <div className="flex h-screen bg-black font-sans text-gray-900 overflow-hidden">
            <Helmet>
                <title>Security Command | AttendX</title>
            </Helmet>

            <UserProfile
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                profile={profile}
                onLogout={logout}
                role="security"
            />

            {/* Sidebar Navigation - Desktop Only */}
            <aside className="hidden md:flex w-24 bg-white border-r border-gray-200 z-30 flex-col items-center py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                {/* Logo / Brand */}
                <div className="mb-8 p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <Shield size={28} />
                </div>

                {/* Nav Items */}
                <nav className="flex-1 flex flex-col gap-6 w-full px-2">
                    <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />

                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`p-4 rounded-xl shadow-lg border-2 transition-all active:scale-95 flex flex-col items-center gap-1 ${activeTab === 'scan'
                            ? 'bg-indigo-600 text-white border-transparent shadow-indigo-200 ring-2 ring-indigo-200 ring-offset-2'
                            : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-100 hover:text-indigo-500'
                            }`}
                    >
                        <ScanLine size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Scan</span>
                    </button>

                    <NavTab id="logs" label="Logs" icon={List} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <NavTab id="alerts" label="Alerts" icon={AlertTriangle} activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto">
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-all"
                    >
                        {profile?.name ? (
                            <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white">
                                {profile.name.charAt(0)}
                            </div>
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <User size={20} />
                            </div>
                        )}
                    </button>
                </div>
            </aside>


            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col relative overflow-hidden transition-colors duration-500 ${activeTab === 'scan' ? 'bg-black' : 'bg-slate-50'}`}>

                {/* Header Overlay for Scanner, Solid for others */}
                <header className={`px-6 py-4 flex justify-between items-center z-20 ${activeTab === 'scan' ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent text-white' : 'bg-white border-b border-gray-200 text-gray-900'
                    }`}>
                    <div className="flex items-center gap-3 flex-1">
                        {/* Mobile Profile Toggle */}
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="md:hidden w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden"
                        >
                            {profile?.name ? profile.name.charAt(0) : <User size={16} />}
                        </button>

                        <div>
                            <h1 className="font-bold tracking-tight text-xl md:text-2xl">Main Gate Control</h1>
                            <p className={`text-xs font-medium ${activeTab === 'scan' ? 'text-white/60' : 'text-gray-400'}`}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Centered Logo */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
                        <img src={gniLogo} alt="GNI Logo" className={`h-12 w-auto object-contain ${activeTab === 'scan' ? 'brightness-0 invert' : 'mix-blend-multiply'}`} />
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">
                        {/* Status Indicator */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${activeTab === 'scan' ? 'bg-white/10 border-white/20 text-white' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            LIVE
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 relative overflow-hidden flex flex-col pb-24 md:pb-0">
                    {renderContent()}
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-40 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />

                    {/* Floating Scan Button */}
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`-mt-8 p-4 rounded-full shadow-lg border-4 border-slate-50 transition-transform active:scale-95 ${activeTab === 'scan'
                            ? 'bg-indigo-600 text-white shadow-indigo-300'
                            : 'bg-white text-indigo-600'
                            }`}
                    >
                        <ScanLine size={24} />
                    </button>

                    <NavTab id="logs" label="Logs" icon={List} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <NavTab id="alerts" label="Alerts" icon={AlertTriangle} activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>

            </div>
        </div>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl w-full transition-all group ${isActive ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
        >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
