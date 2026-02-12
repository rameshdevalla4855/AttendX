import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { UserCheck, XCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ... imports remain same

export default function VisitorRequestCard({ currentUser, profile }) {
    const [request, setRequest] = useState(null);

    useEffect(() => {
        if (!currentUser?.uid || !profile) return;

        // Determine the correct ID to query (Roll Number is safer as it's the Doc ID for imported students)
        const studentIdToQuery = profile.rollNumber || profile.id || currentUser.uid;

        const q = query(
            collection(db, "visitorVisits"),
            where("studentId", "==", studentIdToQuery),
            where("status", "==", "WAITING_APPROVAL")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // Get the first (oldest) pending request
                const docSnap = snapshot.docs[0];
                setRequest({ id: docSnap.id, ...docSnap.data() });
            } else {
                setRequest(null);
            }
        });

        return () => unsubscribe();
    }, [currentUser, profile]); // Added profile dependency

    const handleAction = async (status) => {
        if (!request) return;

        try {
            await updateDoc(doc(db, "visitorVisits", request.id), {
                status: status,
                approvalTime: serverTimestamp()
            });
            toast.success(status === 'APPROVED' ? "Visitor Approved! ✅" : "Visitor Rejected ❌");
        } catch (error) {
            console.error("Error updating visit:", error);
            toast.error("Failed to update status.");
        }
    };

    if (!request) return null;

    return (
        <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(251,146,60,0.1)] animate-in fade-in slide-in-from-top-4 duration-500 mb-8 relative overflow-hidden backdrop-blur-sm">
            {/* Pulsing Background */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-orange-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-5">
                    <div className="p-3 bg-white text-orange-600 rounded-2xl shadow-sm border border-orange-50">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">Visitor Request</h3>
                        <p className="text-xs text-orange-700 font-medium flex items-center gap-1.5 mt-0.5">
                            <Clock size={12} /> Waiting for your approval
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm mb-6 bg-white/50 p-4 rounded-2xl border border-orange-50/50">
                    <div>
                        <p className="text-orange-900/50 text-[10px] uppercase tracking-wider font-bold mb-1">Name</p>
                        <p className="font-bold text-gray-900 text-base">{request.visitorName}</p>
                    </div>
                    <div>
                        <p className="text-orange-900/50 text-[10px] uppercase tracking-wider font-bold mb-1">Relation</p>
                        <p className="font-bold text-gray-900 text-base">{request.relation}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-orange-100/50">
                        <p className="text-orange-900/50 text-[10px] uppercase tracking-wider font-bold mb-1">Purpose</p>
                        <p className="font-medium text-gray-800">{request.purpose || 'Visit'}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleAction('REJECTED')}
                        className="flex-1 py-3.5 px-4 bg-white border border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <XCircle size={18} /> Reject
                    </button>
                    <button
                        onClick={() => handleAction('APPROVED')}
                        className="flex-1 py-3.5 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <CheckCircle size={18} /> Approve
                    </button>
                </div>
            </div>
        </div>
    );
}
