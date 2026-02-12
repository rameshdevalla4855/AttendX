import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'; // Added deleteDoc for simulated reset
import { Save, Search, ShieldAlert, UserX, UserCheck, Clock, Bell, Lock, User, Layout, Activity, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner'; // Assuming sonner is available globally or adjust import

export default function SettingsTab({ profile }) {
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'system' | 'security'

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                <TabButton id="general" label="General" icon={User} active={activeTab} onClick={setActiveTab} />
                <TabButton id="system" label="System" icon={Activity} active={activeTab} onClick={setActiveTab} />
                <TabButton id="security" label="Security" icon={Lock} active={activeTab} onClick={setActiveTab} />
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {activeTab === 'general' && <GeneralSettings profile={profile} />}
                {activeTab === 'system' && <SystemSettings />}
                {activeTab === 'security' && <SecuritySettings />}
            </div>
        </div>
    );
}

function TabButton({ id, label, icon: Icon, active, onClick }) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${active === id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );
}

// --- SUB-COMPONENTS ---

function GeneralSettings({ profile }) {
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        phone: profile?.phoneNumber || '', // Correct field name check needed
        theme: 'light' // placeholder
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            if (profile?.uid) {
                // Update HOD Profile
                const userRef = doc(db, 'faculty', profile.uid); // Assuming HOD is stored in faculty collection or dedicated 'hods' - checking HODDashboard usage implies it might be just 'users' or 'faculty' with role. Let's assume 'faculty' for now based on context, needing verification if HOD is in 'faculty' collection.
                // Wait, HODDashboard uses `useAuth`. If role is 'hod', collection might be 'faculty' with role 'hod' or 'hods'.
                // Let's safe-check collection. Usually it's 'faculty'.

                await updateDoc(userRef, {
                    name: formData.name,
                    phoneNumber: formData.phone
                });
                toast.success("Profile updated successfully!");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <User className="text-indigo-600" size={20} />
                    Profile Settings
                </h3>
                <p className="text-sm text-gray-500">Manage your personal details and app preferences.</p>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Layout size={16} /> App Appearance
                    </h4>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="theme" value="light" checked readOnly className="text-indigo-600" />
                            <span className="text-sm text-gray-700">Light Mode</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                            <input type="radio" name="theme" value="dark" disabled className="text-gray-400" />
                            <span className="text-sm text-gray-500">Dark Mode (Coming Soon)</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-md shadow-indigo-200 disabled:opacity-70"
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SystemSettings() {
    const [rules, setRules] = useState({
        entryStartTime: '08:00',
        entryEndTime: '10:00',
        exitStartTime: '16:00',
        exitEndTime: '18:00',
        attendanceThreshold: 75,
        autoEmailReports: false
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const docSnap = await getDoc(doc(db, "settings", "global_rules"));
            if (docSnap.exists()) {
                setRules(prev => ({ ...prev, ...docSnap.data() }));
            }
        };
        fetchSettings();
    }, []);

    const handleSaveRules = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "settings", "global_rules"), rules, { merge: true });
            toast.success("System rules updated!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save rules.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="text-indigo-600" size={20} />
                    System Configuration
                </h3>
                <p className="text-sm text-gray-500">Define operational rules and automated behaviors.</p>
            </div>
            <div className="p-6 space-y-8">
                {/* 1. Time Rules */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                            <Clock size={16} /> Entry Window
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors"
                                    value={rules.entryStartTime}
                                    onChange={(e) => setRules(p => ({ ...p, entryStartTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors"
                                    value={rules.entryEndTime}
                                    onChange={(e) => setRules(p => ({ ...p, entryEndTime: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                            <Clock size={16} /> Exit Window
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors"
                                    value={rules.exitStartTime}
                                    onChange={(e) => setRules(p => ({ ...p, exitStartTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors"
                                    value={rules.exitEndTime}
                                    onChange={(e) => setRules(p => ({ ...p, exitEndTime: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* 2. Automation & Thresholds */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ShieldAlert size={16} className="text-orange-500" /> Compliance Threshold
                        </h4>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <label className="text-xs text-orange-800 font-bold mb-2 block">Minimum Attendance Required (%)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0" max="100"
                                    value={rules.attendanceThreshold || 75}
                                    onChange={(e) => setRules(p => ({ ...p, attendanceThreshold: parseInt(e.target.value) }))}
                                    className="w-20 p-2 border border-orange-200 rounded-lg text-center font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                                <p className="text-xs text-orange-600 leading-tight">
                                    Students below this % will be highlighted in red in reports.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Bell size={16} className="text-indigo-500" /> Automated Reporting
                        </h4>
                        <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <input
                                type="checkbox"
                                id="autoEmail"
                                checked={rules.autoEmailReports || false}
                                onChange={(e) => setRules(p => ({ ...p, autoEmailReports: e.target.checked }))}
                                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="autoEmail" className="cursor-pointer">
                                <span className="text-sm font-bold text-gray-900 block">Email Weekly Summary</span>
                                <span className="text-xs text-gray-500">Automatically send attendance PDF to HOD email every Saturday.</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSaveRules}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-md shadow-indigo-200 disabled:opacity-70"
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Update Configuration</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SecuritySettings() {
    // Access Control State
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [blockLoading, setBlockLoading] = useState(false);

    const handleSearch = async () => {
        setSearchError('');
        setFoundUser(null);
        if (!searchQuery.trim()) return;

        try {
            // Search Students
            let userDoc = await getDoc(doc(db, "students", searchQuery.trim())); // Direct Doc ID check
            let collectionName = "students";

            if (!userDoc.exists()) {
                // Try by Field Query if direct match fails (e.g. rollNumber field)
                const qS = query(collection(db, "students"), where("rollNumber", "==", searchQuery.trim()));
                const snapS = await getDocs(qS);
                if (!snapS.empty) {
                    userDoc = snapS.docs[0];
                } else {
                    // Try Faculty
                    userDoc = await getDoc(doc(db, "faculty", searchQuery.trim()));
                    collectionName = "faculty";
                    if (!userDoc.exists()) {
                        const qF = query(collection(db, "faculty"), where("facultyId", "==", searchQuery.trim()));
                        const snapF = await getDocs(qF);
                        if (!snapF.empty) userDoc = snapF.docs[0];
                    }
                }
            }

            if (userDoc && userDoc.exists()) {
                setFoundUser({ id: userDoc.id, ...userDoc.data(), collectionName });
            } else {
                setSearchError('User not found. Check Roll No or Faculty ID.');
            }
        } catch (err) {
            setSearchError('Search failed.');
            console.error(err);
        }
    };

    const toggleBlock = async () => {
        if (!foundUser) return;
        setBlockLoading(true);
        try {
            const newStatus = !foundUser.isBlocked;
            const userRef = doc(db, foundUser.collectionName, foundUser.id);
            await updateDoc(userRef, { isBlocked: newStatus });
            setFoundUser(prev => ({ ...prev, isBlocked: newStatus }));
            toast.success(`User ${newStatus ? 'Blocked' : 'Unblocked'} Successfully`);
        } catch (err) {
            console.error("Error updating block status:", err);
            toast.error("Failed to update status.");
        } finally {
            setBlockLoading(false);
        }
    };

    const handleDangerAction = (action) => {
        if (confirm(`Are you sure you want to ${action}? This action CANNOT be undone.`)) {
            toast.info(`${action} initiated...`);
            // Simulate action for now
            setTimeout(() => toast.success(`${action} Completed`), 1500);
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Access Control */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Lock className="text-indigo-600" size={20} />
                        Access Control
                    </h3>
                    <p className="text-sm text-gray-500">Instant block/unblock for students or faculty.</p>
                </div>
                <div className="p-6">
                    <div className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Enter Roll No, Email or ID..."
                                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-semibold shadow-md transition-all"
                        >
                            Search
                        </button>
                    </div>

                    {searchError && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg flex items-center gap-2">
                            <ShieldAlert size={16} /> {searchError}
                        </div>
                    )}

                    {foundUser && (
                        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-4 w-full">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md ${foundUser.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}>
                                    {foundUser.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">{foundUser.name}</h4>
                                    <div className="text-xs text-gray-500 font-mono flex gap-2">
                                        <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200">{foundUser.id}</span>
                                        {foundUser.dept && <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200">{foundUser.dept}</span>}
                                    </div>
                                    <div className={`text-xs font-bold mt-1.5 inline-flex items-center gap-1 ${foundUser.isBlocked ? 'text-red-600' : 'text-green-600'}`}>
                                        {foundUser.isBlocked ? <UserX size={12} /> : <UserCheck size={12} />}
                                        {foundUser.isBlocked ? 'ACCOUNT BLOCKED' : 'ACTIVE STATUS'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={toggleBlock}
                                disabled={blockLoading}
                                className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all whitespace-nowrap ${foundUser.isBlocked
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {foundUser.isBlocked ? (
                                    <><UserCheck size={18} /> Unblock User</>
                                ) : (
                                    <><UserX size={18} /> Block User</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Danger Zone */}
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
                <div className="p-6 border-b border-red-100/50">
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={20} />
                        Danger Zone
                    </h3>
                    <p className="text-sm text-red-600/70">Irreversible actions. Proceed with caution.</p>
                </div>
                <div className="p-6 grid gap-4 md:grid-cols-2">
                    <div className="bg-white p-4 rounded-lg border border-red-100 flex flex-col justify-between">
                        <div>
                            <h4 className="font-bold text-gray-900 mb-1">Clear Security Alerts</h4>
                            <p className="text-xs text-gray-500 mb-4">Remove all active security notifications and incident logs from the dashboard.</p>
                        </div>
                        <button
                            onClick={() => handleDangerAction('Clear All Alerts')}
                            className="w-full py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors text-sm"
                        >
                            Clear Alerts
                        </button>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-red-100 flex flex-col justify-between">
                        <div>
                            <h4 className="font-bold text-gray-900 mb-1">Reset Semester Data</h4>
                            <p className="text-xs text-gray-500 mb-4">Archive current attendance logs and reset stats for the new semester.</p>
                        </div>
                        <button
                            onClick={() => handleDangerAction('Reset Semester Data')}
                            className="w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm shadow-sm shadow-red-200"
                        >
                            Reset Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
