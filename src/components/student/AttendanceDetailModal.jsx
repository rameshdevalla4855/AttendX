import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { X, Trophy, AlertCircle, BookOpen } from 'lucide-react';

export default function AttendanceDetailModal({ isOpen, onClose, stats }) {
    if (!isOpen) return null;

    const data = stats?.subjectWise || [];
    const overall = stats?.percentage || 0;

    // Distinct Colors Palette
    const COLORS = [
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#f43f5e', // Rose
        '#f59e0b', // Amber
        '#10b981', // Emerald
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
    ];

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const index = data.findIndex(d => d.code === dataPoint.code);
            return (
                <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 ring-1 ring-black/5">
                    <p className="font-bold text-slate-900 mb-1" style={{ color: COLORS[index % COLORS.length] }}>{dataPoint.name || label}</p>
                    <div className="space-y-1 text-xs">
                        <p className="text-slate-500 font-medium">
                            Attendance: <span className={`font-bold ${dataPoint.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {dataPoint.percentage}%
                            </span>
                        </p>
                        <p className="text-slate-400">
                            Present: {dataPoint.present}/{dataPoint.total}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/20">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <BookOpen className="text-indigo-600" size={24} />
                            Subject-wise Analytics
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Detailed breakdown of your attendance</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">

                    {/* Overall Score Card */}
                    <div className="mb-8 flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 ${overall >= 75 ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>

                        <div className="relative z-10">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm ${overall >= 75 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {overall}%
                            </div>
                        </div>
                        <div className="relative z-10 flex-1">
                            <h3 className="font-bold text-slate-900 text-lg">Overall Attendance</h3>
                            <p className={`text-sm font-medium ${overall >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {overall >= 75 ? 'You are doing great! Keep it up. 🎓' : 'Attention needed! You are falling behind. ⚠️'}
                            </p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[400px] w-full mb-6 relative pb-8">
                        {data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        domain={[0, 100]}
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1000}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                <p className="text-sm font-medium">No active class data available yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Detailed List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Subject Details</h4>
                        {data.map((sub, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                        <p className="font-bold text-slate-900 text-sm">{sub.name || sub.code}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 ml-4 mt-0.5">{sub.code}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-bold ${sub.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {sub.percentage}%
                                    </span>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {sub.present}/{sub.total} Classes
                                    </p>
                                </div>
                            </div>
                        ))}
                        {data.length === 0 && (
                            <p className="text-center text-sm text-slate-400 py-4 italic">Attendance records will appear here once classes start.</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
