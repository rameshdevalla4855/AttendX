import { useState, useEffect } from 'react';
import { academicService } from '../../services/academicService';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';

export default function StructureManager({ readOnly = false, profile }) {
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Temp inputs
    const [newBranch, setNewBranch] = useState('');
    const [newSection, setNewSection] = useState('');

    // Filters
    const [filterBranch, setFilterBranch] = useState('');
    const [filterYear, setFilterYear] = useState('');

    // Derived Coordinator Dept
    // Profile might have 'dept' or 'branch'. Adjust as needed based on actual data.
    const coordinatorDept = profile?.dept || profile?.branch;

    const loadStructure = async () => {
        setLoading(true);
        try {
            const data = await academicService.getStructure();
            if (data) {
                // Ensure departmentMap exists
                if (!data.departmentMap) data.departmentMap = {};
                setStructure(data);

                // If coordinator or HOD, default filter to their first mapped branch or their dept
                if (coordinatorDept) {
                    setFilterBranch(coordinatorDept);
                }
            }
        } catch (err) {
            console.error("Failed to load structure", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStructure();
    }, [profile]);

    const handleSave = async () => {
        if (readOnly) return;
        setSaving(true);
        try {
            await academicService.updateStructure(structure);
            alert("Configuration Saved Successfully!");
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const addItem = (field, value, setter) => {
        if (!value.trim()) return;
        const val = value.trim().toUpperCase(); // Enforce uppercase

        if (field === 'branches') {
            // Check global existence
            if (structure.branches.includes(val)) {
                alert("Branch already exists globally!");
                // Note: If it exists but isn't mapped to this coordinator, should we map it?
                // For now, let's assume we can map it if it's not mapped yet? 
                // Or just allow adding to map.
            }

            // Update Structure
            setStructure(prev => {
                const newBranches = prev.branches.includes(val) ? prev.branches : [...prev.branches, val];

                // If coordinator, add to their map
                let newMap = { ...prev.departmentMap };
                if (coordinatorDept) {
                    const currentDeptBranches = newMap[coordinatorDept] || [];
                    if (!currentDeptBranches.includes(val)) {
                        newMap[coordinatorDept] = [...currentDeptBranches, val];
                    }
                }

                return {
                    ...prev,
                    branches: newBranches,
                    departmentMap: newMap
                };
            });
        } else {
            // Sections / Others (Global for now, or per branch? Structure is typically global sections like A,B,C)
            if (structure[field].includes(val)) {
                alert("Item already exists!");
                return;
            }
            setStructure(prev => ({
                ...prev,
                [field]: [...prev[field], val]
            }));
        }
        setter('');
    };

    const removeItem = (field, value) => {
        if (!confirm(`Are you sure you want to remove ${value}?`)) return;

        if (field === 'branches') {
            setStructure(prev => {
                // Remove from global list? ONLY if we want to delete it entirely.
                // But maybe we only want to unmap it? 
                // User requirement: "manage particular branches". 
                // Let's remove from global for now to keep it simple, 
                // AND remove from all maps.

                const newBranches = prev.branches.filter(b => b !== value);
                const newMap = { ...prev.departmentMap };

                // Remove from all maps
                Object.keys(newMap).forEach(dept => {
                    newMap[dept] = newMap[dept].filter(b => b !== value);
                });

                return { ...prev, branches: newBranches, departmentMap: newMap };
            });
        } else {
            setStructure(prev => ({
                ...prev,
                [field]: prev[field].filter(item => item !== value)
            }));
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Configuration...</div>;
    if (!structure) return <div className="p-8 text-center text-red-500">Error loading structure.</div>;

    // Filter Logic for Display
    // If Coordinator or HOD, show only branches in their map
    let visibleBranches = structure.branches;
    if (coordinatorDept) {
        visibleBranches = structure.departmentMap?.[coordinatorDept] || [];
        // If map is empty, maybe show nothing or just the dept itself if it matches a branch?
        if (visibleBranches.length === 0 && structure.branches.includes(coordinatorDept)) {
            visibleBranches = [coordinatorDept];
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Academic Structure</h2>
                    <p className="text-sm text-gray-500">
                        {coordinatorDept ? `Managing ${coordinatorDept} Department` : "Global Configuration"}
                    </p>
                </div>
                {!readOnly && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BRANCHES */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">
                        {coordinatorDept ? "My Branches" : "All Branches"}
                    </h3>
                    {!readOnly && (
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border rounded-lg uppercase"
                                placeholder="New Branch (e.g. AI-ML)"
                                value={newBranch}
                                onChange={e => setNewBranch(e.target.value)}
                            />
                            <button
                                onClick={() => addItem('branches', newBranch, setNewBranch)}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {visibleBranches.map(b => (
                            <div key={b} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                                {b}
                                {!readOnly && <button onClick={() => removeItem('branches', b)} className="text-blue-400 hover:text-red-500"><Trash2 size={14} /></button>}
                            </div>
                        ))}
                        {visibleBranches.length === 0 && <p className="text-gray-400 text-sm">No branches mapped.</p>}
                    </div>
                </div>

                {/* SECTIONS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Sections</h3>
                    {!readOnly && (
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border rounded-lg uppercase"
                                placeholder="New Section"
                                value={newSection}
                                onChange={e => setNewSection(e.target.value)}
                            />
                            <button
                                onClick={() => addItem('sections', newSection, setNewSection)}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {structure.sections.map(s => (
                            <div key={s} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                                {s}
                                {!readOnly && <button onClick={() => removeItem('sections', s)} className="text-green-400 hover:text-red-500"><Trash2 size={14} /></button>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* YEARS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Academic Years</h3>
                    <div className="flex flex-wrap gap-2">
                        {structure.years.map(y => (
                            <div key={y} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">
                                Year {y}
                            </div>
                        ))}
                    </div>
                </div>

                {/* SUBJECT MASTER */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800">Subject Master List</h3>
                            <p className="text-sm text-gray-500">Manage subjects per Branch & Year</p>
                        </div>

                        {/* FILTERS */}
                        <div className="flex gap-2">
                            <select
                                className="px-3 py-2 border rounded-lg bg-gray-50 text-sm font-medium"
                                value={filterBranch}
                                onChange={(e) => setFilterBranch(e.target.value)}
                            >
                                <option value="">All Branches</option>
                                {visibleBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select
                                className="px-3 py-2 border rounded-lg bg-gray-50 text-sm font-medium"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                            >
                                <option value="">All Years</option>
                                {structure.years.map(y => <option key={y} value={y}>{`Year ${y}`}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Add Subject Form - HIDDEN in ReadOnly */}
                    {!readOnly && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                            <input
                                placeholder="Code (e.g CS101)"
                                className="p-2 border rounded"
                                id="subCode"
                            />
                            <input
                                placeholder="Subject Name"
                                className="p-2 border rounded md:col-span-2"
                                id="subName"
                            />
                            <select
                                className="p-2 border rounded disabled:bg-gray-100"
                                id="subBranch"
                                value={filterBranch || ''}
                                onChange={(e) => !filterBranch && setFilterBranch(e.target.value)} // Optional: allow changing if filter not strict
                                disabled={!!filterBranch} // Lock if filtered
                            >
                                <option value="">Select Branch</option>
                                {visibleBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select
                                className="p-2 border rounded disabled:bg-gray-100"
                                id="subYear"
                                value={filterYear || ''}
                                onChange={(e) => !filterYear && setFilterYear(e.target.value)}
                                disabled={!!filterYear}
                            >
                                <option value="">Select Year</option>
                                {structure.years.map(y => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                            <button
                                onClick={() => {
                                    const code = document.getElementById('subCode').value;
                                    const name = document.getElementById('subName').value;
                                    // Use filter values if present, else fallback to input values (which might be empty if disabled? No, value prop handles it)
                                    // Actually, if disabled, value might not be submitted in a form, but here we read by ID directly.
                                    // However, controlled inputs `value={filterBranch}` need onChange.
                                    // Easier approach: Just read the state variables if set, else read element.
                                    const branch = filterBranch || document.getElementById('subBranch').value;
                                    const year = filterYear ? Number(filterYear) : Number(document.getElementById('subYear').value);

                                    if (!branch || !year) {
                                        alert("Please select Branch and Year");
                                        return;
                                    }

                                    if (code && name) {
                                        setStructure(prev => ({
                                            ...prev,
                                            subjects: [...(prev.subjects || []), { code, name, branch, year }]
                                        }));
                                        // Clear text inputs only
                                        document.getElementById('subCode').value = '';
                                        document.getElementById('subName').value = '';
                                    }
                                }}
                                className="md:col-span-5 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                            >
                                <Plus size={18} /> Add Subject
                            </button>
                        </div>
                    )}

                    {/* Subject List */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 uppercase">
                                <tr>
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Branch</th>
                                    <th className="p-3">Year</th>
                                    {!readOnly && <th className="p-3">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {structure.subjects
                                    ?.filter(sub =>
                                        (!filterBranch ? visibleBranches.includes(sub.branch) : sub.branch === filterBranch) &&
                                        (!filterYear || Number(sub.year) === Number(filterYear))
                                    )
                                    .map((sub, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-3 font-mono font-bold">{sub.code}</td>
                                            <td className="p-3">{sub.name}</td>
                                            <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{sub.branch}</span></td>
                                            <td className="p-3">Year {sub.year}</td>
                                            {!readOnly && (
                                                <td className="p-3">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete subject?')) {
                                                                setStructure(prev => ({
                                                                    ...prev,
                                                                    subjects: prev.subjects.filter((_, i) => i !== idx)
                                                                }));
                                                            }
                                                        }}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
