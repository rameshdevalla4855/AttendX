import React, { useState, useEffect, useRef } from 'react';
import QrScanner from '../../components/QrScanner';
import { db } from '../../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logAttendance, getLastAttendance, clearAllAttendanceLogs, logSecurityAlert } from '../../utils/dbUtils';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';
import { sendSMS } from '../../services/smsService';

export default function ScannerTab({ currentUser }) {
    const [scanResult, setScanResult] = useState(null);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, processing, success, error, warning
    const [feedbackMessage, setFeedbackMessage] = useState('Ready to Scan');
    const [scannedUser, setScannedUser] = useState(null);

    // Refs for synchronous locking
    const lastProcessTimeRef = useRef(0);
    const isProcessingRef = useRef(false);



    const playSuccessSound = () => { /* Placeholder */ };
    const playErrorSound = () => { /* Placeholder */ };

    const handleReset = async () => {
        if (window.confirm("ARE YOU SURE? This will delete ALL attendance logs for everyone.")) {
            try {
                await clearAllAttendanceLogs();
                alert("All logs cleared!");
                setFeedbackMessage('System Reset Complete');
            } catch (e) {
                alert("Failed to clear logs: " + e.message);
            }
        }
    };

    const lookupUser = async (id) => {
        // 1. Try 'users' collection (Activated Accounts)
        let userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
            const authData = userSnap.data();
            const role = authData.role || 'student'; // Default to student if missing
            const collectionName = role === 'faculty' ? 'faculty' : 'students';

            // A. Try Direct ID Match (if Profile ID == UID)
            let profileSnap = await getDoc(doc(db, collectionName, id));

            // B. If not found, Query by 'uid' field (if Profile stored under RollNo but has uid field)
            if (!profileSnap.exists()) {
                const q = query(collection(db, collectionName), where("uid", "==", id));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    profileSnap = querySnapshot.docs[0];
                }
            }

            // C. If still not found, Query by 'email' (Strongest link)
            if (!profileSnap.exists() && authData.email) {
                const q = query(collection(db, collectionName), where("email", "==", authData.email));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    profileSnap = querySnapshot.docs[0];
                }
            }

            if (profileSnap && profileSnap.exists()) {
                return { ...authData, ...profileSnap.data(), uid: id, role: role, source: 'users_linked' };
            }
            return { ...authData, uid: id, source: 'users' };
        }

        // 2. Try 'students' collection (Direct RollNo lookup)
        userSnap = await getDoc(doc(db, "students", id));
        if (userSnap.exists()) {
            const d = userSnap.data();
            return { ...d, uid: d.uid || userSnap.id, role: 'student', source: 'students' };
        }

        // 3. Try 'faculty' collection (Direct ID lookup)
        userSnap = await getDoc(doc(db, "faculty", id));
        if (userSnap.exists()) {
            const d = userSnap.data();
            return { ...d, uid: d.uid || userSnap.id, role: 'faculty', source: 'faculty' };
        }

        // 4. Try Barcode ID fallback (Student IDs)
        const qBarcode = query(collection(db, "students"), where("barcodeId", "==", id.trim()));
        const barcodeSnap = await getDocs(qBarcode);
        if (!barcodeSnap.empty) {
            const d = barcodeSnap.docs[0];
            const data = d.data();
            return { ...data, uid: data.uid || d.id, id: d.id, role: 'student', source: 'barcode' };
        }

        return null;
    };

    const processScan = async (decodedText) => {
        const now = Date.now();
        if (now - lastProcessTimeRef.current < 3000 || isProcessingRef.current) {
            return;
        }

        lastProcessTimeRef.current = now;
        isProcessingRef.current = true;

        setScanResult(decodedText);
        setScanStatus('processing');
        setFeedbackMessage('Verifying ID...');

        try {
            // --- VISITOR LOGIC ---
            if (decodedText.startsWith('VISIT-')) {
                const q = query(collection(db, "visitorVisits"), where("qrCode", "==", decodedText));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    throw new Error("Invalid Visitor Pass");
                }

                const docRef = snapshot.docs[0].ref;
                const visitData = snapshot.docs[0].data();

                // Check Date Validity (Optional, but good practice)
                const today = new Date().toLocaleDateString('en-CA');
                if (visitData.date !== today) {
                    throw new Error("Pass Expired (Wrong Date)");
                }

                if (visitData.status === 'PENDING') {
                    // ENTRY SCAN
                    await logAttendance(visitData.visitorId, 'visitor', 'ENTRY', currentUser.uid, {
                        name: visitData.visitorName,
                        dept: 'VISITOR',
                        purpose: visitData.purpose,
                        student: visitData.studentName,
                        rollNumber: visitData.qrCode // Store QR as ID
                    });

                    // Update Visit Status
                    await updateDoc(docRef, {
                        status: 'WAITING_APPROVAL',
                        entryTime: serverTimestamp(),
                        securityId: currentUser.uid
                    });

                    setScannedUser({ name: visitData.visitorName, role: 'Visitor', dept: 'Waiting Approval' });
                    setScanStatus('warning'); // Orange for waiting
                    setFeedbackMessage('Entry Recorded. Waiting for Student Approval.');
                    playSuccessSound();

                } else if (visitData.status === 'APPROVED') {
                    // EXIT SCAN
                    await logAttendance(visitData.visitorId, 'visitor', 'EXIT', currentUser.uid, {
                        name: visitData.visitorName,
                        dept: 'VISITOR',
                        rollNumber: visitData.qrCode // Store QR as ID
                    });

                    await updateDoc(docRef, {
                        status: 'EXITED',
                        exitTime: serverTimestamp()
                    });

                    setScannedUser({ name: visitData.visitorName, role: 'Visitor', dept: 'Exit Approved' });
                    setScanStatus('success');
                    setFeedbackMessage('Exit Approved. Goodbye!');
                    playSuccessSound();

                } else if (visitData.status === 'WAITING_APPROVAL') {
                    setScannedUser({ name: visitData.visitorName, role: 'Visitor', dept: 'Pending' });
                    setScanStatus('warning');
                    setFeedbackMessage('Already Checked In. Student approval pending.');
                } else if (visitData.status === 'REJECTED') {
                    throw new Error("Entry Rejected by Student.");
                } else if (visitData.status === 'EXITED') {
                    throw new Error("Pass Expired (Already Exited)");
                }

                // Reset
                setTimeout(() => {
                    setScanStatus('idle');
                    setFeedbackMessage('Ready to Scan');
                    setScanResult(null);
                    setScannedUser(null);
                    isProcessingRef.current = false;
                }, 3500); // Longer delay for reading status
                return;
            }

            // --- STUDENT / FACULTY LOGIC ---
            const userData = await lookupUser(decodedText);

            if (!userData) {
                throw new Error("Invalid ID: Record not found.");
            }

            setScannedUser(userData);

            // Role Check
            if (!['student', 'faculty'].includes(userData.role)) {
                throw new Error(`Unauthorized Role: ${userData.role}`);
            }

            const targetUid = userData.uid || decodedText;
            const lastLog = await getLastAttendance(targetUid);
            const todayDate = new Date().toISOString().split('T')[0];

            let type = 'ENTRY';

            if (lastLog && lastLog.date === todayDate) {
                if (lastLog.type === 'ENTRY') {
                    type = 'EXIT';
                } else if (lastLog.type === 'EXIT') {
                    // Log Alert
                    await logSecurityAlert({
                        uid: targetUid,
                        name: userData.name,
                        type: 'BLOCKED',
                        reason: 'Daily Limit Reached (Already Checked Out)'
                    });
                    throw new Error("Daily Limit Reached: Already checked out today.");
                }
            }

            await logAttendance(targetUid, userData.role, type, currentUser.uid, {
                name: userData.name,
                dept: userData.dept || userData.Dept || userData.department || userData.Department || userData.branch || userData.Branch || 'N/A',
                // Support Roll No (Students) or Faculty ID (Faculty)
                rollNumber: userData.rollNumber || userData.RollNumber || userData.rollNo || userData.RollNo || userData.facultyId || 'N/A'
            });

            // Success
            setScanStatus('success');
            setFeedbackMessage(`${type === 'ENTRY' ? 'Checked In' : 'Checked Out'}`);
            playSuccessSound();

            if (userData.parentMobile && type === 'ENTRY') {
                sendSMS(userData.parentMobile, `AttendX: ${userData.name} entered campus.`);
            }

            // Reset
            setTimeout(() => {
                setScanStatus('idle');
                setFeedbackMessage('Ready to Scan');
                setScanResult(null);
                setScannedUser(null);
                isProcessingRef.current = false; // Unlock
            }, 2500);

        } catch (err) {
            console.error(err);
            setScanStatus('error');
            setFeedbackMessage(err.message);
            playErrorSound();

            setTimeout(() => {
                setScanStatus('idle');
                setFeedbackMessage('Ready to Scan');
                setScanResult(null);
                isProcessingRef.current = false; // Unlock
            }, 2500);
        }
    };



    return (
        <div className="w-full h-full bg-black relative overflow-hidden flex flex-col justify-center items-center">

            {/* Main Content Wrapper - Centers everything */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">

                {/* 1. Top Status (Floating above frame) */}
                <div className="absolute top-[10%] z-20 transition-all duration-300 w-full flex justify-center">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-xl relative">
                        {/* Reset Button (Integrated subtly) */}
                        <button
                            onClick={handleReset}
                            className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-red-400 transition-colors"
                            title="Clear All Logs"
                        >
                            <Trash2 size={16} />
                        </button>

                        <p className="text-white font-medium text-sm flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${scanStatus === 'processing' ? 'bg-yellow-400 text-yellow-400' : scanStatus === 'error' ? 'bg-red-500 text-red-500' : 'bg-green-500 text-green-500'}`}></span>
                            <span className="tracking-wide uppercase text-xs opacity-70">Status:</span>
                            {feedbackMessage}
                        </p>
                    </div>
                </div>

                {/* 2. Scanning Frame (The Anchor) */}
                <div className="w-72 h-72 sm:w-80 sm:h-80 relative border-2 border-white/20 rounded-3xl overflow-hidden backdrop-blur-[2px] shadow-[0_0_100px_rgba(79,70,229,0.15)] bg-black/50 pointer-events-auto shrink-0 mt-8 mb-8">

                    {/* QR Scanner - Constrained to this box */}
                    <div className="absolute inset-0 z-0">
                        <QrScanner onScan={processScan} />
                    </div>

                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-[6px] border-l-[6px] border-indigo-500 rounded-tl-2xl shadow-[-4px_-4px_12px_rgba(79,70,229,0.4)] z-10 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-[6px] border-r-[6px] border-indigo-500 rounded-tr-2xl shadow-[4px_-4px_12px_rgba(79,70,229,0.4)] z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[6px] border-l-[6px] border-indigo-500 rounded-bl-2xl shadow-[-4px_4px_12px_rgba(79,70,229,0.4)] z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[6px] border-r-[6px] border-indigo-500 rounded-br-2xl shadow-[4px_4px_12px_rgba(79,70,229,0.4)] z-10 pointer-events-none"></div>

                    {/* Center Target Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-10">
                        <div className="w-8 h-[2px] bg-white"></div>
                        <div className="h-8 w-[2px] bg-white absolute"></div>
                    </div>

                    {/* Laser Animation */}
                    {scanStatus === 'idle' && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_20px_#818cf8] animate-[scan_2.5s_ease-in-out_infinite] z-10 pointer-events-none"></div>
                    )}
                </div>
            </div>

            {/* Manual Entry Fallback */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 px-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const val = e.target.manualInput.value.trim();
                        if (val) processScan(val);
                        e.target.reset();
                    }}
                    className="flex gap-2 w-full max-w-sm bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10"
                >
                    <input
                        name="manualInput"
                        type="text"
                        placeholder="Or enter code manually..."
                        className="flex-1 bg-transparent border-none text-white placeholder-white/50 focus:ring-0 text-sm"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        Check
                    </button>
                </form>
            </div>

            {/* Success/Error Feedback Overlay - No Changes Needed Here */}
            {scanStatus === 'success' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/20 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-white rounded-[2rem] p-8 shadow-2xl text-center w-80 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                        <div className="mb-4 inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full ring-8 ring-green-50">
                            <CheckCircle size={48} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 leading-none mb-1">{scannedUser?.name.split(' ')[0]}</h2>
                        <p className="text-gray-400 font-medium text-sm mb-6">{scannedUser?.name.split(' ').slice(1).join(' ')}</p>

                        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                            <div className="flex items-center justify-center gap-2 text-green-800 font-bold text-lg">
                                <span>ENTRY</span>
                                <ArrowRight size={20} />
                            </div>
                            <p className="text-xs text-green-600/80 mt-1 font-medium tracking-wide uppercase">{scannedUser?.role} • {scannedUser?.dept}</p>
                        </div>
                    </div>
                </div>
            )}

            {scanStatus === 'error' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-500/20 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-white rounded-[2rem] p-8 shadow-2xl text-center w-80 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="mb-4 inline-flex items-center justify-center w-20 h-20 bg-red-100 text-red-600 rounded-full ring-8 ring-red-50">
                            <XCircle size={48} strokeWidth={3} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{feedbackMessage}</p>

                        <button onClick={() => setScanStatus('idle')} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
