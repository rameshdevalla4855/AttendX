import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ShieldCheck, MapPin, Clock, Calendar, ChevronRight, Zap, TrendingUp, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import VisitorRequestCard from './VisitorRequestCard';
import AttendanceDetailModal from './AttendanceDetailModal';

// ... imports remain the same

export default function StudentHomeTab({ profile, status, timetable, attendanceStats }) {
    const { currentUser } = useAuth();
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // ... helper functions (getDayName, etc.) remain same ...
    const getDayName = () => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date().getDay()];
    };

    const today = getDayName();
    const todaysClasses = timetable ? (timetable[today] || []) : [];

    // Logic to find Active and Next Class
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr) => {
        if (!timeStr) return -1;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    const getMinutes = (timeStr) => {
        if (!timeStr) return 0;
        // Check if 24h or 12h
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            return parseTime(timeStr);
        }
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    let activeClass = null;
    let nextClass = null;

    if (todaysClasses.length > 0) {
        // Sort by start time just in case
        const sortedClasses = [...todaysClasses].sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

        for (const cls of sortedClasses) {
            const start = getMinutes(cls.startTime);
            const end = getMinutes(cls.endTime);

            if (currentTime >= start && currentTime < end) {
                activeClass = cls;
            } else if (currentTime < start) {
                if (!nextClass) nextClass = cls; // First one found is the next one
            }
        }
    }

    // Receive stats
    const { percentage, total } = attendanceStats || { percentage: 0, total: 0 };

    return (
        <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700 font-sans">
            <AttendanceDetailModal
                isOpen={isAnalyticsOpen}
                onClose={() => setIsAnalyticsOpen(false)}
                stats={attendanceStats}
            />

            {/* Visitor Requests */}
            <VisitorRequestCard currentUser={currentUser} profile={profile} />

            {/* 1. Welcome Header (Optional/integrated) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Hello, {profile?.name?.split(' ')[0] || 'Student'}! 👋
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">{dateString}</p>
                </div>
            </div>

            {/* 2. Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* A. Identity Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3730A3] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group flex flex-row items-center justify-between border border-white/10 transition-transform duration-500 hover:scale-[1.01]">
                    {/* Background Blobs */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl group-hover:bg-white/15 transition-all duration-1000"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/20 blur-3xl"></div>

                    {/* Noise Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                    {/* Left: Info */}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px] flex-1">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase border border-white/10 text-indigo-100 shadow-inner">
                                    Student ID
                                </span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-2 text-white drop-shadow-sm leading-none">
                                {profile?.name || 'Loading...'}
                            </h2>
                            <p className="text-indigo-200 font-mono text-sm opacity-90 tracking-wide">{profile?.rollNumber}</p>
                        </div>

                        <div className="flex flex-col gap-1 mt-6">
                            <span className="text-indigo-300/80 text-[10px] font-bold uppercase tracking-widest">Department</span>
                            <span className="text-xl font-bold text-white tracking-tight">
                                {profile?.dept} <span className="text-indigo-400 font-light mx-1">/</span> {profile?.year} <span className="text-indigo-400 font-light mx-1">/</span> {profile?.section}
                            </span>
                        </div>
                    </div>

                    {/* Right: QR Code (Always Visible) */}
                    <div className="relative z-10 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl shadow-black/10 shrink-0 ml-6 transform group-hover:rotate-1 transition-transform duration-500">
                        <QRCodeCanvas value={currentUser?.uid || "N/A"} size={130} />
                    </div>
                </div>

                {/* B. Status / Next Class & Stats */}
                <div className="flex flex-col gap-6 md:col-span-1">

                    {/* Active/Next Class Card - Only if applicable */}
                    {(activeClass || nextClass) ? (
                        <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden flex flex-col justify-center group hover:shadow-[0_8px_30px_rgb(99,102,241,0.1)] transition-all duration-300 min-h-[140px]">
                            {activeClass ? (
                                <>
                                    <div className="absolute right-6 top-6 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-100"></div>
                                    <p className="text-[10px] text-green-600 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                        <Zap size={12} className="fill-green-600" /> Happening Now
                                    </p>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-1 group-hover:text-indigo-700 transition-colors">{activeClass.subject}</h3>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Room {activeClass.room}</p>
                                    <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full w-[60%]"></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                        <Clock size={12} /> Up Next
                                    </p>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-2 group-hover:text-indigo-700 transition-colors">{nextClass.subject}</h3>
                                    <div className="flex justify-between items-end mt-auto">
                                        <p className="text-slate-500 text-xs font-bold">{nextClass.startTime}</p>
                                        <span className="px-2 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 border border-slate-100 uppercase tracking-tighter">
                                            Room {nextClass.room}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}

                    {/* Stats Grid - Compact & Senior UI */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Attendance Card - Premium Mini */}
                        <button
                            onClick={() => setIsAnalyticsOpen(true)}
                            className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="relative mb-3">
                                <svg className="w-14 h-14 transform -rotate-90">
                                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-50" />
                                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * percentage) / 100} className={`${percentage >= 75 ? 'text-indigo-600' : 'text-rose-500'} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                                </svg>
                                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${percentage >= 75 ? 'text-indigo-600' : 'text-rose-600'}`}>{percentage}%</span>
                            </div>
                            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest group-hover:text-indigo-600 transition-colors">Attendance</span>
                        </button>

                        {/* Total Classes Card - Premium Mini */}
                        <div className="bg-white rounded-[2.5rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-3 text-indigo-600 group-hover:scale-110 transition-transform">
                                <BookOpen size={18} />
                            </div>
                            <span className="text-2xl font-black text-slate-900 leading-none mb-1">{total}</span>
                            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Total Classes</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
