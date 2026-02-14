import { useState, useEffect } from 'react';
import { academicService } from '../../services/academicService';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Save, RefreshCw, Plus, Trash2, Clock } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 01:00', // Break?
    '01:00 - 02:00',
    '02:00 - 03:00',
    '03:00 - 04:00'
];

export default function TimetableManager({ profile }) {
    const { currentUser } = useAuth();
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Selection State
    const [branch, setBranch] = useState('');
    const [year, setYear] = useState('');
    const [section, setSection] = useState('');

    // Schedule State: { Monday: [ {time, subjectCode, subjectName, facultyId, facultyName} ] }
    const [schedule, setSchedule] = useState({});

    // Modal State
    const [editingSlot, setEditingSlot] = useState(null); // { day, time }
    const [selectedSubject, setSelectedSubject] = useState('');
    const [facultyList, setFacultyList] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [assignments, setAssignments] = useState([]); // To auto-suggest faculty

    const coordinatorDept = profile?.dept || profile?.branch;

    useEffect(() => {
        loadInitialData();
    }, []);

    // Load Schedule when selection changes
    useEffect(() => {
        if (branch && year && section) {
            loadTimetable();
        }
    }, [branch, year, section]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [struct, faculty] = await Promise.all([
                academicService.getStructure(),
                academicService.getAllFaculty()
            ]);

            // Access Control Logic
            let availableBranches = struct.branches;
            if (coordinatorDept) {
                const mapped = struct.departmentMap?.[coordinatorDept];
                if (mapped && mapped.length > 0) {
                    availableBranches = mapped;
                } else if (struct.branches.includes(coordinatorDept)) {
                    availableBranches = [coordinatorDept];
                }
            }
            struct.availableBranches = availableBranches;

            setStructure(struct);
            setFacultyList(faculty);

            if (availableBranches?.[0]) setBranch(availableBranches[0]);
            if (struct?.years?.[0]) setYear(struct.years[0]); // Ensure year is set
            if (struct?.sections?.[0]) setSection(struct.sections[0]);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTimetable = async () => {
        try {
            console.log(`[TimetableManager] Loading data for ${branch} - ${year} - ${section}`);

            // 1. Fetch both schedule and current class assignments in parallel
            const [data, assign] = await Promise.all([
                academicService.getTimetable(branch, year, section),
                academicService.getClassAssignments(branch, year, section)
            ]);

            setAssignments(assign);

            // 2. Reconcile Schedule with current Assignments
            // If we have a schedule, ensure faculty names match the LATEST assignments
            if (data?.schedule) {
                const reconciledSchedule = { ...data.schedule };

                Object.keys(reconciledSchedule).forEach(day => {
                    reconciledSchedule[day] = reconciledSchedule[day].map(slot => {
                        // Skip if it's a break
                        if (slot.subjectCode === 'BREAK') return slot;

                        // Find current mapping for this subject
                        const currentMapping = assign.find(a => a.subjectCode === slot.subjectCode);

                        if (currentMapping) {
                            // If mapping changed, update the slot snapshot
                            if (slot.facultyId !== currentMapping.facultyId) {
                                console.log(`[Reconcile] Updating slot: ${slot.subjectName} -> ${currentMapping.facultyName}`);
                                return {
                                    ...slot,
                                    facultyId: currentMapping.facultyId,
                                    facultyName: currentMapping.facultyName
                                };
                            }
                        }
                        return slot;
                    });
                });

                setSchedule(reconciledSchedule);
            } else {
                const empty = {};
                DAYS.forEach(d => empty[d] = []);
                setSchedule(empty);
            }

        } catch (err) {
            console.error("Error loading timetable", err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await academicService.saveTimetable(branch, year, section, schedule, currentUser.uid);
            alert("Timetable Saved Successfully!");
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save timetable.");
        } finally {
            setSaving(false);
        }
    };

    const handleCellClick = (day, time) => {
        const existing = schedule[day]?.find(s => s.time === time);
        setEditingSlot({ day, time, ...existing });
        setSelectedSubject(existing?.subjectCode || '');
        setSelectedFaculty(existing?.facultyId || '');
    };

    const saveSlot = () => {
        if (!editingSlot) return;

        const { day, time } = editingSlot;
        const subject = structure.subjects.find(s => s.code === selectedSubject);
        const faculty = facultyList.find(f => f.id === selectedFaculty);

        if (!subject && selectedSubject !== 'BREAK') {
            // If clearing slot
            setSchedule(prev => ({
                ...prev,
                [day]: prev[day].filter(s => s.time !== time)
            }));
        } else {
            // Upsert slot
            let newSlot;

            if (selectedSubject === 'BREAK') {
                newSlot = {
                    time,
                    subjectCode: 'BREAK',
                    subjectName: 'Break / Recess',
                    facultyId: '',
                    facultyName: ''
                };
            } else {
                newSlot = {
                    time,
                    subjectCode: subject.code,
                    subjectName: subject.name,
                    facultyId: faculty?.id || '',
                    facultyName: faculty?.name || 'TBA'
                };
            }

            setSchedule(prev => {
                const daySlots = prev[day] || [];
                const distinct = daySlots.filter(s => s.time !== time);
                return {
                    ...prev,
                    [day]: [...distinct, newSlot].sort((a, b) => a.time.localeCompare(b.time))
                };
            });
        }
        setEditingSlot(null);
    };

    // Filter subjects for this class
    const classSubjects = structure?.subjects?.filter(s => s.branch === branch && s.year === Number(year)) || [];

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Planner...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex gap-2 w-full md:w-auto">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Branch</label>
                        <select className="block w-full p-2 border rounded mt-1" value={branch} onChange={e => setBranch(e.target.value)}>
                            {structure?.availableBranches?.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                        <select className="block w-full p-2 border rounded mt-1" value={year} onChange={e => setYear(e.target.value)}>
                            {structure?.years?.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Section</label>
                        <select className="block w-full p-2 border rounded mt-1" value={section} onChange={e => setSection(e.target.value)}>
                            {structure?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-md shadow-indigo-200"
                >
                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    Save Schedule
                </button>
            </div>

            {/* TIMETABLE GRID */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {/* ... (Existing table code) ... */}
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 bg-gray-50 border-b border-r min-w-[120px] font-bold text-gray-500">Day / Time</th>
                                {TIME_SLOTS.map(time => (
                                    <th key={time} className="p-4 bg-gray-50 border-b min-w-[160px] font-bold text-gray-700 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Clock size={14} className="text-gray-400" /> {time}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map(day => (
                                <tr key={day} className="hover:bg-gray-50">
                                    <td className="p-4 border-r border-b font-bold text-indigo-900 bg-indigo-50/30">{day}</td>
                                    {TIME_SLOTS.map(time => {
                                        const slot = schedule[day]?.find(s => s.time === time);
                                        const isBreak = slot?.subjectCode === 'BREAK';

                                        return (
                                            <td
                                                key={time}
                                                onClick={() => handleCellClick(day, time)}
                                                className={`p-2 border-b border-r cursor-pointer transition-colors relative h-24 align-top
                                                    ${isBreak ? 'bg-orange-50 hover:bg-orange-100' :
                                                        slot ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-100'}
                                                `}
                                            >
                                                {slot ? (
                                                    <div className="h-full flex flex-col justify-center items-center text-center gap-1 p-1">
                                                        {isBreak ? (
                                                            <div className="font-bold text-orange-600 flex flex-col items-center">
                                                                <span className="text-xl">☕</span>
                                                                <span className="text-xs uppercase tracking-wider">Break</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="font-bold text-indigo-800 text-sm leading-tight">{slot.subjectName}</span>
                                                                <span className="text-[10px] uppercase font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-600">{slot.subjectCode}</span>
                                                                <span className="text-xs text-gray-600">{slot.facultyName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100">
                                                        <Plus className="text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>



            {/* EDIT SLOT MODAL */}
            {editingSlot && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                            <span>Edit Slot</span>
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {editingSlot.day} @ {editingSlot.time}
                            </span>
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={selectedSubject}
                                    onChange={(e) => {
                                        const newSubject = e.target.value;
                                        setSelectedSubject(newSubject);

                                        // Debug Logs
                                        console.log("Subject Changed to:", newSubject);
                                        console.log("Current Assignments:", assignments);

                                        // Auto-select faculty if assigned in Structure
                                        const suggestion = assignments.find(a => a.subjectCode === newSubject);
                                        console.log("Found Suggestion:", suggestion);

                                        if (suggestion) {
                                            setSelectedFaculty(suggestion.facultyId);
                                        } else if (newSubject === 'BREAK') {
                                            setSelectedFaculty('');
                                        }
                                    }}
                                >
                                    <option value="">-- Free Period --</option>
                                    <option value="BREAK">☕ Break / Recess</option>
                                    {classSubjects.map(s => (
                                        <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedSubject && selectedSubject !== 'BREAK' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                                    {assignments.find(a => a.subjectCode === selectedSubject) ? (
                                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                                                    Mapped Faculty
                                                </span>
                                                <div className="font-semibold text-gray-900">
                                                    {facultyList.find(f => f.id === selectedFaculty)?.name || 'Unknown Faculty'}
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                                {facultyList.find(f => f.id === selectedFaculty)?.name?.charAt(0)}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={selectedFaculty}
                                                onChange={(e) => setSelectedFaculty(e.target.value)}
                                            >
                                                <option value="">TBA (Select Manual)</option>
                                                {facultyList.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                                <span>⚠️ This subject is not mapped in "Faculty" tab.</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingSlot(null)}
                                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveSlot}
                                    className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
