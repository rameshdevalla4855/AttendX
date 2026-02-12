import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { academicService } from '../../services/academicService';
import { Calendar, Clock, BookOpen, Users, ChevronRight, CheckCircle, XCircle, ArrowLeft, ArrowRight, GitBranch, Search, Filter } from 'lucide-react';

export default function ClassMonitorTab({ profile }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);

    // Viewing State
    const [viewMode, setViewMode] = useState('branches'); // 'branches' | 'classes'
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Derived Data
    const [structureBranches, setStructureBranches] = useState([]);

    // 1. Fetch Structure on Mount
    useEffect(() => {
        const fetchStructure = async () => {
            try {
                const structure = await academicService.getStructure();
                let branchesToList = structure?.branches || [];
                const coordinatorDept = profile?.dept || profile?.branch;

                if (coordinatorDept) {
                    if (structure.departmentMap?.[coordinatorDept]) {
                        branchesToList = structure.departmentMap[coordinatorDept];
                    } else if (branchesToList.includes(coordinatorDept)) {
                        branchesToList = [coordinatorDept];
                    }
                }
                setStructureBranches(branchesToList.sort());
            } catch (err) {
                console.error("Error fetching structure:", err);
            }
        };
        fetchStructure();
    }, [profile]);

    // 2. Fetch Classes for Selected Date
    useEffect(() => {
        const fetchClasses = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'attendance_periods'), where('date', '==', selectedDate));
                const snapshot = await getDocs(q);
                const fetchedPeriods = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const recordCount = Object.keys(data.records || {}).length;
                    const presentCount = Object.values(data.records || {}).filter(s => s === 'P').length;
                    return {
                        id: doc.id,
                        ...data,
                        totalStudents: recordCount,
                        presentCount: presentCount,
                        attendancePercentage: recordCount > 0 ? Math.round((presentCount / recordCount) * 100) : 0
                    };
                });
                fetchedPeriods.sort((a, b) => {
                    const tA = a.startTime ? parseInt(a.startTime.replace(':', '')) : 0;
                    const tB = b.startTime ? parseInt(b.startTime.replace(':', '')) : 0;
                    return tA - tB;
                });
                setPeriods(fetchedPeriods);
                setSelectedPeriod(null);
            } catch (err) {
                console.error("Error fetching class monitor data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [selectedDate]);

    // Handle Branch Click
    const handleBranchSelect = (branch) => {
        setSelectedBranch(branch);
        setViewMode('classes');
    };

    const handleBackToBranches = () => {
        setViewMode('branches');
        setSelectedBranch(null);
        setSelectedPeriod(null);
    };

    // Filter periods for the selected branch
    const visiblePeriods = selectedBranch
        ? periods.filter(p => p.branch === selectedBranch &&
            (p.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.facultyName?.toLowerCase().includes(searchTerm.toLowerCase())))
        : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    {viewMode === 'classes' && (
                        <button onClick={handleBackToBranches} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <BookOpen size={20} />
                            </div>
                            {viewMode === 'classes' ? `${selectedBranch} Monitoring` : 'Class Monitor'}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'classes' && (
                        <div className="relative hidden md:block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search subject..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none w-48"
                            />
                        </div>
                    )}
                    <div className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors">
                        <Calendar size={16} className="text-gray-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 cursor-pointer w-full"
                        />
                    </div>
                </div>
            </div>

            {/* View Switching */}
            {viewMode === 'branches' ? (
                /* BRANCH SELECTION GRID */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {structureBranches.length === 0 && !loading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <GitBranch size={24} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No branches mapped to your profile.</p>
                        </div>
                    ) : (
                        structureBranches.map(branch => {
                            const branchPeriods = periods.filter(p => p.branch === branch);
                            const totalClasses = branchPeriods.length;
                            const avgAttendance = totalClasses > 0
                                ? Math.round(branchPeriods.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / totalClasses)
                                : 0;
                            const hasClasses = totalClasses > 0;

                            return (
                                <button
                                    key={branch}
                                    onClick={() => handleBranchSelect(branch)}
                                    className={`relative flex flex-col items-start p-6 rounded-2xl border transition-all duration-300 group text-left ${hasClasses
                                        ? 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50'
                                        : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <div className="flex justify-between w-full mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${hasClasses ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            <GitBranch size={22} />
                                        </div>
                                        {hasClasses && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full h-fit ${avgAttendance < 75 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {avgAttendance}% Avg
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{branch}</h3>
                                    <p className="text-sm text-gray-500 font-medium">{totalClasses} Active Classes</p>

                                    {hasClasses && (
                                        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">
                                            <ArrowRight size={18} />
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            ) : (
                /* CLASS LIST VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                    {/* List Column */}
                    <div className="lg:col-span-1 flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Available Classes</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {visiblePeriods.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Filter size={24} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-500">No classes found.</p>
                                </div>
                            ) : (
                                visiblePeriods.map((period) => (
                                    <button
                                        key={period.id}
                                        onClick={() => setSelectedPeriod(period)}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative ${selectedPeriod?.id === period.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h4 className={`font-bold text-sm line-clamp-1 ${selectedPeriod?.id === period.id ? 'text-indigo-900' : 'text-gray-900'}`}>{period.subjectName}</h4>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${period.attendancePercentage < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {period.attendancePercentage}%
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                            <span className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                                <Clock size={10} /> {period.startTime}
                                            </span>
                                            <span className="font-medium">Yr {period.year} ({period.section})</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                            <Users size={10} /> {period.facultyName}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail Column */}
                    <div className="lg:col-span-2 h-full">
                        {selectedPeriod ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Detail Header */}
                                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wide">{selectedPeriod.branch}</span>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wide">Year {selectedPeriod.year} - {selectedPeriod.section}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedPeriod.subjectName}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                            <Clock size={14} /> {selectedPeriod.startTime} • <Users size={14} /> {selectedPeriod.facultyName}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-3xl font-bold text-gray-900 tracking-tight">{selectedPeriod.attendancePercentage}%</span>
                                            <span className="text-xs text-gray-500 font-medium uppercase">Attendance</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="grid grid-cols-3 border-b border-gray-100 divide-x divide-gray-100 bg-white">
                                    <div className="p-3 text-center">
                                        <div className="text-lg font-bold text-indigo-600">{selectedPeriod.totalStudents}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold">Total</div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <div className="text-lg font-bold text-green-600">{selectedPeriod.presentCount}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold">Present</div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <div className="text-lg font-bold text-red-600">{selectedPeriod.totalStudents - selectedPeriod.presentCount}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold">Absent</div>
                                    </div>
                                </div>

                                {/* Student List */}
                                <div className="flex-1 overflow-y-auto p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-gray-50/90">
                                            <tr>
                                                <th className="py-3 px-6 w-1/3">Roll No</th>
                                                <th className="py-3 px-6">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {Object.entries(selectedPeriod.records || {}).sort().map(([rollNo, status]) => (
                                                <tr key={rollNo} className="hover:bg-gray-50/80 transition-colors group">
                                                    <td className="py-3 px-6 font-mono text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">
                                                        {rollNo}
                                                    </td>
                                                    <td className="py-3 px-6">
                                                        {status === 'P' ? (
                                                            <span className="inline-flex items-center gap-1.5 text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-md text-xs border border-green-100 shadow-sm">
                                                                <CheckCircle size={12} strokeWidth={3} /> Present
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-md text-xs border border-red-100 shadow-sm">
                                                                <XCircle size={12} strokeWidth={3} /> Absent
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-3 bg-gray-50 border-t border-gray-200 text-[10px] text-center text-gray-400 font-mono">
                                    Log ID: {selectedPeriod.id} • Submitted: {selectedPeriod.timestamp?.toDate ? selectedPeriod.timestamp.toDate().toLocaleTimeString() : 'N/A'}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-200 border-dashed">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Users size={24} className="text-gray-300" />
                                </div>
                                <h3 className="font-bold text-gray-600">No Class Selected</h3>
                                <p className="text-sm">Select a class from the list to view attendance details.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
