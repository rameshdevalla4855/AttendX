import React, { useState, useMemo } from 'react';
import UserAttendanceHistory from '../UserAttendanceHistory';
import ClassAttendanceHistory from './ClassAttendanceHistory';
import { History, ArrowLeft, BookOpen, UserCheck } from 'lucide-react';

export default function FacultyHistoryTab({ assignments, onBack, onEditClass }) {
    const [activeSubTab, setActiveSubTab] = useState('classes'); // 'my_logs' | 'classes'
    const [selectedClass, setSelectedClass] = useState(null);

    // Derive unique classes from assignments
    const uniqueClasses = useMemo(() => {
        if (!assignments) return [];
        const map = new Map();
        assignments.forEach(a => {
            const key = `${a.branch}_${a.year}_${a.section}`; // Create unique key
            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    branch: a.branch,
                    year: a.year,
                    section: a.section
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
    }, [assignments]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors md:hidden">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="text-purple-600" /> Attendance History
                    </h2>
                </div>

                {/* Sub-Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                    <button
                        onClick={() => setActiveSubTab('classes')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${activeSubTab === 'classes'
                            ? 'bg-white text-purple-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <BookOpen size={16} />
                        Class Logs
                    </button>
                    <button
                        onClick={() => setActiveSubTab('my_logs')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${activeSubTab === 'my_logs'
                            ? 'bg-white text-purple-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <UserCheck size={16} />
                        My Attendance
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 min-h-[400px]">
                {activeSubTab === 'classes' ? (
                    <div>
                        {!selectedClass ? (
                            // 1. Class Selection View
                            <div className="space-y-6">
                                <div className="mb-6 pb-4 border-b border-gray-100">
                                    <h3 className="font-bold text-gray-800">Select a Class</h3>
                                    <p className="text-sm text-gray-500">Choose a class to view its attendance history.</p>
                                </div>

                                {uniqueClasses.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {uniqueClasses.map((cls) => (
                                            <button
                                                key={cls.id}
                                                onClick={() => setSelectedClass(cls)}
                                                className="flex flex-col items-start p-5 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:shadow-md transition-all group text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <BookOpen size={20} />
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-lg">
                                                    {cls.branch}
                                                </h4>
                                                <p className="text-gray-500 font-medium text-sm">
                                                    Year {cls.year} • Section {cls.section}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-500">
                                        No classes assigned yet.
                                    </div>
                                )}
                            </div>
                        ) : (
                            // 2. Selected Class History View
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => setSelectedClass(null)}
                                    className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-purple-600 transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                    Back to Classes
                                </button>
                                <div className="mb-6 pb-4 border-b border-gray-100">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        Attendance History
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            {selectedClass.branch} - {selectedClass.year} ({selectedClass.section})
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-500">Viewing submitted records for this class.</p>
                                </div>
                                <ClassAttendanceHistory
                                    onEditClass={onEditClass}
                                    selectedClass={selectedClass}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="mb-6 pb-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">My Campus Entry/Exit Logs</h3>
                            <p className="text-sm text-gray-500">Biometric logs recorded at the gate.</p>
                        </div>
                        <UserAttendanceHistory />
                    </div>
                )}
            </div>
        </div>
    );
}
