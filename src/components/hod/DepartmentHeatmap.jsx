import React from 'react';
import { Target, Users, Zap } from 'lucide-react';

const DepartmentHeatmap = ({ data, loading }) => {
    // Mock data if none provided
    const heatmapData = data || [
        { class: '1-A', attendance: 85, color: 'bg-emerald-500' },
        { class: '1-B', attendance: 70, color: 'bg-emerald-400' },
        { class: '2-A', attendance: 92, color: 'bg-indigo-500' },
        { class: '2-B', attendance: 45, color: 'bg-orange-500' },
        { class: '3-A', attendance: 78, color: 'bg-indigo-400' },
        { class: '3-B', attendance: 88, color: 'bg-emerald-500' },
        { class: '4-A', attendance: 65, color: 'bg-indigo-300' },
        { class: '4-B', attendance: 95, color: 'bg-indigo-600' },
    ];

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col gap-4 animate-pulse">
                <div className="h-6 w-32 bg-slate-100 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-2 flex-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="bg-slate-50 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Target size={16} className="text-indigo-600" />
                        Class Saturation
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Live Dept Density</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg">
                    <Zap size={10} className="text-indigo-600 animate-pulse" />
                    <span className="text-[9px] font-black text-indigo-700 uppercase">Real-time</span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3 flex-1">
                {heatmapData.map((item, idx) => (
                    <div
                        key={idx}
                        className="relative group cursor-pointer"
                    >
                        <div className={`w-full h-full rounded-2xl ${item.color} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                            <span className="text-[10px] font-black text-slate-900 group-hover:scale-110 transition-transform">{item.class}</span>
                            <div className="mt-1 h-1 w-6 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${item.color}`} style={{ width: `${item.attendance}%` }}></div>
                            </div>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-20">
                            {item.attendance}% ATTENDANCE
                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[9px] font-bold text-slate-400">HIGH</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-[9px] font-bold text-slate-400">LOW</span>
                    </div>
                </div>
                <Users size={14} className="text-slate-200" />
            </div>
        </div>
    );
};

export default DepartmentHeatmap;
