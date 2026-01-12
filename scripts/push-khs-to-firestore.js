/*
Script: push-khs-to-firestore.js
Purpose: Push dummy KHS data (student course grades) to Firestore.

Usage:
1. Install dependency:
   npm install firebase-admin

2. Obtain a Firebase service account JSON file from Firebase Console
   (Project Settings -> Service accounts -> Generate new private key)

3. Run the script (example):
   node scripts/push-khs-to-firestore.js --serviceAccount=./serviceAccountKey.json

Optional flags:
  --collection=your_collection_name    Default: khs
  --file=./data/khs_dummy.json         Default: data/khs_dummy.json

The script will create documents under the given collection. Document id will be `${nim}_${semester}_${year}`.
*/

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    const [k, v] = a.split('=');
    if (k.startsWith('--')) opts[k.replace(/^--/, '')] = v || true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const serviceAccountPath = opts.serviceAccount || process.env.FIREBASE_SERVICE_ACCOUNT;
  const collectionName = opts.collection || 'khs';
  const useRealtime = !!(opts.realtime || opts.useRealtime || process.env.PUSH_TO_RTD);
  const filePath = opts.file || path.join(__dirname, '..', 'data', 'khs_dummy.json');
  const usersApiUrl = opts.usersApiUrl || opts.useUsersFromApi || process.env.USERS_API_URL || null;

  if (!serviceAccountPath) {
    console.error('Missing service account. Provide --serviceAccount=./path.json or set FIREBASE_SERVICE_ACCOUNT env var.');
    process.exit(1);
  }

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account file not found:', serviceAccountPath);
    process.exit(1);
  }

  const admin = require('firebase-admin');
  const serviceAccount = require(path.resolve(serviceAccountPath));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: opts.databaseURL || process.env.FIREBASE_DATABASE_URL || null });
  const db = admin.firestore();
  const rdb = admin.database && admin.database();

  let rows = [];
  // If usersApiUrl is provided, fetch users and generate KHS entries from them
  if (usersApiUrl) {
    console.log('Fetching users from', usersApiUrl);
    try {
      const res = await fetch(usersApiUrl);
      if (!res.ok) throw new Error('Failed fetching users: ' + res.statusText);
      const users = await res.json();
      if (!Array.isArray(users)) throw new Error('Users API did not return an array');

      // sample course catalog
      const sampleCourses = [
        { code: 'IF101', name: 'Pengantar Informatika', credit: 3 },
        { code: 'MT101', name: 'Matematika Dasar', credit: 3 },
        { code: 'EN101', name: 'Bahasa Inggris', credit: 2 },
        { code: 'IF102', name: 'Pemrograman Dasar', credit: 4 },
        { code: 'CS101', name: 'Sistem Komputer', credit: 3 },
        { code: 'MT102', name: 'Matematika Diskrit', credit: 3 }
      ];

      const gradeOptions = ['A', 'A-', 'B+', 'B', 'B-', 'C+','C'];

      for (const u of users) {
        const nim = u.nim || (u.id ? String(u.id) : 'unknown');
        const name = u.name || 'Unknown';
        // pick 3 courses
        const chosen = [];
        const shuffled = sampleCourses.sort(() => 0.5 - Math.random());
        for (let i = 0; i < 3; i++) chosen.push(shuffled[i]);
        const courses = chosen.map(c => ({ ...c, grade: gradeOptions[Math.floor(Math.random() * gradeOptions.length)] }));
        // approximate gpa
        const gradeToPoint = g => ({ 'A':4.0,'A-':3.7,'B+':3.3,'B':3.0,'B-':2.7,'C+':2.3,'C':2.0 }[g] || 0);
        const totalCredit = courses.reduce((s, c) => s + (c.credit || 0), 0);
        const totalPoints = courses.reduce((s, c) => s + (gradeToPoint(c.grade) * (c.credit || 0)), 0);
        const gpa = totalCredit ? Math.round((totalPoints / totalCredit) * 100) / 100 : 0;

        rows.push({ nim, name, semester: '1', year: String(new Date().getFullYear()), courses, gpa });
      }
    } catch (e) {
      console.error('Failed to generate KHS from users API:', e.message);
      process.exit(1);
    }
  } else {
    if (!fs.existsSync(filePath)) {
      console.error('Data file not found:', filePath);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      rows = JSON.parse(raw);
    } catch (e) {
      console.error('Failed parsing JSON file:', e.message);
      process.exit(1);
    }
  }

  console.log(`Pushing ${rows.length} KHS records to Firestore collection '${collectionName}'...`);

  for (const r of rows) {
    const nim = r.nim || 'unknown';
    const semester = r.semester || '1';
    const year = r.year || String(new Date().getFullYear());
    const docId = `${nim}_${semester}_${year}`;
    try {
      if (useRealtime) {
        if (!rdb) throw new Error('Realtime DB not initialized');
        // write under collectionName/docId
        await rdb.ref(`${collectionName}/${docId}`).set(r);
        console.log('Saved (RTDB)', docId);
      } else {
        await db.collection(collectionName).doc(docId).set(r, { merge: true });
        console.log('Saved', docId);
      }
    } catch (e) {
      console.error('Failed saving', docId, e.message);
    }
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
