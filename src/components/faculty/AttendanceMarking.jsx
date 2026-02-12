import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, serverTimestamp, setDoc, limit } from 'firebase/firestore';
import { academicService } from '../../services/academicService';
import { CheckCircle, XCircle, Save, Loader2, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceMarking({ session, onBack }) {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({}); // { rollNo: 'P' | 'A' }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });

    // Parse Context Helper
    const parseContext = (ctx) => {
        // Expected format: "CSE Yr 3 (A)" or similar key from FacultyDashboard
        const parts = ctx.match(/([A-Z]+)\s+Yr\s+(\d+)\s+\(([A-Z0-9]+)\)/);
        if (parts) {
            return { branch: parts[1], year: parts[2], section: parts[3] };
        }
        return null; // Handle manual or edge cases if needed
    };

    useEffect(() => {
        const init = async () => {
            if (!session) return;

            const ctx = parseContext(session.context);
            if (!ctx) {
                toast.error("Invalid Class Context");
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Students
                // We use academicService which we updated to fetch by branch/year/sec
                const studentList = await academicService.getClassStudents(ctx.branch, ctx.year, ctx.section);

                // Sort by Roll Number (or Name if Roll No missing)
                studentList.sort((a, b) => {
                    const rA = a.rollNumber || a.id || '';
                    const rB = b.rollNumber || b.id || '';
                    return rA.localeCompare(rB);
                });
                setStudents(studentList);

                // 2. Check for Existing Attendance
                // Doc ID: BRANCH_YEAR_SEC_DATE_STARTTIME
                // Allow session to override date (for editing past records)
                const dateStr = session.date || new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                const startTime = session.time.split(' - ')[0].replace(':', '');
                const periodId = `${ctx.branch}_${ctx.year}_${ctx.section}_${dateStr}_${startTime}`;

                const existingRecord = await academicService.getAttendancePeriod(periodId);

                if (existingRecord && existingRecord.records) {
                    setAttendance(existingRecord.records);
                } else {
                    // Default All Present
                    const initial = {};
                    studentList.forEach(s => {
                        // Use Roll Number as Key if available, else Doc ID
                        const key = s.rollNumber || s.id;
                        initial[key] = 'P';
                    });
                    setAttendance(initial);
                }

            } catch (err) {
                console.error("Error loading attendance:", err);
                toast.error("Failed to load class data.");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [session]);

    // Update Stats when attendance changes
    useEffect(() => {
        const total = students.length;
        const presentCount = Object.values(attendance).filter(status => status === 'P').length;
        const absentCount = total - presentCount;
        setStats({ present: presentCount, absent: absentCount, total });
    }, [attendance, students]);

    const toggleStatus = (key) => {
        setAttendance(prev => ({
            ...prev,
            [key]: prev[key] === 'P' ? 'A' : 'P'
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const ctx = parseContext(session.context);
        const dateStr = session.date || new Date().toLocaleDateString('en-CA');
        const startTime = session.time.split(' - ')[0].replace(':', '');
        const periodId = `${ctx.branch}_${ctx.year}_${ctx.section}_${dateStr}_${startTime}`;

        try {
            // Construct Payload
            const payload = {
                periodId,
                branch: ctx.branch,
                year: Number(ctx.year), // Ensure number
                section: ctx.section,
                date: dateStr,
                startTime: session.time.split(' - ')[0],
                endTime: session.time.split(' - ')[1],
                subjectCode: session.subjectCode,
                subjectName: session.subjectName,
                facultyId: session.facultyId,
                facultyName: session.facultyName || 'Unknown', // Pass if available
                records: attendance,
                stats: stats
            };

            await academicService.submitAttendance(payload);
            toast.success("Attendance Submitted Successfully!");

            // Optional: Give user a moment before going back
            setTimeout(() => {
                if (onBack) onBack();
            }, 1000);

        } catch (err) {
            console.error(err);
            toast.error("Submission Failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-64">
                <Loader2 className="animate-spin text-purple-600 mb-4" size={32} />
                <p className="text-gray-500 font-medium animate-pulse">Loading Class Data...</p>
            </div>
        );
    }

    if (students.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-auto text-center overflow-auto">
                <Users size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No Students Found</h3>
                <p className="text-gray-500 mb-6">Could not find students for {session.context}.</p>
                <button onClick={onBack} className="text-purple-600 font-bold hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-24">
            {/* Header Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 sticky top-20 z-10">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-50 rounded-full text-gray-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 leading-none truncate max-w-[200px]">{session.subjectName}</h2>
                        <p className="text-sm text-purple-600 font-bold mt-1">{session.time}</p>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex gap-3">
                    <div className="flex-1 bg-green-50/50 rounded-xl p-2 border border-green-100 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-green-600 leading-none">{stats.present}</span>
                        <span className="text-[10px] uppercase font-bold text-green-600/70 mt-1">Present</span>
                    </div>
                    <div className="flex-1 bg-red-50/50 rounded-xl p-2 border border-red-100 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-red-600 leading-none">{stats.absent}</span>
                        <span className="text-[10px] uppercase font-bold text-red-600/70 mt-1">Absent</span>
                    </div>
                    <div className="flex-1 bg-gray-50/50 rounded-xl p-2 border border-gray-100 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-gray-600 leading-none">{stats.total}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-500/70 mt-1">Total</span>
                    </div>
                </div>
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 px-1">
                {students.map((student) => {
                    const key = student.rollNumber || student.id; // Correct Key
                    const isPresent = attendance[key] === 'P'; // Default check

                    return (
                        <button
                            key={key}
                            onClick={() => toggleStatus(key)}
                            className={`relative p-2 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center min-h-[5.5rem] ${isPresent
                                ? 'bg-white border-green-100/50 shadow-sm hover:border-green-300 hover:shadow-md'
                                : 'bg-red-50 border-red-200 shadow-inner scale-95 opacity-90'
                                }`}
                        >
                            <span className={`text-[11px] font-bold font-mono mb-1 tracking-tight truncate w-full text-center ${isPresent ? 'text-gray-800' : 'text-red-700'}`}>
                                {student.rollNumber || '---'}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate w-full text-center px-1 font-medium leading-tight">
                                {student.name?.split(' ')[0]}
                            </span>

                            {/* Status Icon */}
                            <div className="absolute top-1 right-1">
                                {isPresent ? (
                                    <CheckCircle size={14} className="text-green-500 fill-green-100" />
                                ) : (
                                    <XCircle size={14} className="text-red-500 fill-red-100" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 md:bottom-6 right-6 left-6 md:left-auto md:right-8 w-auto z-50">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full md:w-auto md:px-12 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl shadow-gray-400/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-black"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Submit Attendance
                        </>
                    )}
                </button>
            </div>

        </div>
    );
}
