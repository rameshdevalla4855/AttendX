import { db } from './firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    addDoc,
    deleteDoc
} from 'firebase/firestore';

const STRUCTURE_COLLECTION = 'academic_structure';
const ASSIGNMENTS_COLLECTION = 'faculty_assignments';
const CONFIG_DOC_ID = 'main';

/**
 * Enterprise Academic Management Service
 * Handles Schema: academic_structure, faculty_assignments
 */
export const academicService = {

    /**
     * Initializes the default Academic Structure if it doesn't exist.
     * Use this to seed the database.
     */
    initializeStructure: async () => {
        const docRef = doc(db, STRUCTURE_COLLECTION, CONFIG_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            const defaultStructure = {
                id: CONFIG_DOC_ID,
                branches: ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "AIDS"],
                years: [1, 2, 3, 4],
                sections: ["A", "B", "C", "D"],
                subjects: [
                    // Example Seed Data
                    { code: "CS201", name: "Data Structures", branch: "CSE", year: 2 },
                    { code: "CS202", name: "DBMS", branch: "CSE", year: 2 },
                    { code: "EC301", name: "VLSI Design", branch: "ECE", year: 3 }
                ],
                updatedAt: serverTimestamp()
            };
            await setDoc(docRef, defaultStructure);
            console.log("Initialized Academic Structure");
            return defaultStructure;
        }
        return docSnap.data();
    },

    /**
     * Fetches the global academic configuration.
     */
    getStructure: async () => {
        const docRef = doc(db, STRUCTURE_COLLECTION, CONFIG_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // Auto-initialize if missing
            return await academicService.initializeStructure();
        }

        return docSnap.data();
    },

    /**
     * Updates the academic structure configuration.
     * @param {object} newStructure - The complete updated structure object
     */
    updateStructure: async (newStructure) => {
        const docRef = doc(db, STRUCTURE_COLLECTION, CONFIG_DOC_ID);
        await updateDoc(docRef, {
            ...newStructure,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Assigns a faculty member to a specific class/subject context.
     * @param {string} coordinatorUid - ID of the Coordinator making the assignment
     * @param {object} assignmentData - { facultyId, facultyName, branch, year, section, subjectCode, subjectName }
     */
    assignFaculty: async (coordinatorUid, assignmentData) => {
        // Validation: Check if assignment already exists?
        // For now, allow multiples (Theory + Lab).

        await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
            ...assignmentData,
            assignedBy: coordinatorUid,
            assignedAt: serverTimestamp(),
            isActive: true
        });
    },

    /**
     * Get assignments for a specific Faculty member.
     * Used for "My Classes" view.
     */
    getMyAssignments: async (facultyUid) => {
        const q = query(
            collection(db, ASSIGNMENTS_COLLECTION),
            where("facultyId", "==", facultyUid),
            where("isActive", "==", true)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Get all assignments for a Department (for Coordinators).
     */
    getDepartmentAssignments: async (branch) => {
        const q = query(
            collection(db, ASSIGNMENTS_COLLECTION),
            where("branch", "==", branch),
            where("isActive", "==", true)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Get all Faculty members from the users collection.
     */
    getAllFaculty: async () => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "faculty"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data() // name, email, etc.
        }));
    },

    /**
     * Get assignments for a specific Student Class Context.
     * Used for Student Dashboard.
     */
    /**
     * Get assignments for a specific Faculty member.
     */
    getMyAssignments: async (facultyId) => {
        const q = query(
            collection(db, ASSIGNMENTS_COLLECTION),
            where("facultyId", "==", facultyId),
            where("isActive", "==", true)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Get assignments for a specific Student Class Context.
     * Used for Student Dashboard.
     */
    getClassAssignments: async (branch, year, section) => {
        console.log(`[AcademicService] Fetching assignments for Branch: ${branch}, Year: ${year}, Section: ${section}`);

        // Fetch ALL assignments for the branch (avoiding complex index issues)
        const q = query(
            collection(db, ASSIGNMENTS_COLLECTION),
            where("branch", "==", branch),
            where("isActive", "==", true)
        );

        try {
            const snapshot = await getDocs(q);
            const allBranchAssignments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            console.log(`[AcademicService] Found ${allBranchAssignments.length} total active assignments for branch ${branch}`);

            // Filter in Memory (Robust against type mismatches e.g. string vs number year)
            const filtered = allBranchAssignments.filter(a => {
                const yearMatch = Number(a.year) === Number(year);
                const sectionMatch = a.section === section;
                return yearMatch && sectionMatch;
            });

            console.log(`[AcademicService] Filtered down to ${filtered.length} for Year ${year} / Sec ${section}`);
            return filtered;

        } catch (err) {
            console.error("[AcademicService] Error fetching class assignments:", err);
            return [];
        }
    },

    /**
     * TIMETABLE SYSTEM
     * Collection: timetables
     * Doc ID: ${branch}_${year}_${section}
     */

    saveTimetable: async (branch, year, section, scheduleData, coordinatorId) => {
        const docId = `${branch}_${year}_${section}`; // e.g. CSE_4_A
        const docRef = doc(db, 'timetables', docId);

        await setDoc(docRef, {
            id: docId,
            branch,
            year: Number(year),
            section,
            schedule: scheduleData, // { Monday: [], Tuesday: [] ... }
            updatedBy: coordinatorId,
            updatedAt: serverTimestamp()
        });
    },

    deleteAssignment: async (assignmentId) => {
        const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
        await deleteDoc(docRef);
    },

    getTimetable: async (branch, year, section) => {
        const docId = `${branch}_${year}_${section}`;
        const docRef = doc(db, 'timetables', docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    },

    /**
     * SUBJECT-WISE ATTENDANCE SYSTEM
     */
    getAttendancePeriod: async (periodId) => {
        const docRef = doc(db, 'attendance_periods', periodId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    },

    submitAttendance: async (periodData) => {
        const docRef = doc(db, 'attendance_periods', periodData.periodId);
        await setDoc(docRef, {
            ...periodData,
            timestamp: serverTimestamp()
        }, { merge: true });
    },

    getStudentSubjectAttendance: async (branch, year, section, subjectCode) => {
        const q = query(
            collection(db, 'attendance_periods'),
            where("branch", "==", branch),
            where("year", "==", Number(year)),
            where("section", "==", section),
            where("subjectCode", "==", subjectCode)
        );

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error("Error fetching subject attendance:", e);
            return [];
        }
    },

    getStudentOverallAttendance: async (branch, year, section, studentRoll, studentId) => {
        const q = query(
            collection(db, 'attendance_periods'),
            where("branch", "==", branch),
            where("year", "==", Number(year)),
            where("section", "==", section)
        );

        try {
            const snapshot = await getDocs(q);
            let total = 0;
            let present = 0;
            const subjectStats = {}; // { subjectCode: { total: 0, present: 0, name: '' } }

            snapshot.forEach(doc => {
                const data = doc.data();
                const records = data.records || {};
                const subjectCode = data.subjectCode;
                const subjectName = data.subjectName || subjectCode;

                // Check both keys (Roll Number takes precedence if both exist)
                const status = records[studentRoll] || records[studentId];

                // Initialize subject stats if new
                if (!subjectStats[subjectCode]) {
                    subjectStats[subjectCode] = { code: subjectCode, name: subjectName, total: 0, present: 0 };
                }

                if (status === 'P') {
                    present++;
                    total++;
                    subjectStats[subjectCode].present++;
                    subjectStats[subjectCode].total++;
                } else if (status === 'A') {
                    total++;
                    subjectStats[subjectCode].total++;
                }
            });

            // Convert map to array and calculate percentages
            const subjectWise = Object.values(subjectStats).map(sub => ({
                ...sub,
                percentage: sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0
            }));

            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            return { total, present, percentage, subjectWise };

        } catch (e) {
            console.error("Error fetching overall attendance:", e);
            return { total: 0, present: 0, percentage: 0, subjectWise: [] };
        }
    },

    getClassStudents: async (branch, year, section) => {
        const studentsRef = collection(db, 'students');

        // Query by 'branch' (standardized via import script)
        const q = query(
            studentsRef,
            where("branch", "==", branch)
        );

        try {
            const snapshot = await getDocs(q);
            const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            return students.filter(s => {
                const sYear = String(s.year || s.Year).replace(/\D/g, '');
                let sSection = s.section || s.Section || 'A';

                const sectionMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' };
                const normalize = (val) => {
                    const str = String(val).toUpperCase();
                    return sectionMap[str] || str;
                };

                const normalizedQuerySection = normalize(section);
                const normalizedStudentSection = normalize(sSection);

                return Number(sYear) === Number(year) &&
                    normalizedStudentSection === normalizedQuerySection;
            });
        } catch (e) {
            console.error("Error fetching class students:", e);
            return [];
        }
    }
};
