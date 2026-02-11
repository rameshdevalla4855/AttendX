import React from 'react';
import UserAttendanceHistory from '../UserAttendanceHistory';
import { History, ArrowLeft } from 'lucide-react';

export default function FacultyHistoryTab({ onBack }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors md:hidden">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <History className="text-purple-600" /> My Attendance Log
                </h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                <UserAttendanceHistory />
            </div>
        </div>
    );
}
