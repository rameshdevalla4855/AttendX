import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserCheck, Phone, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function VisitorLogin() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        mobile: '',
        studentRollNo: '', // Changed from Mobile to RollNo
        relation: 'Parent'
    });

    const { login, signup, currentUser, userRole, logout } = useAuth(); // Need currentUser/Role
    const navigate = useNavigate();

    const [error, setError] = useState('');

    // Removed Auto-Repair useEffect to ensure we capture Name from form submission.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const generatedEmail = `${formData.mobile}@visitor.sfm.com`;
        const generatedPassword = `sfm_vms_${formData.mobile}`;

        try {
            let userCred;
            let isNewUser = false;

            // 1. Try Login
            try {
                userCred = await login(generatedEmail, generatedPassword);
            } catch (loginErr) {
                if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
                    isNewUser = true;
                    // Validate Fields for Signup
                    if (!formData.name || !formData.studentRollNo) {
                        throw new Error("Name and Student Roll Number are required.");
                    }
                    userCred = await signup(generatedEmail, generatedPassword);
                } else {
                    throw loginErr;
                }
            }

            const user = userCred.user;

            // 2. Ensure Role Doc Exists (Self-Healing for everyone)
            await setDoc(doc(db, "users", user.uid), {
                email: generatedEmail,
                role: 'visitor',
                uid: user.uid
            }, { merge: true });

            // 3. Ensure Visitor Profile Exists (Zombie Fix)
            const visitorDocRef = doc(db, "visitors", user.uid);
            const visitorSnap = await getDoc(visitorDocRef);

            if (!visitorSnap.exists() || isNewUser) {
                // Profile missing OR New User -> Create/Restore Profile

                const studentsRef = collection(db, "students");
                // Query by Roll Number (Try exact, then uppercase)
                const qStudent = query(studentsRef, where("rollNumber", "==", formData.studentRollNo));
                let studentSnap = await getDocs(qStudent);

                let studentData = null;
                let studentId = null;

                if (!studentSnap.empty) {
                    studentData = studentSnap.docs[0].data();
                    studentId = studentSnap.docs[0].id;
                } else {
                    // Try Uppercase
                    const qUpper = query(studentsRef, where("rollNumber", "==", formData.studentRollNo.toUpperCase()));
                    studentSnap = await getDocs(qUpper);
                    if (!studentSnap.empty) {
                        studentData = studentSnap.docs[0].data();
                        studentId = studentSnap.docs[0].id;
                    }
                }

                if (!studentData) {
                    // If it's a new user, we rollback.
                    if (isNewUser) await user.delete();
                    throw new Error(`Student with Roll No '${formData.studentRollNo}' not found.`);
                }

                await setDoc(visitorDocRef, {
                    uid: user.uid,
                    name: formData.name,
                    mobile: formData.mobile,
                    studentRollNo: studentId,
                    studentId: studentId,
                    studentName: studentData.name,
                    relation: formData.relation,
                    role: 'visitor',
                    createdAt: serverTimestamp()
                });
                console.log("Visitor Profile Created/Restored.");
            }

            toast.success(isNewUser ? "Account created!" : "Welcome back!");
            navigate('/visitor-dashboard');

        } catch (error) {
            console.error("Auth Error:", error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

                {/* Decorative */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-lg">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Visitor Access</h1>
                        <p className="text-indigo-200 text-sm">Enter your mobile number to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 text-sm font-medium">
                                ⚠️ {error}
                            </div>
                        )}

                        <input
                            type="tel"
                            placeholder="Your Mobile Number"
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors text-lg font-medium tracking-wide"
                            value={formData.mobile}
                            onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                        />

                        {/* Additional fields only show if we suspect it's a new signup? 
                            Actually, to keep it simple as requested, let's always show them or just show them initially?
                            The user said "remove email and password". 
                            If I just show Mobile, I can't get Name/StudentMobile for new users.
                            So I will Keep Name/Student fields visible always for simplicity, OR 
                            I'll merge the forms.
                            Let's keep the fields simple: Name, Mobile, StudentMobile.
                            If they exist, we ignore Name/StudentMobile and just Login.
                            If they don't, we use them.
                        */}
                        <div className="grid grid-cols-1 gap-4">
                            <input
                                type="text"
                                placeholder="Your Name"
                                required // Required for new users, but existing users might find it annoying. 
                                // Ideally we check existence first. But that leaks info.
                                // Let's make it required. If they are logging in, we just ignore it.
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />

                            <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                                <UserCheck size={12} /> Student Verification
                            </label>
                            <input
                                type="text"
                                placeholder="Student's Roll Number (e.g. 23WJ1A...)"
                                required
                                className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors uppercase"
                                value={formData.studentRollNo}
                                onChange={e => setFormData({ ...formData, studentRollNo: e.target.value })}
                            />

                            <select
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 [&>option]:text-black"
                                value={formData.relation}
                                onChange={e => setFormData({ ...formData, relation: e.target.value })}
                            >
                                <option value="Parent">Parent</option>
                                <option value="Guardian">Guardian</option>
                                <option value="Sibling">Sibling</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Access Portal <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <Link to="/login" className="text-xs text-gray-500 hover:text-white transition-colors">
                            Back to Student/Faculty Login
                        </Link>
                    </div>
                </div>
            </div >
        </div >
    );
}
