import React, { useState } from 'react';
import { Calendar, Clock, ArrowLeft, MapPin, Users, ChevronRight, CheckCircle } from 'lucide-react';

export default function FacultyScheduleTab({ schedule, onBack, onClassClick }) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Auto-select today
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const initialDay = days.includes(today) ? today : 'Monday';
    const [selectedDay, setSelectedDay] = useState(initialDay);

    const timeOrder = {
        '09:00 - 10:00': 1, '10:00 - 11:00': 2, '11:00 - 12:00': 3,
        '12:00 - 01:00': 4, '01:00 - 02:00': 5, '02:00 - 03:00': 6, '03:00 - 04:00': 7
    };

    const sortSlots = (slots) => [...slots].sort((a, b) => (timeOrder[a.time] || 99) - (timeOrder[b.time] || 99));
    const rawSlots = schedule[selectedDay] || [];

    // Grouping Logic: { "CSE Yr 3 (A)": [slot1, slot2], ... }
    const groupedSlots = rawSlots.reduce((acc, slot) => {
        const context = slot.context || 'Other';
        if (!acc[context]) acc[context] = [];
        acc[context].push(slot);
        return acc;
    }, {});

    const sortedGroups = Object.keys(groupedSlots).sort();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* TOP BAR: Header & Day Selector */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors md:hidden">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Teaching Schedule</h2>
                        <p className="text-gray-500 font-medium">Manage your sessions for {selectedDay}</p>
                    </div>
                </div>

                {/* Day Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${selectedDay === day
                                ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grouped Schedule */}
            <div className="space-y-8">
                {sortedGroups.length > 0 ? (
                    sortedGroups.map((groupName, groupIdx) => {
                        const groupSlots = sortSlots(groupedSlots[groupName]);

                        return (
                            <div key={groupIdx} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                                {/* Group Header */}
                                <div className="flex items-center gap-3 mb-4 sticky top-[70px] z-10 bg-slate-50/95 backdrop-blur-sm py-2">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                                        <Users size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">{groupName}</h3>
                                    <span className="px-2.5 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                                        {groupSlots.length}
                                    </span>
                                </div>

                                {/* Sessions List */}
                                <div className="space-y-3 pl-4 border-l-2 border-dashed border-gray-200 ml-5 relative">
                                    {groupSlots.map((slot, idx) => {
                                        const [startTime, endTime] = slot.time.split(' - ');

                                        // Simple logic to determine if class is active/past
                                        // Note: Accurate "Active" check requires parsing time strings vs current time.
                                        // For now, we allow clicking all.

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => onClassClick && onClassClick(slot)}
                                                className="relative group bg-white rounded-2xl border border-gray-200 p-5 hover:border-purple-200 hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition-all cursor-pointer overflow-hidden"
                                            >
                                                {/* Hover Accent */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">

                                                    {/* Time & Subject */}
                                                    <div className="flex items-start gap-4">
                                                        <div className="min-w-[70px] text-center bg-gray-50 rounded-lg p-2 group-hover:bg-purple-50 transition-colors">
                                                            <p className="text-sm font-bold text-gray-900 leading-none mb-1">{startTime}</p>
                                                            <p className="text-[10px] text-gray-500 font-medium uppercase">{endTime}</p>
                                                        </div>

                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-purple-700 transition-colors">
                                                                {slot.subjectName}
                                                            </h4>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                                    {slot.subjectCode}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                                                                    <MapPin size={12} /> Room {slot.room || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action */}
                                                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-all flex items-center gap-2">
                                                            Mark Attendance <ChevronRight size={14} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Calendar size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No classes today</h3>
                        <p className="text-gray-500">Enjoy your free time!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
