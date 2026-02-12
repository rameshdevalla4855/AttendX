import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Users, Clock, Calendar, ArrowRight, Activity, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { academicService } from '../../services/academicService';

export default function CoordinatorHomeTab({ profile, setActiveTab }) {
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeFaculty: 0,
        todayClasses: 0,
        avgAttendance: 0
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const coordinatorDept = profile?.dept || profile?.branch;

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Structure to get relevant branches
                const structure = await academicService.getStructure();
                let myBranches = structure?.branches || [];

                if (coordinatorDept) {
                    if (structure.departmentMap?.[coordinatorDept]) {
                        myBranches = structure.departmentMap[coordinatorDept];
                    } else if (myBranches.includes(coordinatorDept)) {
                        myBranches = [coordinatorDept];
                    }
                }

                // 2. Fetch Stats (Approximation for simplicity/performance)
                // In a real app, these would be aggregated counters or separate queries
                // For now, we'll just show placeholders or fetch minimal data

                // Get Students Count (Approx via one query if possible, or just skip for now to save reads)
                // Let's settle for "Managed Branches" count instead of students for speed

                // Get Today's Classes
                const today = new Date().toLocaleDateString('en-CA');
                const qClasses = query(collection(db, 'attendance_periods'), where('date', '==', today));
                const snapClasses = await getDocs(qClasses);
                const myClasses = snapClasses.docs.filter(d => myBranches.includes(d.data().branch));

                const totalClasses = myClasses.length;
                const totalAttendance = myClasses.reduce((acc, curr) => {
                    const records = curr.data().records || {};
                    const total = Object.keys(records).length;
                    const present = Object.values(records).filter(s => s === 'P').length;
                    return acc + (total > 0 ? (present / total) * 100 : 0);
                }, 0);
                const avg = totalClasses > 0 ? Math.round(totalAttendance / totalClasses) : 0;

                setStats({
                    totalStudents: 'N/A', // Omitted to save reads
                    activeFaculty: myBranches.length, // Showing Branches count instead
                    todayClasses: totalClasses,
                    avgAttendance: avg
                });

                // 3. Fetch Recent Activity (Global Logs filtered by Student Branch? Too expensive)
                // Instead, let's fetch recent *Class Submissions* which is more relevant for Coordinator
                // Reuse the 'myClasses' but sorted? No, 'attendance_periods' query above wasn't sorted.
                // Let's just limit to 5 latest classes
                const classesData = myClasses.map(d => ({ id: d.id, ...d.data() }));
                classesData.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                setRecentLogs(classesData.slice(0, 5));

            } catch (err) {
                console.error("Error loading home data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile, coordinatorDept]);

    const QuickAction = ({ icon: Icon, label, desc, onClick, color }) => (
        <button
            onClick={onClick}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group w-full text-left"
        >
            <div className={`p-2 rounded-lg mb-3 transition-colors ${color} text-white`}>
                <Icon size={20} />
            </div>
            <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{label}</h4>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Hello, {profile?.name?.split(' ')[0] || 'Coordinator'} 👋
                    </h1>
                    <p className="text-gray-500">Here's what's happening in <span className="font-semibold text-indigo-600">{coordinatorDept || 'Your Department'}</span> today.</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm text-gray-600">
                    <Calendar size={16} className="text-indigo-500" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Today's Classes"
                    value={stats.todayClasses}
                    icon={BookOpen}
                    color="bg-blue-500"
                    loading={loading}
                />
                <StatCard
                    label="Avg Attendance"
                    value={`${stats.avgAttendance}%`}
                    icon={Activity}
                    color={stats.avgAttendance < 75 ? "bg-red-500" : "bg-green-500"}
                    loading={loading}
                />
                <StatCard
                    label="Active Branches"
                    value={stats.activeFaculty}
                    icon={Users}
                    color="bg-purple-500"
                    loading={loading}
                    subtext="Mapped to you"
                />
                <StatCard
                    label="Pending Alerts"
                    value="0"
                    icon={AlertCircle}
                    color="bg-orange-500"
                    loading={loading}
                    subtext="All clear"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Quick Actions & Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-indigo-600" /> Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <QuickAction
                                icon={BookOpen}
                                label="Monitor Classes"
                                desc="View today's live attendance"
                                onClick={() => setActiveTab('monitor')}
                                color="bg-indigo-600"
                            />
                            <QuickAction
                                icon={Calendar}
                                label="Manage Timetable"
                                desc="Update schedules & periods"
                                onClick={() => setActiveTab('timetable')}
                                color="bg-pink-600"
                            />
                            <QuickAction
                                icon={Users}
                                label="Map Faculty"
                                desc="Assign subjects to teachers"
                                onClick={() => setActiveTab('faculty')}
                                color="bg-orange-600"
                            />
                            <QuickAction
                                icon={Activity}
                                label="View Status"
                                desc="Check overall detailed reports"
                                onClick={() => setActiveTab('status')}
                                color="bg-teal-600"
                            />
                        </div>
                    </div>

                    {/* Recent Submissions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Recent Class Submissions</h3>
                            <button onClick={() => setActiveTab('monitor')} className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">Loading activity...</div>
                            ) : recentLogs.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No classes submitted yet today.</div>
                            ) : (
                                recentLogs.map((log) => (
                                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {log.branch}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{log.subjectName}</h4>
                                                <p className="text-xs text-gray-500">
                                                    Year {log.year} • {log.startTime} • {log.facultyName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${Object.values(log.records || {}).filter(s => s === 'P').length / Object.keys(log.records || {}).length < 0.75
                                                    ? 'bg-red-50 text-red-600'
                                                    : 'bg-green-50 text-green-600'
                                                }`}>
                                                {Object.keys(log.records || {}).length > 0
                                                    ? Math.round((Object.values(log.records || {}).filter(s => s === 'P').length / Object.keys(log.records || {}).length) * 100)
                                                    : 0
                                                }% Attendance
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Side Panel - Placeholder for Notices or Profile Summary */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                        <h3 className="font-bold text-lg mb-2">Coordinator Portal</h3>
                        <p className="text-indigo-100 text-sm mb-4">You have full access to manage structure, faculty, and timetables for your department.</p>
                        <button
                            onClick={() => setActiveTab('structure')}
                            className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-white hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            Configure Structure <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-800 mb-3">System Healthy</h3>
                        <div className="flex items-center gap-3 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                            <CheckCircle size={18} />
                            <span>All systems operational</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, loading, subtext }) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('bg-', 'text-')}`}>
                <Icon size={48} />
            </div>

            <div className="mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1"></div>
                ) : (
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
                )}
            </div>

            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${color} text-white shadow-sm`}>
                    <Icon size={14} />
                </div>
                {subtext && <span className="text-[10px] font-bold text-gray-400">{subtext}</span>}
            </div>
        </div>
    );
}
