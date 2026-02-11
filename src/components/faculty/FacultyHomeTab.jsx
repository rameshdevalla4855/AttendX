import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Briefcase, MapPin, Clock, Calendar, CheckCircle, AlertCircle, Users, BookOpen } from 'lucide-react';
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

    return (
        <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* 1. Welcome Header */}
            <div className="flex justify-between items-end px-1">
                <div>
                    <p className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1">{dateString}</p>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Welcome, <span className="text-purple-600">{profile?.name?.split(' ')[0] || 'Professor'}</span>
                    </h1>
                </div>
                <div className="hidden md:block">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${status === 'IN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${status === 'IN' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {status === 'IN' ? 'On Campus' : 'Off Campus'}
                    </span>
                </div>
            </div>

            {/* 2. Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* A. Identity Card - 2 Cols */}
                <div className="md:col-span-2 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl shadow-purple-900/20 relative overflow-hidden group flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>

                    {/* Left: Info */}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px] flex-1 text-center sm:text-left">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase border border-white/10 mb-3 text-purple-200">
                                Faculty Pass
                            </span>
                            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-2 text-white">{profile?.name || 'Loading...'}</h2>
                            <p className="text-purple-200 font-medium text-sm">{profile?.designation}</p>
                        </div>

                        <div className="flex flex-col gap-1 mt-6">
                            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Department</span>
                            <span className="text-lg font-bold text-white">{profile?.dept}</span>
                            <span className="font-mono text-xs tracking-wide text-gray-400">{profile?.facultyId}</span>
                        </div>
                    </div>

                    {/* Right: QR Code (Always Visible) */}
                    <div className="relative z-10 bg-white p-3 rounded-2xl shadow-xl shrink-0">
                        <QRCodeCanvas value={currentUser?.uid || "N/A"} size={130} fgColor="#1e1b4b" />
                        <p className="text-[10px] text-center font-bold text-gray-400 mt-2 tracking-widest uppercase">Scan for Entry</p>
                    </div>
                </div>

                {/* B. Stats & Next Class */}
                <div className="grid grid-rows-2 gap-4 md:col-span-1 h-full">

                    {/* Next/Active Class Card */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                        {activeClass ? (
                            <>
                                <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-green-500 animate-pulse ring-4 ring-green-100"></div>
                                <p className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Clock size={14} /> Ongoing
                                </p>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">{activeClass.subject}</h3>
                                <p className="text-gray-500 text-xs mt-1 font-medium">{activeClass.context}</p>
                            </>
                        ) : nextClass ? (
                            <>
                                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Calendar size={14} /> Up Next
                                </p>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">{nextClass.subject}</h3>
                                <div className="mt-auto pt-2">
                                    <span className="text-2xl font-bold text-gray-900 tracking-tighter">{nextClass.startTime}</span>
                                    <p className="text-xs text-gray-400 font-medium">{nextClass.context}</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full">
                                <CheckCircle className="text-gray-300 mb-2" size={32} />
                                <p className="text-sm font-bold text-gray-900">All Caught Up!</p>
                                <p className="text-xs text-gray-400 mt-1">No more classes today.</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Compact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 rounded-[1.5rem] p-4 flex flex-col justify-center items-center text-center hover:bg-purple-100 transition-colors cursor-default">
                            <span className="text-3xl font-black text-purple-600 tracking-tight">{todaysClasses.length}</span>
                            <span className="text-[10px] uppercase font-bold text-purple-400 mt-1 tracking-wide">Sessions</span>
                        </div>
                        <div className="bg-indigo-50 rounded-[1.5rem] p-4 flex flex-col justify-center items-center text-center hover:bg-indigo-100 transition-colors cursor-default">
                            <Briefcase className="text-indigo-600 mb-1" size={24} />
                            <span className="text-[10px] uppercase font-bold text-indigo-400 mt-1 tracking-wide">Work Mode</span>
                        </div>
                    </div>
                </div>

                {/* C. Teaching Timeline */}
                <div className="md:col-span-3 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6 text-lg">
                        <Users size={20} className="text-purple-600" /> Today's Schedule
                    </h3>

                    <div className="space-y-4">
                        {todaysClasses.length > 0 ? todaysClasses.map((item, idx) => {
                            const isActive = activeClass === item;
                            return (
                                <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isActive ? 'bg-purple-50 border-purple-200 shadow-sm ring-1 ring-purple-200' : 'bg-white border-gray-100 hover:border-gray-200'
                                    }`}>
                                    <div className="min-w-[4rem] text-center shrink-0">
                                        <p className={`text-sm font-bold ${isActive ? 'text-purple-700' : 'text-gray-900'}`}>{item.startTime}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">{item.endTime}</p>
                                    </div>
                                    <div className={`w-1 h-8 rounded-full shrink-0 ${isActive ? 'bg-purple-500' : 'bg-gray-200'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-gray-900 truncate">{item.subject}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.context}</p>
                                    </div>
                                    {isActive && (
                                        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-bold tracking-wide uppercase animate-pulse">
                                            Live
                                        </span>
                                    )}
                                </div>
                            )
                        }) : (
                            <div className="text-center py-10 opacity-50">
                                <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-500 text-sm font-medium">No teaching schedule for today.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
