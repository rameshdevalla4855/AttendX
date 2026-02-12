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

    return (
        <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* 1. Welcome Header */}
            <div className="flex justify-between items-end px-1">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-purple-100">
                            Academic Dashboard
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Welcome, <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{profile?.name?.split(' ')[0] || 'Professor'}</span> 👋
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
                        <Calendar size={14} className="text-purple-400" /> {dateString}
                    </p>
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

                {/* A. Identity Card - 2 Cols */}
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-purple-900/20 relative overflow-hidden group flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 border border-white/10">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

                    {/* Left: Info */}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[150px] flex-1 text-center sm:text-left w-full">
                        <div>
                            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase border border-white/10 text-indigo-100">
                                    Faculty ID
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-5xl font-bold tracking-tighter mb-2 text-white leading-tight">{profile?.name || 'Loading...'}</h2>
                            <p className="text-indigo-200 font-medium text-sm tracking-wide">{profile?.designation || 'Faculty Member'}</p>
                        </div>

                        <div className="flex flex-col gap-1 mt-6">
                            <span className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Department</span>
                            <span className="text-xl font-bold text-white tracking-tight">{profile?.dept || 'General'}</span>
                            <span className="font-mono text-xs tracking-wide text-indigo-300/80">{profile?.facultyId}</span>
                        </div>
                    </div>

                    {/* Right: QR Code (Always Visible) */}
                    <div className="relative z-10 bg-white p-3.5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] shrink-0 group-hover:rotate-2 transition-transform duration-500">
                        <QRCodeCanvas value={currentUser?.uid || "N/A"} size={130} fgColor="#1e1b4b" />
                        <div className="mt-2 text-center">
                            <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Scan for Entry</p>
                        </div>
                    </div>
                </div>

                {/* B. Stats & Next Class */}
                <div className="grid grid-rows-2 gap-6 md:col-span-1 h-full">

                    {/* Next/Active Class Card */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden flex flex-col justify-center min-h-[160px] group hover:border-purple-100 transition-colors">
                        {activeClass ? (
                            <>
                                <div className="absolute right-6 top-6 w-3 h-3 rounded-full bg-green-500 animate-pulse ring-4 ring-green-100"></div>
                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                    <Clock size={12} strokeWidth={3} /> Ongoing Session
                                </p>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight line-clamp-2 mb-1 group-hover:text-purple-700 transition-colors">{activeClass.subject}</h3>
                                <p className="text-slate-500 text-xs font-medium flex items-center gap-1">
                                    <MapPin size={10} /> {activeClass.context}
                                </p>
                                <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-green-500 h-full rounded-full w-[70%] animate-pulse"></div>
                                </div>
                            </>
                        ) : nextClass ? (
                            <>
                                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                    <Coffee size={12} strokeWidth={3} /> Up Next
                                </p>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight line-clamp-2  mb-2 group-hover:text-purple-700 transition-colors">{nextClass.subject}</h3>
                                <div className="mt-auto flex justify-between items-end border-t border-slate-50 pt-3">
                                    <span className="text-2xl font-bold text-slate-900 tracking-tighter">{nextClass.startTime}</span>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                                        Room {nextClass.room || 'N/A'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                                    <CheckCircle size={24} />
                                </div>
                                <p className="text-sm font-bold text-slate-900">All Caught Up!</p>
                                <p className="text-xs text-slate-400 mt-1">No more classes today.</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Compact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 rounded-[2rem] p-4 flex flex-col justify-center items-center text-center hover:bg-purple-100 transition-colors cursor-default border border-purple-100">
                            <span className="text-4xl font-black text-purple-600 tracking-tighter">{todaysClasses.length}</span>
                            <span className="text-[10px] uppercase font-bold text-purple-400 mt-1 tracking-wide">Sessions</span>
                        </div>
                        <div className="bg-white rounded-[2rem] p-4 flex flex-col justify-center items-center text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                <LayoutDashboard size={18} />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Work Mode</span>
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

                                    <h4 className={`font-bold text-sm truncate mb-1 ${isActive ? 'text-purple-900' : 'text-slate-900'}`}>{item.subject}</h4>
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
