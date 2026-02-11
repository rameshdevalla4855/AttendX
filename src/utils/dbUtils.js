import { db } from "../services/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

// Log Attendance (Entry/Exit)
export const logAttendance = async (uid, role, type, gateId, metadata = {}) => {
    try {
        const logsRef = collection(db, "attendanceLogs");
        await addDoc(logsRef, {
            uid,
            role,
            type, // 'ENTRY' or 'EXIT'
            gateId,
            timestamp: serverTimestamp(),
            // Use Local Date for logic to align with midnight reset
            date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
            // Metadata for filtering (Dept, Year, Branch, Section)
            dept: metadata.dept || 'N/A',
            year: metadata.year || 'N/A',
            name: metadata.name || 'Unknown',
            rollNumber: metadata.rollNumber || 'N/A'
        });
        return { success: true };
    } catch (error) {
        console.error("Error logging attendance:", error);
        throw error;
    }
};

// Register Visitor
export const registerVisitor = async (visitorData) => {
    try {
        const visitorsRef = collection(db, "visitorLogs");
        await addDoc(visitorsRef, {
            ...visitorData,
            entryTime: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error registering visitor:", error);
        throw error;
    }
};

// Get Last Attendance Log
export const getLastAttendance = async (uid) => {
    try {
        const logsRef = collection(db, "attendanceLogs");
        // NOTE: avoiding orderBy("timestamp", "desc") to prevent "Missing Index" error for now.
        // We fetch logs for this user and sort client-side.
        const q = query(
            logsRef,
            where("uid", "==", uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docs = querySnapshot.docs.map(d => d.data());
            // Sort by timestamp desc
            docs.sort((a, b) => {
                const tA = a.timestamp?.toMillis() || 0;
                const tB = b.timestamp?.toMillis() || 0;
                return tB - tA;
            });
            return docs[0];
        }
        return null;
    } catch (error) {
        console.error("Error getting last attendance:", error);
        return null; // Fail safe
    }
};

// Batch Import Students
export const batchImportStudents = async (studentsData) => {
    // studentsData: Array of { uid (optional), ...studentInfo }
    // If uid is provided (e.g. from Auth), use it. Else create new doc or use rollNumber?
    // User credentials usually need to be created in Auth first.
    // For this import, we assume we are populating Firestore 'students' and 'users' collections.

    // NOTE: Creating Auth users requires Admin SDK (backend). 
    // From client-side, we can only write to Firestore.
    // We will assume these records are just "Profiles" and Auth accounts will be created separately 
    // OR we iterate and createAuthUser (if we have password).
    // For now, let's just write to Firestore 'students' collection.

    const errors = [];
    const successCount = 0;

    // Logic to be implemented in UI loop or Cloud Function
    // Here we just provide a single write helper
};

export const createStudentProfile = async (uid, data) => {
    try {
        // Create user role mapping
        await setDoc(doc(db, "users", uid), { role: 'student', email: data.email });
        // Create student profile
        await setDoc(doc(db, "students", uid), data);
        return true;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// Clear All Attendance Logs (Dev Utility)
export const clearAllAttendanceLogs = async () => {
    try {
        const logsRef = collection(db, "attendanceLogs");
        const snapshot = await getDocs(logsRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "attendanceLogs", d.id)));
        await Promise.all(deletePromises);
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error clearing logs:", error);
        throw error;
    }
};

// Log Security Alert
export const logSecurityAlert = async (alertData) => {
    try {
        const alertsRef = collection(db, "securityAlerts");
        await addDoc(alertsRef, {
            ...alertData,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString('en-CA'),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Auto-delete after 24 hours
        });
        return { success: true };
    } catch (error) {
        console.error("Error logging alert:", error);
        // Don't throw, just fail silently so scanner doesn't break
    }
};
