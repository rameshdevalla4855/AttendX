import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, limit, addDoc, onSnapshot, serverTimestamp, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import { LogOut, Plus, RefreshCw, Clock, CheckCircle, XCircle, ShieldAlert, User } from 'lucide-react';
import gniLogo from '../assets/gni-logo.png';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';

export default function VisitorDashboard() {
    const { currentUser, logout } = useAuth();
    const [activeVisit, setActiveVisit] = useState(null);
    const [visitorProfile, setVisitorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [profileForm, setProfileForm] = useState({
        name: '',
        studentRollNo: '',
        relation: 'Parent'
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // 1. Fetch Active Visit & Profile
    useEffect(() => {
        if (!currentUser) return;

        // Fetch Profile
        const fetchProfile = async () => {
            const docSnap = await getDoc(doc(db, "visitors", currentUser.uid));
            if (docSnap.exists()) {
                setVisitorProfile(docSnap.data());
            } else {
                setVisitorProfile(null);
            }
            setLoading(false);
        };
        fetchProfile();

        // Listen for Active Visits
        const q = query(
            collection(db, "visitorVisits"),
            where("visitorId", "==", currentUser.uid),
            orderBy("timestamp", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                // Check if it's from today (optional, but good for UI)
                // Actually, just show the latest. Logic in UI handles "No Active Pass" if old.
                setActiveVisit({ id: snapshot.docs[0].id, ...data });
            } else {
                setActiveVisit(null);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    const generatePass = async () => {
        if (!visitorProfile) return;
        setGenerating(true);
        try {
            const visitData = {
                visitorId: currentUser.uid,
                visitorName: visitorProfile.name,
                studentId: visitorProfile.studentId || visitorProfile.studentRollNo, // Fallback
                studentName: visitorProfile.studentName,
                // If we have studentRollNo, save it too for easier lookup
                studentRollNo: visitorProfile.studentRollNo || 'N/A',
                relation: visitorProfile.relation || 'Visitor', // Add relation for student notification
                securityId: null,
                status: 'PENDING',
                qrCode: `VISIT-${currentUser.uid.slice(0, 5)}-${Date.now().toString().slice(-6)}`.toUpperCase(),
                date: new Date().toLocaleDateString('en-CA'),
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, "visitorVisits"), visitData);

        } catch (error) {
            console.error("Error generating pass:", error);
            alert("Failed to generate pass. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            // Validate Student by Roll Number (Case Insensitive logic handled by trying exact match first)
            // Since Doc ID is RollNo, we can try getDoc first?
            // Users might type lowercase, but IDs might be uppercase? Import script didn't force uppercase.
            // Let's use a Query to be safe.
            const studentsRef = collection(db, "students");
            const qStudent = query(studentsRef, where("rollNumber", "==", profileForm.studentRollNo));
            const studentSnap = await getDocs(qStudent);

            let studentData = null;
            let studentId = null;

            if (!studentSnap.empty) {
                studentData = studentSnap.docs[0].data();
                studentId = studentSnap.docs[0].id; // This should be the RollNo
            } else {
                // Try Uppercase transformation just in case
                const qUpper = query(studentsRef, where("rollNumber", "==", profileForm.studentRollNo.toUpperCase()));
                const snapUpper = await getDocs(qUpper);
                if (!snapUpper.empty) {
                    studentData = snapUpper.docs[0].data();
                    studentId = snapUpper.docs[0].id;
                }
            }

            if (!studentData) {
                alert("Student not found! Please check the Roll Number.");
                setSavingProfile(false);
                return;
            }

            await setDoc(doc(db, "visitors", currentUser.uid), {
                uid: currentUser.uid,
                name: profileForm.name,
                mobile: currentUser.email?.split('@')[0] || '',
                studentRollNo: studentId, // Use the real ID
                studentId: studentId,
                studentName: studentData.name,
                relation: profileForm.relation,
                role: 'visitor',
                createdAt: serverTimestamp()
            });

            // Reload profile
            const newSnap = await getDoc(doc(db, "visitors", currentUser.uid));
            setVisitorProfile(newSnap.data());

        } catch (err) {
            console.error(err);
            alert("Error saving profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            case 'EXITED': return 'bg-gray-100 text-gray-700';
            case 'WAITING_APPROVAL': return 'bg-amber-100 text-amber-700';
            default: return 'bg-blue-50 text-blue-700'; // PENDING
        }
    };

    if (!loading && !visitorProfile) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
                    <p className="text-sm text-gray-500 mb-6">We need a few details to generate your pass.</p>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <input
                            placeholder="Your Name"
                            className="w-full p-3 border rounded-xl"
                            required
                            value={profileForm.name}
                            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                        />
                        <input
                            placeholder="Student Roll Number (e.g., 23WJ1A...)"
                            className="w-full p-3 border rounded-xl"
                            required
                            value={profileForm.studentRollNo}
                            onChange={e => setProfileForm({ ...profileForm, studentRollNo: e.target.value })}
                        />
                        <select
                            className="w-full p-3 border rounded-xl"
                            value={profileForm.relation}
                            onChange={e => setProfileForm({ ...profileForm, relation: e.target.value })}
                        >
                            <option value="Parent">Parent</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Other">Other</option>
                        </select>
                        <button disabled={savingProfile} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">
                            {savingProfile ? 'Saving...' : 'Save & Continue'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Same JSX as before... */}
            <Helmet>
                <title>My Visitor Pass | AttendX</title>
            </Helmet>

            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex-1">
                    <h1 className="font-bold text-lg text-gray-900">Visitor Pass</h1>
                    <p className="text-xs text-gray-500">Welcome, {visitorProfile?.name || 'Guest'}</p>
                </div>

                {/* Centered Logo */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden xs:block">
                    <img src={gniLogo} alt="GNI Logo" className="h-11 w-auto object-contain mix-blend-multiply" />
                </div>

                <div className="flex-1 flex justify-end">
                    <button onClick={logout} className="p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="p-4 max-w-md mx-auto space-y-6">

                {/* Active Pass Card */}
                {loading ? (
                    <div className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
                ) : activeVisit && activeVisit.status !== 'EXITED' && activeVisit.date === new Date().toLocaleDateString('en-CA') ? (
                    <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden relative">
                        <div className={`p-4 text-center border-b ${getStatusColor(activeVisit.status)}`}>
                            <p className="font-bold text-xs uppercase tracking-widest">Current Status</p>
                            <h2 className="text-xl font-black mt-1">{activeVisit.status.replace('_', ' ')}</h2>
                        </div>

                        <div className="p-8 flex flex-col items-center justify-center bg-white space-y-6">
                            <div className="p-4 bg-white rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 relative group">
                                <QRCodeCanvas
                                    value={activeVisit.qrCode}
                                    size={200}
                                    fgColor={activeVisit.status === 'REJECTED' ? '#ef4444' : '#000000'}
                                    level="H"
                                />
                                {activeVisit.status === 'REJECTED' && (
                                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-red-600 font-bold backdrop-blur-sm">
                                        <XCircle size={48} className="mb-2" />
                                        <span>ENTRY DENIED</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-center space-y-1">
                                <p className="text-xs text-gray-400 font-mono">{activeVisit.qrCode}</p>
                                <p className="text-sm font-medium text-gray-600">Show this QR code at the security gate.</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 border-t flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-gray-400" />
                                <span className="font-bold text-gray-700">Student:</span>
                                <span>{activeVisit.studentName || 'Loading...'}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                                {format(activeVisit.timestamp?.toDate() || new Date(), 'h:mm a')}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Active Pass</h3>
                        <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
                            Generate a new pass when you are ready to visit the campus.
                        </p>

                        <button
                            onClick={generatePass}
                            disabled={generating}
                            className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-gray-200 active:scale-95 transition-all"
                        >
                            {generating ? <RefreshCw className="animate-spin" /> : <Plus size={20} />}
                            Generate New Pass
                        </button>
                    </div>
                )}

                {/* History Teaser (Optional) */}
                {activeVisit && (activeVisit.status === 'EXITED' || activeVisit.date !== new Date().toLocaleDateString('en-CA')) && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 opacity-60">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Last Visit</p>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{format(activeVisit.timestamp?.toDate() || new Date(), 'MMM d, yyyy')}</span>
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-600">{activeVisit.status}</span>
                        </div>
                    </div>
                )}

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2 mb-2">
                        <ShieldAlert size={16} /> Instructions
                    </h4>
                    <ul className="text-xs text-indigo-800/80 space-y-1.5 list-disc pl-4">
                        <li>Show QR at the entry gate.</li>
                        <li>Wait for student approval notification.</li>
                        <li>Do not exit without final approval.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
