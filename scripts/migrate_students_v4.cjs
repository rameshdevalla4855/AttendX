const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateStudents() {
    console.error("--- STARTING MIGRATION V4 ---");

    try {
        // 1. Read JSON
        const jsonPath = path.join(__dirname, '../src/data/students.json');
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const students = JSON.parse(rawData);

        console.error(`Loaded ${students.length} students from JSON.`);

        let updatedCount = 0;
        let notFoundCount = 0;

        const batchSize = 400;
        let batch = db.batch();
        let batchCount = 0;

        for (const s of students) {
            if (!s.RollNO) continue;

            // Query Firestore by Roll Number
            const q = await db.collection('students').where('rollNumber', '==', s.RollNO).get();

            if (q.empty) {
                // console.error(`Skipping ${s.RollNO} - Not found in DB.`);
                notFoundCount++;
                continue;
            }

            q.forEach(doc => {
                const docRef = db.collection('students').doc(doc.id);

                const updateData = {
                    branch: s.Branch,   // "AID"
                    section: s.Section, // "1"
                    dept: s.Department || s.Branch, // Keep dept synced "AIDS"
                    departmentGroup: s.Branch, // Consistency
                    mentorId: s["Mentor No"] // Sync mapped field
                };

                batch.update(docRef, updateData);
                batchCount++;
                updatedCount++;
            });

            if (batchCount >= batchSize) {
                await batch.commit();
                console.error(`Committed batch of ${batchCount} updates.`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.error(`Committed final batch of ${batchCount} updates.`);
        }

        console.error(`Migration Complete.`);
        console.error(`Updated: ${updatedCount}`);
        console.error(`Not Found in DB (Skipped): ${notFoundCount}`);

    } catch (error) {
        console.error("MIGRATION FAILED:", error);
    }
}

migrateStudents();
