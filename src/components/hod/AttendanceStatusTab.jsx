
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { academicService } from '../../services/academicService'; // Import Service
import { Download, Filter, Search, UserCheck, UserX, Clock, Users, CheckCircle, XCircle } from 'lucide-react';

// Helper: Normalize Department Names for HOD Scope (Broad)
const getBroadDept = (dept) => {
    if (!dept) return '';
    const d = dept.toUpperCase().replace(/[^A-Z]/g, '');

    // AIDS Group (AIML, Data Science, IOT, etc.)
    if (['AID', 'CSM', 'AIDS', 'AI&DS', 'AIML', 'ML', 'DS', 'CSD', 'CS-DS', 'CS-AI', 'IOT', 'CS-IOT', 'CSIOT'].includes(d) ||
        d.includes('ARTIFICIAL') || d.includes('MACHINE') || d.includes('DATA') || d.includes('IOT')) return 'AIDS';

    // CSE Group
    if (['CSE', 'CS', 'CSBS', 'CSI', 'CSEA', 'CSEB'].includes(d) ||
        d.includes('COMPUTER') || d.includes('COMP')) return 'CSE';

    return d;
};

// Helper: Normalize Branch for Filtering (Strict)
const getStrictBranch = (branch) => {
    if (!branch) return '';
    const b = branch.toUpperCase().replace(/[^A-Z]/g, '');

    // Explicit Aliases
    if (['AID', 'AIDS', 'AI&DS'].includes(b)) return 'AID';
    if (['IOT', 'CSIOT', 'CS-IOT'].includes(b)) return 'IOT';
    if (['CSM', 'CS-ML', 'AIML'].includes(b)) return 'CSM';

    return b;
};

