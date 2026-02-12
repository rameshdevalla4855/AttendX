import React, { useState, useEffect } from 'react';
import AttendanceStats from '../AttendanceStats';
import { Activity, Clock, ArrowUpRight, ArrowDownRight, User, Users, Plus, Zap, Filter, MoreHorizontal } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, LineChart, Line
} from 'recharts';

// Helper: Normalize Department Names for consistently matching
const normalizeDept = (dept) => {
    if (!dept) return '';
    const d = dept.toUpperCase().replace(/[^A-Z]/g, ''); // Remove special chars
    if (['AID', 'CSM', 'AIDS', 'AI&DS'].includes(d) || d.includes('ARTIFICIAL')) return 'AIDS';
    if (['CSE', 'CS'].includes(d) || d.includes('COMPUTER')) return 'CSE';
    return d;
};

export default function HomeTab({ profile }) {
    // Chart State
    const [trendData, setTrendData] = useState([]);
    const [loadingChart, setLoadingChart] = useState(true);

    // Visualization Controls
    const [timeRange, setTimeRange] = useState('weekly'); // 'weekly' | 'daily'
    const [chartType, setChartType] = useState('area'); // Default to Area for "Advanced" look

    // Live Feed State
    const [liveLogs, setLiveLogs] = useState([]);
    const [feedTab, setFeedTab] = useState('entry'); // 'entry' | 'exit'
    const [loadingFeed, setLoadingFeed] = useState(true);

    // 1. Fetch Weekly Trends
    useEffect(() => {
        const fetchTrends = async () => {
            if (!profile) return; // Wait for profile

            try {
                const today = new Date();
                const pastSevenDays = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    pastSevenDays.push(d.toLocaleDateString('en-CA'));
                }

                // Ideally one query with range, but client-side processing fine for Prototype
                const startDate = pastSevenDays[0];
                const q = query(collection(db, "attendanceLogs"), where("date", ">=", startDate));
                const querySnapshot = await getDocs(q);

                // Group by date
                const grouping = {};
                pastSevenDays.forEach(date => {
                    grouping[date] = { date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), Students: 0, Faculty: 0, uniqueS: new Set(), uniqueF: new Set() };
                });

                querySnapshot.docs.forEach(doc => {
                    const data = doc.data();

                    // FILTER BY DEPARTMENT (Normalized)
                    if (profile.dept && normalizeDept(data.dept) !== normalizeDept(profile.dept)) {
                        return; // Skip if dept doesn't match
                    }

                    const dateKey = data.date;
                    if (grouping[dateKey]) {
                        if (data.role === 'faculty') {
                            grouping[dateKey].uniqueF.add(data.uid);
                        } else {
                            grouping[dateKey].uniqueS.add(data.uid);
                        }
                    }
                });

                // Convert to array
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

    // 2. Fetch Live Live Feed
    useEffect(() => {
        if (!profile) return; // Wait for profile

        const todayStr = new Date().toLocaleDateString('en-CA');
        const q = query(
            collection(db, "attendanceLogs"),
            where("date", "==", todayStr)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(log => !profile.dept || normalizeDept(log.dept) === normalizeDept(profile.dept)); // Client-side Dept Filter

            // Client-side Sort & Limit
            logs.sort((a, b) => {
                const tA = a.timestamp?.toMillis() || 0;
                const tB = b.timestamp?.toMillis() || 0;
                return tB - tA; // Descending
            });

            setLiveLogs(logs); // store all for daily calc
            setLoadingFeed(false);
        }, (error) => {
            console.error("Live Feed Error:", error);
            setLoadingFeed(false);
        });

        return () => unsubscribe();
    }, [profile]);

    // Helper: Process Daily Hourly Trend
    const getDailyData = () => {
        const hourly = {};
        // Initialize typical college hours (8 AM to 6 PM)
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

    // Filter Logic for Feed
    const displayedLogs = liveLogs.slice(0, 50).filter(log =>
        feedTab === 'entry' ? log.type === 'ENTRY' : log.type === 'EXIT'
    );

    const renderChart = () => {
        const commonProps = { data: currentChartData, margin: { top: 10, right: 10, left: -20, bottom: 0 } };

        if (chartType === 'area') {
            return (
                <AreaChart {...commonProps}>
                    <defs>
                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFaculty" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="Students" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorStudents)" />
                    <Area type="monotone" dataKey="Faculty" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#colorFaculty)" />
                </AreaChart>
            );
        }

        return (
            <BarChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Students" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="Faculty" fill="#c084fc" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Header & Quick Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
                    <p className="text-gray-500 text-sm">Welcome back, {profile?.name || 'HOD'}. Here's what's happening today.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-semibold shadow-sm">
                        <Filter size={16} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-semibold shadow-md shadow-indigo-200">
                        <Plus size={16} /> New Report
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <AttendanceStats />

            {/* 3. Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Chart Card - Spans 2 cols */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <Activity className="text-indigo-500" size={20} /> Attendance Trends
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">Comparative analysis of Students vs Faculty</p>
                        </div>

                        <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button
                                onClick={() => { setTimeRange('weekly'); setChartType('bar'); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === 'weekly' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => { setTimeRange('daily'); setChartType('area'); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === 'daily' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Daily
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {loadingChart ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : currentChartData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                <Activity size={32} className="opacity-20" />
                                <span className="text-sm">No data available for this period</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {renderChart()}
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Live Feed Column */}
                <div className="flex flex-col gap-6 h-[400px]">

                    {/* Quick Actions Card */}
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Zap size={64} />
                        </div>
                        <h3 className="font-bold text-lg mb-1 relative z-10">Quick Actions</h3>
                        <p className="text-indigo-100 text-xs mb-4 relative z-10 max-w-[80%]">Manage your department efficiently with these shortcuts.</p>

                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 p-2 rounded-lg text-left transition-colors border border-white/10">
                                <div className="mb-1"><User size={16} /></div>
                                <div className="text-[10px] font-bold opacity-80">Add Student</div>
                            </button>
                            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 p-2 rounded-lg text-left transition-colors border border-white/10">
                                <div className="mb-1"><Users size={16} /></div>
                                <div className="text-[10px] font-bold opacity-80">Bulk Import</div>
                            </button>
                        </div>
                    </div>

                    {/* Live Feed Card (Fills remaining height) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Clock size={16} className="text-indigo-500" /> Live Feed
                            </h3>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setFeedTab('entry')}
                                    className={`w-2 h-2 rounded-full ${feedTab === 'entry' ? 'bg-green-500 ring-2 ring-green-100' : 'bg-gray-300 hover:bg-green-400'} transition-all`}
                                    title="Entries"
                                />
                                <button
                                    onClick={() => setFeedTab('exit')}
                                    className={`w-2 h-2 rounded-full ${feedTab === 'exit' ? 'bg-orange-500 ring-2 ring-orange-100' : 'bg-gray-300 hover:bg-orange-400'} transition-all`}
                                    title="Exits"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                            {loadingFeed ? (
                                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div></div>
                            ) : displayedLogs.length === 0 ? (
                                <div className="text-center py-12 opacity-50 text-sm text-gray-500">No {feedTab} logs today.</div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {displayedLogs.map((log) => (
                                        <div key={log.id} className="p-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors group cursor-default">
                                            <div className="flex gap-3 items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.type === 'ENTRY' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {log.type === 'ENTRY' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{log.name}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
