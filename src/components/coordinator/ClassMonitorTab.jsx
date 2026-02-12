import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { academicService } from '../../services/academicService'; // Import Service
import { Calendar, Clock, BookOpen, Users, ChevronRight, CheckCircle, XCircle, ArrowLeft, GitBranch } from 'lucide-react';

export default function ClassMonitorTab({ profile }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);

    // Viewing State
    const [viewMode, setViewMode] = useState('branches'); // 'branches' | 'classes'
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null);

    // Derived Data
    const [structureBranches, setStructureBranches] = useState([]);

    // 1. Fetch Structure on Mount
    useEffect(() => {
        const fetchStructure = async () => {
            try {
                const structure = await academicService.getStructure();
                let branchesToList = structure?.branches || [];

                // Filter by Coordinator Department
                const coordinatorDept = profile?.dept || profile?.branch;

                if (coordinatorDept) {
                    // 1. Check mapped Department -> Branches
                    if (structure.departmentMap?.[coordinatorDept]) {
                        branchesToList = structure.departmentMap[coordinatorDept];
                    }
                    // 2. Check direct Branch match
                    else if (branchesToList.includes(coordinatorDept)) {
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
                const q = query(
                    collection(db, 'attendance_periods'),
                    where('date', '==', selectedDate)
                );

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
        ? periods.filter(p => p.branch === selectedBranch)
        : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Date Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    {viewMode === 'classes' && (
                        <button onClick={handleBackToBranches} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="text-indigo-600" />
                            {viewMode === 'classes' ? `${selectedBranch} Classes` : 'Class Monitor'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {viewMode === 'classes'
                                ? `Showing ${visiblePeriods.length} classes`
                                : 'Select a branch to view classes'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-gray-700"
                    />
                </div>
            </div>

            {/* View Switching */}
            {viewMode === 'branches' ? (
                /* BRANCH SELECTION VIEW */
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {structureBranches.length === 0 && !loading ? (
                        <div className="col-span-full py-12 text-center text-gray-400">Loading branches...</div>
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
                                    className={`flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border transition-all group ${hasClasses
                                            ? 'border-gray-200 hover:border-indigo-500 hover:shadow-md'
                                            : 'border-gray-100 opacity-70 hover:opacity-100 hover:border-gray-300'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${hasClasses ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
                                        }`}>
                                        <GitBranch size={24} />
                                    </div>
                                    <h3 className={`font-bold text-lg ${hasClasses ? 'text-gray-900' : 'text-gray-500'}`}>{branch}</h3>

                                    {hasClasses ? (
                                        <>
                                            <span className="text-xs font-medium text-gray-500 mt-1">{totalClasses} Classes</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${avgAttendance < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                Avg: {avgAttendance}%
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs font-medium text-gray-400 mt-1 italic">No Data</span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            ) : (
                /* CLASS LIST VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List of Classes */}
                    <div className="lg:col-span-1 space-y-3">
                        {visiblePeriods.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <BookOpen size={24} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">No classes found for {selectedBranch} on this date.</p>
                            </div>
                        ) : (
                            visiblePeriods.map((period) => (
                                <button
                                    key={period.id}
                                    onClick={() => setSelectedPeriod(period)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md group relative overflow-hidden ${selectedPeriod?.id === period.id
                                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                                            : 'bg-white border-gray-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 line-clamp-1">{period.subjectName}</h4>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${period.attendancePercentage < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {period.attendancePercentage}%
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 mb-2">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {period.startTime}
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-gray-600">
                                            Yr {period.year} ({period.section})
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>{period.facultyName}</span>
                                        <ChevronRight size={14} className={`transition-transform duration-300 ${selectedPeriod?.id === period.id ? 'rotate-90 text-indigo-600' : ''}`} />
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                                        <div
                                            className={`h-full ${period.attendancePercentage < 75 ? 'bg-red-500' : 'bg-green-500'}`}
                                            style={{ width: `${period.attendancePercentage}%` }}
                                        ></div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Detail View */}
                    <div className="lg:col-span-2">
                        {selectedPeriod ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
                                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{selectedPeriod.subjectName}</h3>
                                        <p className="text-sm text-gray-500">
                                            {selectedPeriod.branch} - Year {selectedPeriod.year} - Sec {selectedPeriod.section} • {selectedPeriod.startTime}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {selectedPeriod.presentCount} <span className="text-sm text-gray-400 font-normal">/ {selectedPeriod.totalStudents}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wide">Present</div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-0 max-h-[500px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 sticky top-0 z-10">
                                            <tr>
                                                <th className="py-3 px-4">Roll No</th>
                                                <th className="py-3 px-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {Object.entries(selectedPeriod.records || {}).map(([rollNo, status]) => (
                                                <tr key={rollNo} className="hover:bg-gray-50">
                                                    <td className="py-2 px-4 font-mono text-gray-700 font-medium">
                                                        {rollNo}
                                                    </td>
                                                    <td className="py-2 px-4">
                                                        {status === 'P' ? (
                                                            <span className="inline-flex items-center gap-1.5 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 text-xs">
                                                                <CheckCircle size={12} /> Present
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 text-xs">
                                                                <XCircle size={12} /> Absent
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-center text-gray-400">
                                    Faculty: {selectedPeriod.facultyName} • Submitted: {selectedPeriod.timestamp?.toDate ? selectedPeriod.timestamp.toDate().toLocaleTimeString() : 'N/A'}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">Select a class to view student details</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
