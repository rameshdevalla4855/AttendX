const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}
const db = admin.firestore();

// CONFIG
const BRANCH = "CSE";
const YEAR = 4;
const SECTION = "A";

const SUBJECTS = [
    { code: "CS401", name: "Advanced Algorithms" },
    { code: "CS402", name: "Machine Learning" },
    { code: "CS403", name: "Cloud Computing" }
];

async function seed() {
    console.log("Seeding attendance...");

    // 1. Get Students
    const studentsSnap = await db.collection('students')
        .where('dept', '==', BRANCH)
        .where('year', '==', YEAR)
        .where('section', '==', SECTION)
        .get();

    if (studentsSnap.empty) {
        console.log("No students found to mark attendance for.");
        return;
    }

    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${students.length} students.`);

    // 2. Create Attendance Periods
    // We will create 5 classes for each subject
    // Randomize attendance (80% present chance)

    for (const sub of SUBJECTS) {
        console.log(`Generating records for ${sub.name}...`);

        for (let i = 1; i <= 3; i++) { // 3 classes per subject
            const date = new Date();
            date.setDate(date.getDate() - i); // Past dates

            const records = {};
            let presentCount = 0;

            students.forEach(s => {
                const isPresent = Math.random() > 0.2 ? 'P' : 'A'; // 80% chance present
                const key = s.rollNumber || s.id;
                records[key] = isPresent;
                if (isPresent === 'P') presentCount++;
            });

            const periodId = `${BRANCH}_${YEAR}_${SECTION}_${sub.code}_${date.getTime()}`;

            await db.collection('attendance_periods').doc(periodId).set({
                branch: BRANCH,
                year: YEAR,
                section: SECTION,
                subjectCode: sub.code,
                subjectName: sub.name,
                date: date.toISOString(),
                startTime: "10:00 AM", // Dummy
                topic: `Lecture ${i}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                records: records
            });

            console.log(`  - Created class for ${sub.code} on ${date.toDateString()} (${presentCount}/${students.length} P)`);
        }
    }
    console.log("Seeding complete.");
}

seed();
