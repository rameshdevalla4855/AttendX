import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Coffee, BookOpen, ChevronRight, User, ArrowLeft } from 'lucide-react';
import { academicService } from '../../services/academicService';

export default function StudentTimetableTab({ timetable, profile, onBack }) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // State
    const [selectedDay, setSelectedDay] = useState(days[new Date().getDay() - 1] || 'Monday');
    const [slots, setSlots] = useState([]);

    // Attendance Modal State
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyStats, setHistoryStats] = useState({ total: 0, present: 0, percentage: 0 });

    useEffect(() => {
        if (timetable && timetable[selectedDay]) {
            setSlots(timetable[selectedDay]);
        } else {
            setSlots([]);
        }
    }, [selectedDay, timetable]);

    // Fetch Attendance when a slot is clicked
    const handleSlotClick = async (slot) => {
        if (!profile || slot.subjectCode === 'BREAK') return;

        setSelectedSlot(slot);
        setLoadingHistory(true);

        try {
            // Context comes from Profile: Branch, Year, Section
            const branch = profile.dept || profile.branch;
            const year = profile.year;
            const section = profile.section || 'A';

            // Fetch periods for this subject
            const periods = await academicService.getStudentSubjectAttendance(branch, year, section, slot.subjectCode);

            // Filter and Map for this student
            const studentId = profile.rollNumber || profile.id;

            const history = periods.map(p => {
                const status = p.records?.[studentId] || 'NA'; // Get status from records map using ID
                return {
                    date: p.date,
                    startTime: p.startTime,
                    status: status, // 'P', 'A', or 'NA'
                    topic: p.topic || 'Regular Class'
                };
            }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

            setAttendanceHistory(history);

            // Calc Stats
            const total = history.filter(h => h.status !== 'NA').length;
            const present = history.filter(h => h.status === 'P').length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            setHistoryStats({ total, present, percentage });

        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const closeHistory = () => {
        setSelectedSlot(null);
        setAttendanceHistory([]);
    };

    // Helper to extract minutes from time string (e.g., "09:30 AM")
    const parseTimeMinutes = (timeStr) => {
        if (!timeStr) return 9999; // Fallback for invalid times

        // Expected format: "10:30 AM - 11:30 AM" or just "10:30 AM"
        // We only care about the start time
        const startPart = timeStr.split(' - ')[0].trim().toUpperCase();

        // Regex to match HH:MM and optional AM/PM
        const match = startPart.match(/(\d+):(\d+)\s*(AM|PM)?/);

        if (!match) return 9999;

        let [_, hours, minutes, modifier] = match;
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);

        // If AM/PM is missing, infer it based on school hours (8 AM - 5 PM)
        if (!modifier) {
            // 1, 2, 3, 4, 5, 6, 7 are likely PM
            if (hours >= 1 && hours <= 7) {
                modifier = 'PM';
            } else if (hours === 12) {
                modifier = 'PM'; // 12:00 is Noon (PM)
            } else {
                modifier = 'AM'; // 8, 9, 10, 11 are AM
            }
        }

        if (hours === 12) {
            hours = 0;
        }

        if (modifier === 'PM') {
            hours += 12;
        }

        return hours * 60 + minutes;
    };

    // Helper to get Status
    const getClassStatus = (timeRange) => {
        if (!timeRange) return 'upcoming';
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [startStr, endStr] = timeRange.split(' - ');

        const startMins = parseTimeMinutes(startStr);
        const endMins = parseTimeMinutes(endStr);

        // Check if today is selected day
        const todayName = days[new Date().getDay() - 1];
        if (selectedDay !== todayName) return 'upcoming';

        if (currentMinutes >= startMins && currentMinutes < endMins) return 'ongoing';
        if (currentMinutes >= endMins) return 'completed';
        return 'upcoming';
    };

    const sortSlots = (slots) => {
        return [...slots].sort((a, b) => {
            return parseTimeMinutes(a.time) - parseTimeMinutes(b.time);
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors md:hidden">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Weekly Schedule</h2>
                        <p className="text-gray-600 font-medium">{selectedDay}'s Classes</p>
                    </div>
                </div>

                {/* Day Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${selectedDay === day
                                ? 'bg-indigo-700 text-white border-indigo-700 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List View */}
            <div className="space-y-3">
                {slots.length > 0 ? (
                    sortSlots(slots).map((slot, idx) => {
                        const isBreak = slot.subjectCode === 'BREAK';
                        const [startTime, endTime] = slot.time.split(' - ');
                        const status = getClassStatus(slot.time);

                        return (
                            <div
                                key={idx}
                                onClick={() => !isBreak && handleSlotClick(slot)}
                                className={`relative flex items-center p-3 rounded-xl border transition-all ${status === 'ongoing' ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500 z-10' : 'bg-white border-gray-200 hover:border-gray-300'
                                    } ${isBreak ? 'bg-orange-50/50 border-orange-200 cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                            >

                                {/* Status Strip */}
                                <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${status === 'ongoing' ? 'bg-indigo-500' : status === 'completed' ? 'bg-gray-300' : 'bg-transparent'
                                    }`}></div>

                                {/* Start Time */}
                                <div className="min-w-[4.5rem] pl-3 flex flex-col justify-center items-start border-r border-gray-100 mr-4 pr-4">
                                    <span className={`text-sm font-bold ${status === 'ongoing' ? 'text-indigo-600' : 'text-gray-900'}`}>{startTime}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Start</span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className={`text-sm font-bold truncate ${isBreak ? 'text-orange-700' : 'text-gray-900'}`}>{slot.subjectName}</h3>
                                        {!isBreak && (
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-600 border border-gray-200 shrink-0">
                                                {slot.subjectCode}
                                            </span>
                                        )}
                                    </div>
                                    {!isBreak && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <User size={12} />
                                            <span className="truncate max-w-[150px]">{slot.facultyName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* End Time / Status */}
                                <div className="text-right pl-2">
                                    {status === 'ongoing' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                            Now
                                        </span>
                                    ) : (
                                        <span className="text-xs font-medium text-gray-400">{endTime}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                        <Coffee size={32} className="text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-500">No classes today</p>
                    </div>
                )}
            </div>

            {/* Attendance History Modal */}
            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedSlot.subjectName}</h3>
                                <p className="text-sm text-gray-500 font-medium">{selectedSlot.subjectCode} • Attendance</p>
                            </div>
                            <button onClick={closeHistory} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <p className="text-sm font-medium text-gray-500">Loading records...</p>
                                </div>
                            ) : attendanceHistory.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <BookOpen className="text-gray-300" size={32} />
                                    </div>
                                    <p className="text-gray-900 font-bold">No Attendance Records</p>
                                    <p className="text-sm text-gray-500">No classes have been marked for this subject yet.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Stats Card */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                                            <div className="text-xl font-black text-green-600">{historyStats.percentage}%</div>
                                            <div className="text-[10px] uppercase font-bold text-green-700/70">Attendance</div>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                                            <div className="text-xl font-black text-blue-600">{historyStats.present}</div>
                                            <div className="text-[10px] uppercase font-bold text-blue-700/70">Classes Attended</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                            <div className="text-xl font-black text-gray-600">{historyStats.total}</div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500/70">Total Classes</div>
                                        </div>
                                    </div>

                                    {/* History List */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Class History</h4>
                                        {attendanceHistory.map((record, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-10 rounded-full ${record.status === 'P' ? 'bg-green-500' : record.status === 'A' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                                                        <p className="text-xs text-gray-500">{record.startTime} • {record.topic}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    {record.status === 'P' ? (
                                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200">Present</span>
                                                    ) : record.status === 'A' ? (
                                                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200">Absent</span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">N/A</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
