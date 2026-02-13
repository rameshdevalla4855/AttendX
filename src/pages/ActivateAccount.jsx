import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function ActivateAccount() {
    const [formData, setFormData] = useState({
        email: '',
        uniqueId: '', // Roll No or Faculty ID
        password: '',
        confirmPassword: ''
    });
    const [role, setRole] = useState('student'); // 'student', 'faculty', 'coordinator', etc.
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long.");
            setLoading(false);
            return;
        }

        try {
            // STEP 1: Verify Identity against Pre-loaded Data
            let collectionName = 'students';
            if (role === 'faculty') collectionName = 'faculty';
            if (role === 'hod') collectionName = 'hods';
            if (role === 'coordinator') collectionName = 'coordinators';
            if (role === 'security') collectionName = 'security';

            const docRef = doc(db, collectionName, formData.uniqueId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error("No record found with this ID. Please contact administration.");
            }

            const profileData = docSnap.data();

            // Strict Email Match Check
            if (profileData.email.toLowerCase() !== formData.email.toLowerCase()) {
                throw new Error("Email does not match the college record for this ID.");
            }

            // Check if already claimed
            if (profileData.uid && profileData.isClaimed) {
                throw new Error("This account is already activated. Please log in.");
            }

            // Function to Complete Activation (Steps 3 & 4)
            const completeActivation = async (user) => {
                // STEP 3: "Claim" the Profile (Link UID)
                await updateDoc(docRef, {
                    uid: user.uid,
                    isClaimed: true,
                    activatedAt: new Date()
                });

                // STEP 4: Create RbAC Rule in 'users' collection
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    role: role,
                    name: profileData.name
                });
            };

            // STEP 2: Create Firebase Auth Account
            let user;
            try {
                const userCredential = await signup(formData.email, formData.password);
                user = userCredential.user;
            } catch (authErr) {
                console.error("Auth Error Detail:", authErr.code, authErr.message);
                if (authErr.code === 'auth/email-already-in-use') {
                    // RECOVERY FLOW
                    try {
                        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                        user = userCredential.user;
                        console.log("Recovery: Signed in existing user to complete activation.");
                    } catch (loginErr) {
                        throw new Error("Email exists, but password verification failed. Cannot activate.");
                    }
                } else if (authErr.code === 'auth/weak-password') {
                    throw new Error("Password is too weak. Please use at least 6 characters.");
                } else {
                    throw authErr;
                }
            }

            // Proceed to Claim Profile if we have a valid User
            if (user) {
                await completeActivation(user);
                alert("Account Activated Successfully!");
                navigate('/' + role);
            }

        } catch (err) {
            console.error("Activation Error:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Helmet>
                <title>Activate Account | AttendX</title>
            </Helmet>
            <div className="px-8 py-8 text-left bg-white shadow-xl rounded-2xl w-full max-w-md">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-blue-900">Activate Account</h3>
                    <p className="text-sm text-gray-500">Verify your details to access the system</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">I am a...</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 mt-1 border rounded-lg bg-gray-50 focus:ring-blue-500"
                        >
                            <option value="student">Student</option>
                            <option value="faculty">Faculty Member</option>
                            <option value="coordinator">Dept. Coordinator</option>
                            <option value="hod">Head of Department (HOD)</option>
                            <option value="security">Security Staff</option>
                        </select>
                    </div>

                    {/* ID Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            {role === 'student' ? 'Roll Number' :
                                role === 'faculty' ? 'Faculty ID' :
                                    role === 'coordinator' ? 'Coordinator ID' :
                                        role === 'hod' ? 'HOD ID' : 'Security ID'}
                        </label>
                        <input
                            type="text"
                            placeholder={
                                role === 'student' ? "e.g. 23WJ1A7201" :
                                    role === 'faculty' ? "e.g. FAC001" :
                                        role === 'coordinator' ? "e.g. COORD01" :
                                            role === 'hod' ? "e.g. HOD001" : "e.g. SEC01"
                            }
                            className="w-full px-4 py-2 mt-1 border rounded-lg"
                            value={formData.uniqueId}
                            onChange={(e) => setFormData({ ...formData, uniqueId: e.target.value })}
                            required
                        />
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Official Email</label>
                        <input
                            type="email"
                            placeholder="Must match college records"
                            className="w-full px-4 py-2 mt-1 border rounded-lg"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {/* Password Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-2 mt-1 border rounded-lg"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-2 mt-1 border rounded-lg"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}

                    <button disabled={loading} className="w-full px-6 py-3 text-white font-semibold bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-md disabled:opacity-50">
                        {loading ? 'Verifying...' : 'Verify & Activate'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-600">
                    Already activated? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
                </div>
            </div>
        </div>
    );
}
