import React, { useState, useEffect } from 'react';
import { Activity, Clock, ArrowUpRight, ArrowDownRight, User, Users, Plus, Zap, Filter, MoreHorizontal, Target, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import DepartmentHeatmap from './DepartmentHeatmap';

// Helper: Normalize Department Names
const normalizeDept = (dept) => {
    if (!dept) return '';
    const d = dept.toUpperCase().replace(/[^A-Z]/g, '');
    if (['AID', 'CSM', 'AIDS', 'AI&DS'].includes(d) || d.includes('ARTIFICIAL')) return 'AIDS';
    if (['CSE', 'CS'].includes(d) || d.includes('COMPUTER')) return 'CSE';
    return d;
};

export default function HomeTab({ profile }) {
    const [trendData, setTrendData] = useState([]);
    const [loadingChart, setLoadingChart] = useState(true);
    const [timeRange, setTimeRange] = useState('weekly');
    const [chartType, setChartType] = useState('area');
    const [liveLogs, setLiveLogs] = useState([]);
    const [feedTab, setFeedTab] = useState('entry');
    const [loadingFeed, setLoadingFeed] = useState(true);

    // Faculty Submissions State
    const [facultyStatus, setFacultyStatus] = useState([]);
    const [loadingFaculty, setLoadingFaculty] = useState(true);

    // Advanced Stats State
    const [stats, setStats] = useState({
        totalStudents: 0,
        presentStudents: 0,
        facultyPresent: 0,
        healthScore: 0
    });

    // 1. Fetch Weekly Trends
    useEffect(() => {
        const fetchTrends = async () => {
            if (!profile) return;
            try {
                const today = new Date();
                const pastSevenDays = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    pastSevenDays.push(d.toLocaleDateString('en-CA'));
                }

                const startDate = pastSevenDays[0];
                const q = query(collection(db, "attendanceLogs"), where("date", ">=", startDate));
                const querySnapshot = await getDocs(q);

                const grouping = {};
                pastSevenDays.forEach(date => {
                    grouping[date] = { date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), Students: 0, Faculty: 0, uniqueS: new Set(), uniqueF: new Set() };
                });

                querySnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (profile.dept && normalizeDept(data.dept) !== normalizeDept(profile.dept)) return;

                    const dateKey = data.date;
                    if (grouping[dateKey]) {
                        if (data.role === 'faculty') grouping[dateKey].uniqueF.add(data.uid);
                        else grouping[dateKey].uniqueS.add(data.uid);
                    }
                });

                const chartData = Object.values(grouping).map(grp => ({
                    name: grp.date,
                    Students: grp.uniqueS.size,
                    Faculty: grp.uniqueF.size
                }));

                setTrendData(chartData);
                setLoadingChart(false);
            } catch (err) {
                console.error("Trend Query Error:", err);
                setLoadingChart(false);
            }
        };
        fetchTrends();
    }, [profile]);

    // 2. Live Feed & Stats
    useEffect(() => {
        if (!profile) return;
        const todayStr = new Date().toLocaleDateString('en-CA');
        const q = query(collection(db, "attendanceLogs"), where("date", "==", todayStr));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(log => !profile.dept || normalizeDept(log.dept) === normalizeDept(profile.dept));

            logs.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

            const currentStatus = new Map();
            logs.forEach(log => {
                if (!currentStatus.has(log.uid) || (log.timestamp?.toMillis() || 0) > (currentStatus.get(log.uid).timestamp?.toMillis() || 0)) {
                    currentStatus.set(log.uid, log);
                }
            });

            let presentS = 0;
            let presentF = 0;
            currentStatus.forEach(log => {
                if (log.type === 'ENTRY') {
                    if (log.role === 'faculty') presentF++;
                    else presentS++;
                }
            });

            setStats(prev => ({
                ...prev,
                presentStudents: presentS,
                facultyPresent: presentF,
                healthScore: Math.round((presentS / (presentS + 10)) * 100) // Mock logic for demo
            }));

            setLiveLogs(logs);
            setLoadingFeed(false);
        });

        return () => unsubscribe();
    }, [profile]);

    // 3. Fetch Faculty Submissions Tracker
    useEffect(() => {
        if (!profile) return;
        const todayStr = new Date().toLocaleDateString('en-CA');
        const dept = profile.dept || '';

        // Real-time listener for attendance periods
        const qPeriods = query(collection(db, "attendance_periods"), where("date", "==", todayStr));

        const unsubscribe = onSnapshot(qPeriods, async (snapshot) => {
            try {
                // 1. Get all assignments for this department
                const assignmentsRef = collection(db, "faculty_assignments");
                const qAssign = query(assignmentsRef, where("branch", "==", dept), where("isActive", "==", true));
                const assignSnap = await getDocs(qAssign);
                const assignments = assignSnap.docs.map(d => d.data());

                const submitted = snapshot.docs.map(doc => doc.data());

                // 2. Map Faculty to their submission status
                const facultyMap = {};
                assignments.forEach(a => {
                    const fid = a.facultyId;
                    if (!facultyMap[fid]) {
                        facultyMap[fid] = {
                            name: a.facultyName,
                            email: a.facultyEmail || fid,
                            assigned: 0,
                            submitted: 0,
                            classes: []
                        };
                    }
                    facultyMap[fid].assigned++;

                    // Check if submitted for this specific subject/year/section
                    const isSubmitted = submitted.some(s =>
                        s.facultyId === fid &&
                        s.subjectCode === a.subjectCode &&
                        s.year === a.year &&
                        s.section === a.section
                    );

                    if (isSubmitted) facultyMap[fid].submitted++;
                    facultyMap[fid].classes.push({
                        subject: a.subjectName,
                        class: `${a.year}-${a.section}`,
                        status: isSubmitted ? 'COMPLETED' : 'PENDING'
                    });
                });

                setFacultyStatus(Object.values(facultyMap));
                setLoadingFaculty(false);
            } catch (err) {
                console.error("Faculty Tracker Error:", err);
                setLoadingFaculty(false);
            }
        });

        return () => unsubscribe();
    }, [profile]);

    const getDailyData = () => {
        const hourly = {};
        for (let i = 8; i <= 18; i++) {
            const hourLabel = i > 12 ? `${i - 12} PM` : (i === 12 ? '12 PM' : `${i} AM`);
            hourly[i] = { name: hourLabel, Students: 0, Faculty: 0, sort: i };
        }
        liveLogs.forEach(log => {
            if (log.type === 'ENTRY' && log.timestamp) {
                const date = log.timestamp.toDate();
                const hour = date.getHours();
                if (hour >= 8 && hour <= 18) {
                    if (log.role === 'faculty') hourly[hour].Faculty++;
                    else hourly[hour].Students++;
                }
            }
        });
        return Object.values(hourly).sort((a, b) => a.sort - b.sort);
    };

    const currentChartData = timeRange === 'weekly' ? trendData : getDailyData();
    const displayedLogs = liveLogs.slice(0, 10).filter(log => feedTab === 'entry' ? log.type === 'ENTRY' : log.type === 'EXIT');

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. Welcome & Time Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">HOD Command Center</h2>
                    <p className="text-slate-500 font-medium mt-1">
                        Welcome back, <span className="text-indigo-600 font-bold">{profile?.name || 'Academic Lead'}</span>. Monitoring {profile?.dept || 'Department'} pulse.
                    </p>
                </div>
                <div className="hidden lg:flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 ring-4 ring-slate-50">
                    <div className="px-4 py-2 bg-indigo-50 rounded-xl text-indigo-700 font-bold text-xs flex items-center gap-2">
                        <Clock size={14} /> LIVE STATUS
                    </div>
                    <div className="px-4 py-2 font-black text-slate-800 text-xs tracking-wider">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {/* 2. Advanced Stat Cards */}
            <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6">
                <StatCard
                    label="Students"
                    value={stats.presentStudents}
                    icon={Users}
                    color="from-indigo-600 to-indigo-700"
                    trend="+12% vs avg"
                />
                <StatCard
                    label="Faculty"
                    value={stats.facultyPresent}
                    icon={Target}
                    color="from-emerald-500 to-teal-600"
                    trend="Full Attendance"
                />
                <StatCard
                    label="Health"
                    value={`${stats.healthScore}%`}
                    icon={ShieldCheck}
                    color="from-violet-500 to-purple-600"
                    trend="Optimal"
                />
                <StatCard
                    label="Alerts"
                    value="0"
                    icon={AlertCircle}
                    color="from-rose-500 to-pink-600"
                    trend="All Clear"
                />
            </div>

            {/* 3. Main Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">

                {/* A. Analytics Central (Bento Piece 1) */}
                <div className="lg:col-span-8 bg-white/70 backdrop-blur-xl border border-white rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 shadow-2xl shadow-slate-200/50 flex flex-col h-[300px] sm:h-[500px] relative overflow-hidden group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>

                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                                Attendance Velocity
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time engagement tracking</p>
                        </div>
                        <div className="flex bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200">
                            {[
                                { id: 'weekly', label: 'WEEK' },
                                { id: 'daily', label: 'DAY' }
                            ].map(range => (
                                <button
                                    key={range.id}
                                    onClick={() => setTimeRange(range.id)}
                                    className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all duration-500 ${timeRange === range.id ? 'bg-white shadow-xl text-indigo-600 scale-100' : 'text-slate-400 hover:text-slate-800 scale-95'}`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="Students" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorStudents)" />
                                <Area type="monotone" dataKey="Faculty" stroke="#c084fc" strokeWidth={4} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* B. Live Activity & Health (Side Bento Pieces) */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Dept Health Meter */}
                    <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 lg:p-8 text-white relative overflow-hidden flex flex-col justify-between group shadow-2xl shadow-indigo-900/20">
                        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                            <Activity size={60} className="sm:w-[100px] sm:h-[100px]" />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-indigo-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-2">Dept Health Index</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl sm:text-5xl font-black">{stats.healthScore}%</span>
                                <span className="text-emerald-400 text-[10px] sm:text-xs font-bold">+2.4%</span>
                            </div>
                        </div>
                        <div className="space-y-4 relative z-10">
                            <div className="h-2 sm:h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats.healthScore}%` }}
                                ></div>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase leading-relaxed line-clamp-2">System monitoring indicates optimal operational health within your sectors.</p>
                        </div>
                    </div>


                    {/* Live Terminal Feed */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 flex-1 flex flex-col overflow-hidden shadow-xl shadow-slate-200/30">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Live Logs
                            </h4>
                            <div className="flex bg-slate-100 p-0.5 rounded-xl">
                                <button
                                    onClick={() => setFeedTab('entry')}
                                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${feedTab === 'entry' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >
                                    ENTRIES
                                </button>
                                <button
                                    onClick={() => setFeedTab('exit')}
                                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${feedTab === 'exit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >
                                    EXITS
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pr-2">
                            {loadingFeed ? (
                                <div className="flex justify-center items-center h-full opacity-20"><Activity className="animate-spin" /></div>
                            ) : displayedLogs.length === 0 ? (
                                <div className="text-center py-10 opacity-30 font-black text-[10px] uppercase tracking-widest">No Activity Records</div>
                            ) : (
                                displayedLogs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${log.type === 'ENTRY' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                                                {log.type === 'ENTRY' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800 truncate max-w-[120px]">{log.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{log.role}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors">
                                            {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, trend }) {
    return (
        <div className={`bg-gradient-to-br ${color} p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] text-white shadow-xl shadow-indigo-200/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <Icon size={40} className="sm:w-20 sm:h-20" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-6">
                    <Icon size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                    <h3 className="text-lg sm:text-3xl font-black mb-0.5 sm:mb-1 tracking-tight">{value}</h3>
                    <p className="text-[8px] sm:text-xs text-white/70 font-bold uppercase tracking-widest leading-tight">{label}</p>
                </div>
                <div className="hidden sm:flex mt-4 pt-4 border-t border-white/10 items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest bg-white/20 px-2 py-1 rounded-lg uppercase">{trend}</span>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500" />
                </div>
            </div>
        </div>
    );
}

function ArrowRight({ size, className }) {
    return (
        <svg
            width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" className={className}
        >
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    );
}

