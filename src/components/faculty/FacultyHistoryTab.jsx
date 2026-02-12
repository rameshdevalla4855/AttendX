import React, { useState } from 'react';
import UserAttendanceHistory from '../UserAttendanceHistory';
import ClassAttendanceHistory from './ClassAttendanceHistory';
import { History, ArrowLeft, BookOpen, UserCheck } from 'lucide-react';

export default function FacultyHistoryTab({ onBack, onEditClass }) {
    const [activeSubTab, setActiveSubTab] = useState('classes'); // 'my_logs' | 'classes'

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
                        <div className="mb-6 pb-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">Submitted Class Attendance</h3>
                            <p className="text-sm text-gray-500">Select a record to edit past attendance.</p>
                        </div>
                        <ClassAttendanceHistory onEditClass={onEditClass} />
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
