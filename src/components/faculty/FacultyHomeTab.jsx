import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Briefcase, MapPin, Clock, Calendar, CheckCircle, AlertCircle, Users, BookOpen, ChevronRight, LayoutDashboard, Coffee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function FacultyHomeTab({ profile, status, schedule }) {
    const { currentUser } = useAuth();

    // Date & Time
    const todayDate = new Date();
    const dateString = todayDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    const todayDay = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Schedule Logic
    const todaysClasses = schedule[todayDay] || [];
    const nextClass = todaysClasses?.find(c => {
        if (!c?.startTime) return false;
        const [h, m] = c.startTime.split(':');
        const classTime = new Date();
        classTime.setHours(h, m, 0);
        return classTime > new Date();
    });

    const activeClass = todaysClasses?.find(c => {
        if (!c?.startTime || !c?.endTime) return false;
        const [sh, sm] = c.startTime.split(':');
        const [eh, em] = c.endTime.split(':');
        const start = new Date(); start.setHours(sh, sm, 0);
        const end = new Date(); end.setHours(eh, em, 0);
        const now = new Date();
        return now >= start && now <= end;
    });

    // Sessions Progress
    const completedSessions = todaysClasses.filter(c => {
        if (!c?.endTime) return false;
        const [eh, em] = c.endTime.split(':');
        const end = new Date(); end.setHours(eh, em, 0);
        return new Date() > end;
    }).length;
    const progressPercentage = todaysClasses.length > 0 ? Math.round((completedSessions / todaysClasses.length) * 100) : 0;

    return (
        <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700 font-sans">
            {/* 1. Welcome Header - Refined */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Hello, {profile?.name?.split(' ')[0] || 'Professor'}! 👋
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">{dateString}</p>
                </div>
                <div className="hidden md:block">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ring-1 transition-all ${status === 'IN'
                        ? 'bg-green-50 text-green-700 ring-green-100 shadow-sm'
                        : 'bg-slate-50 text-slate-600 ring-slate-100'
                        }`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${status === 'IN' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {status === 'IN' ? 'On Campus' : 'Off Campus'}
                    </span>
                </div>
            </div>

            {/* 2. Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* A. Identity Card - Premium Alignment */}
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
                                    Faculty ID
                                </span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-2 text-white drop-shadow-sm leading-none">
                                {profile?.name || 'Loading...'}
                            </h2>
                            <p className="text-indigo-200 font-mono text-sm opacity-90 tracking-wide">{profile?.facultyId}</p>
                        </div>

                        <div className="flex flex-col gap-1 mt-6">
                            <span className="text-indigo-300/80 text-[10px] font-bold uppercase tracking-widest">Department</span>
                            <span className="text-xl font-bold text-white tracking-tight">
                                {profile?.dept || 'General'} <span className="text-indigo-400 font-light mx-1">/</span> {profile?.designation}
                            </span>
                        </div>
                    </div>

                    {/* Right: QR Code */}
                    <div className="relative z-10 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl shadow-black/10 shrink-0 ml-6 transform group-hover:rotate-1 transition-transform duration-500">
                        <QRCodeCanvas value={currentUser?.uid || "N/A"} size={130} />
                    </div>
                </div>

                {/* B. Stats & Session Card */}
                <div className="flex flex-col gap-6 md:col-span-1">

                    {/* Active/Next Class Card - SLEEK */}
                    {(activeClass || nextClass) ? (
                        <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden flex flex-col justify-center group hover:shadow-[0_8px_30px_rgb(99,102,241,0.1)] transition-all duration-300 min-h-[140px]">
                            {activeClass ? (
                                <>
                                    <div className="absolute right-6 top-6 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-100"></div>
                                    <p className="text-[10px] text-green-600 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                        <Zap size={12} className="fill-green-600" /> Session Ongoing
                                    </p>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-1 group-hover:text-indigo-700 transition-colors uppercase truncate">{activeClass.subject}</h3>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{activeClass.context}</p>
                                    <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full w-[70%]"></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                        <Clock size={12} /> Next Session
                                    </p>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-2 group-hover:text-indigo-700 transition-colors uppercase truncate">{nextClass.subject}</h3>
                                    <div className="flex justify-between items-end mt-auto">
                                        <p className="text-slate-500 text-xs font-bold">{nextClass.startTime}</p>
                                        <span className="px-2 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 border border-slate-100 uppercase tracking-tighter">
                                            {nextClass.context}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}

                    {/* Stats Grid - Premium Mini */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Session Progress - Premium Mini */}
                        <div className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                            <div className="relative mb-3">
                                <svg className="w-14 h-14 transform -rotate-90">
                                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-50" />
                                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * progressPercentage) / 100} className="text-indigo-600 transition-all duration-1000 ease-out" strokeLinecap="round" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-600">{progressPercentage}%</span>
                            </div>
                            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest group-hover:text-indigo-600 transition-colors">Daily Pulse</span>
                        </div>

                        {/* Total Sessions Card - Premium Mini */}
                        <div className="bg-white rounded-[2.5rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-3 text-indigo-600 group-hover:scale-110 transition-transform">
                                <BookOpen size={18} />
                            </div>
                            <span className="text-2xl font-black text-slate-900 leading-none mb-1">{todaysClasses.length}</span>
                            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Sessions</span>
                        </div>
                    </div>
                </div>

                {/* C. Teaching Timeline (Full Width) */}
                <div className="md:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-[0_2px_30px_rgb(0,0,0,0.02)] border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-slate-900 flex items-center gap-3 text-lg">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                <Users size={18} />
                            </div>
                            Today's Schedule
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todaysClasses.length > 0 ? todaysClasses.map((item, idx) => {
                            const isActive = activeClass === item;
                            return (
                                <div key={idx} className={`relative p-5 rounded-2xl border transition-all duration-300 group hover:-translate-y-1 ${isActive ? 'bg-purple-50 border-purple-200 shadow-lg shadow-purple-100' : 'bg-white border-slate-100 hover:border-purple-100 hover:shadow-md'
                                    }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${isActive ? 'bg-white text-purple-700 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                                            {item.startTime}
                                        </span>
                                        {isActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                    </div>

                                    <h4 className={`font-bold text-sm truncate mb-1 uppercase ${isActive ? 'text-purple-900' : 'text-slate-900'}`}>{item.subject}</h4>
                                    <p className="text-xs text-slate-500 font-medium truncate mb-4">{item.context}</p>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">Room {item.room || 'N/A'}</span>
                                        <ChevronRight size={14} className="text-slate-300 group-hover:text-purple-400 transition-colors" />
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="col-span-full text-center py-10 opacity-50 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <BookOpen size={40} className="mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 text-sm font-medium">No teaching schedule for today.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
