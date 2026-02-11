import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { UserCheck, XCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function VisitorRequestCard({ currentUser, profile }) {
    const [request, setRequest] = useState(null);

    useEffect(() => {
        if (!currentUser?.uid || !profile) return;

        // Determine the correct ID to query (Roll Number is safer as it's the Doc ID for imported students)
        // If profile.uid exists (claimed), we might need to check both? 
        // But VisitorLogin saves studentId as the Document ID (which is RollNo).
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
    }, [currentUser]);

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
        <div className="bg-orange-50 border border-orange-200 rounded-[2rem] p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 mb-6 relative overflow-hidden">
            {/* Pulsing Background */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-50 animate-pulse"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Visitor Request</h3>
                        <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
                            <Clock size={12} /> Waiting for your approval
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Name</p>
                        <p className="font-bold text-gray-900">{request.visitorName}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Relation</p>
                        <p className="font-bold text-gray-900">{request.relation}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Purpose</p>
                        <p className="font-medium text-gray-800">{request.purpose || 'Visit'}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleAction('REJECTED')}
                        className="flex-1 py-3 px-4 bg-white border border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <XCircle size={18} /> Reject
                    </button>
                    <button
                        onClick={() => handleAction('APPROVED')}
                        className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                    >
                        <CheckCircle size={18} /> Approve
                    </button>
                </div>
            </div>
        </div>
    );
}
