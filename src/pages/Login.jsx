import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, ExternalLink, UserCheck } from 'lucide-react';
import gniLogo from '../assets/gni-logo.png';

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
        } catch (err) {
            setError('Failed to log in: ' + err.message);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-indigo-50 p-4">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] border border-white/40 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Header Section */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldCheck size={120} />
                    </div>

                    <div className="flex items-center justify-center mb-6">
                        <div className="bg-white p-3 rounded-2xl shadow-xl">
                            <img src={gniLogo} alt="GNI Logo" className="h-14 w-auto object-contain" />
                        </div>
                    </div>

                    <div className="text-center relative z-10">
                        <h1 className="text-3xl font-black tracking-tight">AttendX</h1>
                        <p className="text-indigo-100/80 text-sm font-medium mt-1 uppercase tracking-[0.2em]">Management Portal</p>
                    </div>
                </div>

                {/* Form Section */}
                <div className="p-8 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Academic Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="user@gniindia.org"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 text-right block">Security Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 text-sm text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="w-1 h-1 rounded-full bg-rose-600 shrink-0"></div>
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full py-4 text-white font-bold bg-indigo-600 rounded-2xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Syncing...</span>
                                </div>
                            ) : (
                                <>
                                    <span>Secure Sign In</span>
                                    <LogIn size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Access Links */}
                    <div className="mt-10 space-y-4">
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-300 uppercase tracking-widest before:content-[''] before:flex-1 before:h-px before:bg-slate-100 after:content-[''] after:flex-1 after:h-px after:bg-slate-100">
                            Access Options
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/activate" className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all group">
                                <UserCheck size={20} className="text-slate-400 group-hover:text-indigo-600" />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700 underline underline-offset-4 decoration-slate-200">Activate</span>
                            </Link>

                            <Link to="/visitor-login" className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-900 hover:text-white transition-all group">
                                <ExternalLink size={20} className="text-slate-400 group-hover:text-indigo-400" />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-white underline underline-offset-4 decoration-slate-200">Visitor Hub</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Brand */}
                <div className="p-6 text-center border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">Guru Nanak Institutions</p>
                </div>
            </div>
        </div>
    );
}
