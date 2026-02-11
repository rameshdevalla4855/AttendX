import React, { useState } from 'react';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';

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
    const slots = schedule[selectedDay] || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

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

            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Clock size={18} className="text-purple-600" />
                        Session Timeline
                    </h3>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-100">
                        {slots.length} Classes
                    </span>
                </div>

                {slots.length > 0 ? (
                    sortSlots(slots).map((slot, idx) => {
                        const [startTime, endTime] = slot.time.split(' - ');

                        return (
                            <div
                                key={idx}
                                onClick={() => onClassClick && onClassClick(slot)}
                                className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-purple-200 transition-all flex flex-col sm:flex-row gap-4 sm:items-center cursor-pointer active:scale-[0.99]"
                            >
                                {/* Time Block */}
                                <div className="min-w-[110px] sm:border-r border-gray-100 sm:pr-4 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0">
                                    <span className="text-xl font-bold text-gray-900 tracking-tight">{startTime}</span>
                                    <span className="text-sm font-medium text-gray-500">{endTime}</span>
                                </div>

                                {/* Subject Info */}
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                                        {slot.subjectName}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded font-mono border border-gray-200">
                                            {slot.subjectCode}
                                        </span>
                                    </div>
                                </div>

                                {/* Class Context Badge */}
                                <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 mt-3 sm:mt-0">
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                        {slot.context}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide group-hover:text-purple-500 transition-colors">
                                        Tap to Mark
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Calendar size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Teaching Sessions</h3>
                        <p className="text-gray-500 text-sm mt-1">You have no classes scheduled for {selectedDay}.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
