/**
 * Generate 150 CS students: 01FE25BCS001 → 01FE25BCS150
 *
 * USN format: 01FE25BCS{001-150}
 * Email: {usn_lowercase}@studyverse.edu
 * Default password: Welcome@123
 * Semester: 1-75 are Semester 3, 76-150 are Semester 4
 * Department: CSE
 */

const fs = require('fs');
const path = require('path');

const TOTAL_STUDENTS = 150;
const DEFAULT_PASSWORD = 'Welcome@123';
const DOMAIN = '@studyverse.edu';

const rows = ['USN,Email,Password,Department,Semester'];

for (let num = 1; num <= TOTAL_STUDENTS; num++) {
  const numStr = String(num).padStart(3, '0');
  const usn = `01FE25BCS${numStr}`;
  const email = `${usn.toLowerCase()}${DOMAIN}`;
  
  // Split semesters: first 75 -> 3, next 75 -> 4
  const semester = num <= 75 ? 3 : 4;
  
  rows.push(`${usn},${email},${DEFAULT_PASSWORD},CSE,${semester}`);
}

const outPath = path.join(__dirname, 'sample_students.csv');
fs.writeFileSync(outPath, rows.join('\n'), 'utf8');

console.log(`✅ Generated ${TOTAL_STUDENTS} CS student rows`);
console.log(`   USN range: 01FE25BCS001 → 01FE25BCS${String(TOTAL_STUDENTS).padStart(3, '0')}`);
console.log(`   Semester 3: 01FE25BCS001 - 01FE25BCS075`);
console.log(`   Semester 4: 01FE25BCS076 - 01FE25BCS150`);
console.log(`📁 Saved to: ${outPath}`);
console.log(`📊 File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
