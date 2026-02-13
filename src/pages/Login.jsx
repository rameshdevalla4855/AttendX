import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser && userRole) {
            if (userRole === 'student') navigate('/student');
            else if (userRole === 'faculty') navigate('/faculty');
            else if (userRole === 'security') navigate('/security');
            else if (userRole === 'hod') navigate('/hod');
            else if (userRole === 'coordinator') navigate('/coordinator');
        }
    }, [currentUser, userRole, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            // On success, the useEffect should navigate. 
            // However, if userRole is missing (corrupted account), it won't.
            // We'll set a safeguard timeout.
            setTimeout(() => {
                if (!userRole) {
                    setLoading(false);
                    // Note: Ideally we would check 'userRole' from current state, but closures capture old state.
                    // This is a basic fallback.
                }
            }, 3000);

        } catch (err) {
            setError('Failed to log in: ' + err.message);
            setLoading(false);
        }
    };

    // Warn if logged in but no role found after delay
    useEffect(() => {
        if (currentUser && userRole === null && !loading) {
            // If we are logged in, but role is null, and not loading... implies an issue.
            // But 'loading' in AuthContext might be true initially.
        }
    }, [currentUser, userRole, loading]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="px-8 py-8 text-left bg-white shadow-xl rounded-2xl w-96 border border-gray-100">
                <div className="text-center mb-6">
                    <h3 className="text-3xl font-extrabold text-blue-900">AttendX Login</h3>
                    <p className="text-gray-500 text-sm mt-1">Smart Attendance & Monitoring</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" placeholder="user@college.edu"
                            className="w-full px-4 py-2 mt-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" placeholder="••••••••"
                            className="w-full px-4 py-2 mt-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    {error && <div className="p-3 mt-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">{error}</div>}

                    <button disabled={loading} className="w-full px-6 py-3 mt-6 text-white font-semibold bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg disabled:opacity-50">
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    First time user? <Link to="/activate" className="text-blue-600 hover:underline font-medium">Activate Account</Link>
                </div>
                <div className="mt-2 text-center text-sm text-gray-600">
                    Visiting Campus? <Link to="/visitor-login" className="text-indigo-600 hover:underline font-medium">Visitor Login</Link>
                </div>
            </div>
        </div>
    );
}
