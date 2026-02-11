import { X, LogOut, Phone, Mail, User, BookOpen, Hash, Briefcase, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { toast } from 'sonner';

export default function UserProfile({ isOpen, onClose, profile, onLogout, role = 'student' }) {
    // if (!profile) return null; // REMOVED to allow logout even if profile is missing

    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                await updatePassword(user, newPassword);
                toast.success("Password updated successfully!");
                setNewPassword('');
            } else {
                toast.error("No active user found.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating password. Requires recent login.");
        } finally {
            setLoading(false);
        }
    };

    const safeProfile = profile || { name: "Unknown User", rollNumber: "N/A", dept: "N/A", year: "N/A", email: "N/A", mobile: "N/A", parentMobile: "N/A", designation: "N/A", facultyId: "N/A", hodId: "N/A", securityId: "N/A" };
    const isStudent = role === 'student';

    const getUniqueId = () => {
        if (role === 'student') return safeProfile.rollNumber;
        if (role === 'faculty') return safeProfile.facultyId;
        if (role === 'hod') return safeProfile.hodId;
        if (role === 'coordinator') return safeProfile.coordinatorId;
        if (role === 'security') return safeProfile.securityId;
        return 'N/A';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 bg-blue-600 text-white flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold">{safeProfile.name}</h2>
                                <p className="text-blue-100">{getUniqueId()}</p>
                                <span className="inline-block px-2 py-0.5 mt-2 bg-blue-500 rounded text-xs uppercase tracking-wide font-bold">{role}</span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-blue-700 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 p-6 space-y-6">

                            {/* Academic/Work Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    {isStudent ? 'Academic Details' : 'Professional Details'}
                                </h3>
                                {!isStudent && safeProfile.designation && (
                                    <InfoItem icon={<Briefcase size={18} />} label="Designation" value={safeProfile.designation} />
                                )}
                                {!isStudent && role === 'security' && (
                                    <>
                                        <InfoItem icon={<Briefcase size={18} />} label="Gate Name" value={safeProfile.gateName} />
                                        <InfoItem icon={<Briefcase size={18} />} label="Shift" value={`${safeProfile.shiftStart || ''} - ${safeProfile.shiftEnd || ''}`} />
                                    </>
                                )}

                                {safeProfile.dept && (
                                    <InfoItem icon={<BookOpen size={18} />} label="Department" value={isStudent ? `${safeProfile.dept} (${safeProfile.departmentGroup})` : safeProfile.dept} />
                                )}

                                {isStudent && (
                                    <>
                                        <InfoItem icon={<Hash size={18} />} label="Year/Semester" value={safeProfile.year} />
                                        <InfoItem icon={<User size={18} />} label="Mentor ID" value={safeProfile.mentorId} />
                                    </>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contact Info</h3>
                                <InfoItem icon={<Mail size={18} />} label="Email" value={safeProfile.email} />
                                <InfoItem icon={<Phone size={18} />} label="Mobile" value={safeProfile.mobile} />
                                {isStudent && (
                                    <InfoItem icon={<Phone size={18} />} label="Parent Mobile" value={safeProfile.parentMobile} color="text-red-500" />
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">System Info</h3>
                                <InfoItem icon={<Hash size={18} />} label="Barcode / Biometric ID" value={safeProfile.barcodeId} />
                            </div>
                        </div>

                        {/* Footer - Password & Logout */}
                        <div className="p-6 bg-gray-50 border-t space-y-4">
                            {/* Change Password Section */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Lock size={16} className="text-indigo-500" /> Change Password
                                </h3>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="New Password (min 6 chars)"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={loading}
                                        className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Updating..." : "Update Password"}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl hover:bg-red-100 transition-all font-bold border border-red-100"
                            >
                                <LogOut size={20} />
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function InfoItem({ icon, label, value, color = "text-gray-800" }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-gray-400">{icon}</div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`font-medium ${color}`}>{value || 'N/A'}</p>
            </div>
        </div>
    );
}