export default function AttendanceStatusTab({ profile }) {
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [structureBranches, setStructureBranches] = useState([]); // Dynamic Branches
    const [structureSections, setStructureSections] = useState([]); // Dynamic Sections

    // Filters
    const [filters, setFilters] = useState({
        dept: '', // Will update via useEffect when profile loads
        year: '',
        branch: '',
        section: '',
        search: ''
    });

    // 1. Fetch Structure & Set Base Filters
    useEffect(() => {
        const init = async () => {
            if (profile?.dept) {
                // Lock Dept Filter using Broad Scope
                setFilters(prev => ({ ...prev, dept: getBroadDept(profile.dept) }));

                // Fetch Dynamic Branches & Sections from Structure
                try {
                    const structure = await academicService.getStructure();
                    if (structure) {
                        // Branches
                        if (structure.branches) {
                            // Filter branches that belong to this HOD's department (Broad Scope)
                            const relevantBranches = structure.branches.filter(b =>
                                getBroadDept(b) === getBroadDept(profile.dept)
                            );
                            setStructureBranches(relevantBranches);
                        }
                        // Sections
                        if (structure.sections) {
                            setStructureSections(structure.sections);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching structure:", err);
                }
            }
        };
        init();
    }, [profile]);

    // 2. Fetch Data & Calculate Status
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // A. Fetch Today's Attendance
                const today = new Date().toLocaleDateString('en-CA');
                const logsRef = collection(db, "attendanceLogs");
                const qLogs = query(logsRef, where("date", "==", today));
                const logsSnap = await getDocs(qLogs);

                const statusMap = {};
                logsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const entry = {
                        status: data.type === 'ENTRY' ? 'INSIDE' : 'LEFT',
                        time: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
                    };
                    if (data.uid) statusMap[data.uid] = entry;
                    if (data.rollNumber) statusMap[data.rollNumber] = entry;
                    if (data.rollNo) statusMap[data.rollNo] = entry;
                });
                setAttendanceMap(statusMap);

                // B. Fetch Students
                const studentsRef = collection(db, "students");
                const constraints = [];

                if (filters.year) {
                    const y = filters.year;
                    constraints.push(where("year", "in", [y, Number(y), y + "ST", y + "ND", y + "RD", y + "TH"]));
                }

                // NOTE: We do NOT strictly filter by "dept" (Branch) in DB here, 
                // because we need to handle "AID" vs "AIDS" and "1" vs "A" robustly on client side.
                // Since we rely on HOD Profile Dept filter logic, the dataset is already scoped reasonably.

                const qStudents = query(studentsRef, ...constraints);
                const studentSnap = await getDocs(qStudents);

                const studentList = studentSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(s => {
                    // 1. Dept Filter (Global HOD Scope - Broad)
                    // Ensure student belongs to the HOD's Major Dept (e.g. AID or CSM is allowed for HOD AIDS)
                    const activeDeptFilter = profile?.dept ? getBroadDept(profile.dept) : filters.dept;
                    if (activeDeptFilter && activeDeptFilter !== 'ALL DEPTS') {
                        if (getBroadDept(s.dept) !== activeDeptFilter) return false;
                    }

                    // 2. Branch Filter (Specific - Strict)
                    // If user selects "AID", we only show "AID" (mapped from AIDS/AID), NOT "CSM".
                    if (filters.branch) {
                        const sBranch = getStrictBranch(s.dept);
                        const fBranch = getStrictBranch(filters.branch);
                        if (sBranch !== fBranch) return false;
                    }

                    // 3. Section Filter
                    if (filters.section) {
                        // Loose comparison for "1" vs 1
                        if (String(s.section) !== String(filters.section)) return false;
                    }

                    return true;
                });

                setStudents(studentList);

            } catch (err) {
                console.error("Error fetching status data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters.dept, filters.year, filters.branch, filters.section, profile]);

    // Derived Data
    const displayStudents = useMemo(() => {
        return students.filter(s => {
            const query = filters.search.toLowerCase();
            return (
                s.name?.toLowerCase().includes(query) ||
                s.rollNumber?.toString().toLowerCase().includes(query) ||
                s.id?.toLowerCase().includes(query)
            );
        });
    }, [students, filters.search]);

    // Calculate Summary Stats for CURRENT View
    const summary = useMemo(() => {
        let present = 0;
        let left = 0;
        let absent = 0;
        displayStudents.forEach(s => {
            const st = attendanceMap[s.id] || attendanceMap[s.uid] || attendanceMap[s.rollNumber];
            if (!st) absent++;
            else if (st.status === 'INSIDE') present++;
            else left++;
        });
        return { present, left, absent, total: displayStudents.length };
    }, [displayStudents, attendanceMap]);

    const exportCSV = () => {
        const headers = ["Roll No", "Name", "Dept", "Year", "Branch", "Status", "Last Punch"];
        const rows = displayStudents.map(s => {
            const stat = attendanceMap[s.id] || {};
            const statusStr = stat.status || 'ABSENT';
            const timeStr = stat.time || '-';
            const roll = s.rollNumber || s.rollNo || s.id;
            return `"${roll}", "${s.name}", "${s.dept}", "${s.year}", "${s.branch || '-'}", "${statusStr}", "${timeStr}"`;
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `attendance_status_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Roster</h2>
                    <p className="text-sm text-gray-500">Live view of student presence {profile?.dept ? `for ${profile.dept}` : ''}.</p>
                </div>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-semibold text-sm"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {/* Filter Bar & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 shrink-0">
                {/* Filters */}
                <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <Filter size={14} /> Filter Students
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search Name or Roll No..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {!profile?.dept && (
                                <SelectFilter
                                    value={filters.dept}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dept: e.target.value }))}
                                    options={[
                                        { value: "", label: "All Depts" },
                                        { value: "CSE", label: "CSE" },
                                        { value: "AIDS", label: "AIDS" },
                                        { value: "ECE", label: "ECE" }
                                    ]}
                                />
                            )}
                            <SelectFilter
                                value={filters.year}
                                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                                options={[
                                    { value: "", label: "All Years" },
                                    { value: "1", label: "1st Year" },
                                    { value: "2", label: "2nd Year" },
                                    { value: "3", label: "3rd Year" },
                                    { value: "4", label: "4th Year" }
                                ]}
                            />
                            <SelectFilter
                                value={filters.branch}
                                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                                options={[
                                    { value: "", label: "All Branches" },
                                    ...structureBranches.map(b => ({ value: b, label: b === 'AIDS' ? 'AID' : b }))
                                ]}
                            />
                            <SelectFilter
                                value={filters.section}
                                onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                                options={[
                                    { value: "", label: "All Sec" },
                                    ...structureSections.map(s => ({ value: s, label: `Sec ${s}` }))
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Filtered Count</span>
                        <Users size={16} className="text-white opacity-50" />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold leading-none">{summary.present}</span>
                        <span className="text-sm text-green-400 font-bold mb-1">Present</span>
                    </div>
                    <div className="mt-2 flex gap-3 text-[10px] font-medium text-slate-400">
                        <span>Total: <b className="text-white">{summary.total}</b></span>
                        <span>Absent: <b className="text-white">{summary.absent}</b></span>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full text-sm text-left relative">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-xs sticky top-0 z-10">
                            <tr>
                                <th className="py-3 px-6 bg-gray-50">Student Info</th>
                                <th className="py-3 px-6 bg-gray-50">Academic</th>
                                <th className="py-3 px-6 bg-gray-50">Status</th>
                                <th className="py-3 px-6 bg-gray-50 text-right">Last Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="4" className="py-12 text-center text-gray-500">Loading live data...</td></tr>
                            ) : displayStudents.length === 0 ? (
                                <tr><td colSpan="4" className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                    <Search size={32} className="opacity-20" />
                                    No students found matching filters.
                                </td></tr>
                            ) : (
                                displayStudents.map(student => {
                                    const status = attendanceMap[student.id] ||
                                        attendanceMap[student.uid] ||
                                        attendanceMap[student.rollNumber] ||
                                        { status: 'ABSENT' };

                                    return (
                                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="py-3 px-6">
                                                <div className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{student.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{student.rollNumber || student.rollNo || student.id}</div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <div className="text-gray-600 font-medium">{student.dept}</div>
                                                <div className="text-xs text-gray-400">Year {student.year} • Sec {student.section || '-'}</div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <StatusBadge status={status.status} />
                                            </td>
                                            <td className="py-3 px-6 text-right text-gray-500 font-mono text-xs">
                                                {status.time || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 shrink-0">
                    <span>Showing {displayStudents.length} students</span>
                    <span>Status sync: Real-time</span>
                </div>
            </div>
        </div>
    );
}

function SelectFilter({ value, onChange, options }) {
    return (
        <div className="relative">
            <select
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                value={value}
                onChange={onChange}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    if (status === 'INSIDE') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                <CheckCircle size={10} className="fill-current" />
                PRESENT
            </span>
        );
    }
    if (status === 'LEFT') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                <Clock size={10} />
                LEFT
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400 border border-gray-200">
            <XCircle size={10} />
            ABSENT
        </span>
    );
}
