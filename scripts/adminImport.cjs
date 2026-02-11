const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("ERROR: 'service-account.json' not found!");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Helper to Read JSON
function readJson(filename) {
    const filePath = path.join(__dirname, `../src/data/${filename}`);
    if (!fs.existsSync(filePath)) {
        console.warn(`WARN: ${filename} not found.`);
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function uploadData() {
    const students = readJson('students.json');
    const faculty = readJson('faculty.json');
    const hods = readJson('hods.json');
    const security = readJson('security.json');

    console.log(`Found ${students.length} students, ${faculty.length} faculty members, ${hods.length} HODs, and ${security.length} security personnel.`);

    // Note: Provide batch limit handling if datasets are large (>500 writes)
    const batch = db.batch();
    let countStudent = 0;
    let countFaculty = 0;
    let countHod = 0;
    let countSecurity = 0;

    // Process Students
    students.forEach((row) => {
        const student = {
            rollNumber: row["RollNO"] || row["rollNumber"],
            name: row["Name"] || row["name"],
            email: row["Email"] || row["email"],
            dept: row["Department"] || "N/A", // Map Department to dept (User request: put branch instead of departmentgroup, wait user said "put the branch instead of departmentgroup")
            // Actually user said: "instead of the branch iam seeing department group ....make changes ... so that it pu the branch instead of departmentgroup"
            // Start again: User wants "Branch" from JSON to be the main field.

            branch: row["Branch"] || row["branch"] || row["dept"], // NEW standardized field
            dept: row["Branch"] || row["dept"], // Keep for legacy compatibility if needed, but map to Branch
            departmentGroup: row["Department"] || "N/A", // Keep for reference

            year: row["year"],
            section: row["Section"] || row["section"] || "1", // NEW: Add Section (Default A)

            mobile: row["Mobile No"] || row["mobile"] || null,
            barcodeId: row["Bio Metric Code"] || row["barcodeId"] || null,
            parentMobile: row["Parent No "] || row["Parent No"] || row["parentMobile"] || null,
            mentorId: row["Mentor No"] || row["mentorId"] || null,
            uid: null,
            isClaimed: false
        };

        if (student.rollNumber) {
            const docRef = db.collection('students').doc(student.rollNumber);
            batch.set(docRef, student);
            countStudent++;
        }
    });

    // Process Faculty
    faculty.forEach((row) => {
        const fac = {
            facultyId: row["Faculty Id"] || row["facultyId"],
            name: row["Name"] || row["name"],
            email: row["Email"] || row["email"],
            designation: row["Designation"] || "Staff",
            dept: row["Department"] || row["dept"],
            mobile: row["Mobile No"] || row["mobile"] || null,
            barcodeId: row["Bio Metric Code"] || row["barcodeId"] || null,
            uid: null,
            isClaimed: false
        };

        if (fac.facultyId) {
            const docRef = db.collection('faculty').doc(fac.facultyId);
            batch.set(docRef, fac);
            countFaculty++;
        }
    });

    // Process HODs
    hods.forEach((row) => {
        const hod = {
            hodId: row["HOD ID"] || row["hodId"],
            name: row["Name"] || row["name"],
            email: row["Email"] || row["email"],
            mobile: row["Mobile No"] || row["mobile"] || null,
            dept: row["Department"] || row["dept"],
            designation: row["Designation"] || "Head of Department",
            barcodeId: row["Bio Metric Code"] || row["barcodeId"] || null,
            uid: null,
            isClaimed: false
        };

        if (hod.hodId) {
            const docRef = db.collection('hods').doc(hod.hodId);
            batch.set(docRef, hod);
            countHod++;
        }
    });

    // Process Coordinators
    const coordinators = readJson('coordinators.json');
    let countCoord = 0;
    coordinators.forEach((row) => {
        const coord = {
            coordinatorId: row["Coordinator ID"] || row["coordinatorId"],
            name: row["Name"] || row["name"],
            email: row["Email"] || row["email"],
            mobile: row["Mobile"] || row["mobile"] || null,
            dept: row["Department"] || row["dept"],
            designation: row["Designation"] || row["designation"] || "Coordinator",
            barcodeId: row["Bio Metric Code"] || row["barcodeId"] || null,
            uid: null,
            isClaimed: false
        };

        if (coord.coordinatorId) {
            const docRef = db.collection('coordinators').doc(coord.coordinatorId);
            batch.set(docRef, coord);
            countCoord++;
        }
    });

    // Process Security
    security.forEach((row) => {
        const sec = {
            securityId: row["Security ID"] || row["securityId"],
            name: row["Name"] || row["name"],
            email: row["Email"] || row["email"],
            mobile: row["Mobile No"] || row["mobile"] || null,
            gateName: row["Gate Name"] || row["gateName"] || null,
            shiftStart: row["Shift Start"] || row["shiftStart"] || null,
            shiftEnd: row["Shift End"] || row["shiftEnd"] || null,
            isActive: String(row["isActive"]).toUpperCase() === "TRUE",
            uid: null,
            isClaimed: false
        };

        if (sec.securityId) {
            const docRef = db.collection('security').doc(sec.securityId);
            batch.set(docRef, sec);
            countSecurity++;
        }
    });

    await batch.commit();
    console.log(`✅ Success! Uploaded ${countStudent} students, ${countFaculty} faculty, ${countHod} HODs, ${countCoord} Coordinators, and ${countSecurity} security personnel.`);
}

uploadData().catch(console.error);
