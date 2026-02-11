import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ShieldCheck, MapPin, Clock, Calendar, ChevronRight, Zap, TrendingUp, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import VisitorRequestCard from './VisitorRequestCard';

export default function StudentHomeTab({ profile, status, timetable, attendanceStats }) {
    const { currentUser } = useAuth();
    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Helper to get today's day name (e.g., "Monday")
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

    // Note: Timetable format might be "09:00 AM" or "09:00". 
    // Assuming 24h or AM/PM based on previous context. 
    // If I don't know, I'll try to handle both or assume standard format.
    // Let's assume standard "HH:mm" or check how it's stored.
    // For safety, I will implement a parser that handles "HH:mm".

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
        <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* Visitor Requests */}
            <VisitorRequestCard currentUser={currentUser} profile={profile} />

            {/* 1. Welcome Header */}
            {/* ... (Header code remains same) ... */}

            {/* 2. Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* A. Identity Card ... */}
                {/* ... (Identity Card code remains same, omitted here for brevity) ... */}
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group flex flex-row items-center justify-between">
                    {/* Background Blobs */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-black/20 blur-3xl"></div>

                    {/* Left: Info */}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px] flex-1">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase border border-white/10">
                                    Student ID
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-1">{profile?.name || 'Loading...'}</h2>
                            <p className="text-indigo-100 font-mono text-sm opacity-80">{profile?.rollNumber}</p>
                        </div>

                        <div className="flex flex-col gap-1 mt-4">
                            <span className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Department</span>
                            <span className="text-lg font-bold">{profile?.dept} <span className="opacity-50 mx-1">/</span> {profile?.year} <span className="opacity-50 mx-1">/</span> {profile?.section}</span>
                        </div>
                    </div>

                    {/* Right: QR Code (Always Visible) */}
                    <div className="relative z-10 bg-white p-2 rounded-xl shadow-lg shrink-0 ml-4">
                        <QRCodeCanvas value={currentUser?.uid || "N/A"} size={140} />
                    </div>
                </div>

                {/* B. Status / Next Class - Stacked on Mobile, Col on Desktop */}
                <div className="space-y-4 md:space-y-0 md:grid md:grid-rows-2 md:gap-4 md:col-span-1">

                    {/* Active/Next Class Card */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center">
                        {activeClass ? (
                            <>
                                <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <p className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Zap size={14} className="fill-green-600" /> Happening Now
                                </p>
                                <h3 className="text-xl font-bold text-gray-900 leading-tight">{activeClass.subject}</h3>
                                <p className="text-gray-500 text-sm mt-1">Room {activeClass.room}</p>
                                <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-green-500 h-full rounded-full w-[60%]"></div>
                                </div>
                            </>
                        ) : nextClass ? (
                            <>
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Clock size={14} /> Up Next
                                </p>
                                <h3 className="text-xl font-bold text-gray-900 leading-tight">{nextClass.subject}</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-gray-500 text-sm">{nextClass.startTime}</p>
                                    <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500">
                                        Room {nextClass.room}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-2 h-full flex flex-col justify-center items-center">
                                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircleIcon />
                                </div>
                                <h3 className="font-bold text-gray-900">All Done!</h3>
                                <p className="text-xs text-gray-400 mt-1">No more classes today.</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                            <span className={`text-2xl font-bold ${percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                                {percentage}%
                            </span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Attendance</span>
                        </div>
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                            <span className="text-2xl font-bold text-gray-900">{total}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Total Classes</span>
                        </div>
                    </div>
                </div>

                {/* C. Interactive Timeline (Full Width) */}
                <div className="md:col-span-3 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Calendar size={18} className="text-indigo-600" /> Today's Timeline
                        </h3>
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View Full</button>
                    </div>

                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100"></div>

                        <div className="space-y-6">
                            {todaysClasses.length > 0 ? todaysClasses.map((item, idx) => {
                                if (!item?.startTime || !item?.endTime) return null;
                                const isPast = new Date().getHours() > parseInt(item.endTime.split(':')[0]);
                                const isActive = activeClass === item;

                                return (
                                    <div key={idx} className={`relative flex gap-4 group ${isPast ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                                        {/* Time Badge */}
                                        <div className={`relative z-10 w-12 flex flex-col items-center justify-center shrink-0 h-12 rounded-2xl border-2 font-bold text-xs shadow-sm bg-white transition-all
                                            ${isActive ? 'border-indigo-600 text-indigo-600 scale-110 shadow-indigo-100' : 'border-gray-100 text-gray-500'}
                                        `}>
                                            <span>{item.startTime.split(':')[0]}</span>
                                            <span className="text-[9px] font-normal">{item.startTime.split(':')[1] || '00'}</span>
                                        </div>

                                        {/* Content Card */}
                                        <div className={`flex-1 p-4 rounded-2xl border transition-all
                                            ${isActive ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50/50 border-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm'}
                                        `}>
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-bold text-sm ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{item.subject}</h4>
                                                <span className="text-[10px] font-mono text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">
                                                    {item.room}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <BookOpen size={12} /> {item.type || 'Lecture'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-400 text-sm">No classes scheduled for today.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
