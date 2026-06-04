/**
 * Generate the full student CSV with all valid USN combinations.
 *
 * USN format: 01FE{year}{degree}{branch}{number}
 * Email format: {usn_lowercase}@studyverse.edu
 * Default password: Welcome@123
 */

const fs = require('fs');
const path = require('path');

const YEARS = ['24', '25', '26'];          // must not exceed current year 2026
const DEGREES = ['b', 'r'];                // bachelors, research
const BRANCHES = ['cs', 'ec', 'ce', 'me', 'rv'];
const MAX_NUMBER = 999;
const DEFAULT_PASSWORD = 'Welcome@123';
const DOMAIN = '@studyverse.edu';

const DEPARTMENT_MAP = {
  cs: 'CSE',
  ec: 'ECE',
  ce: 'CE',
  me: 'ME',
  rv: 'RV'
};

const rows = ['USN,Email,Password,Department,Semester'];

for (const year of YEARS) {
  for (const degree of DEGREES) {
    for (const branch of BRANCHES) {
      for (let num = 1; num <= MAX_NUMBER; num++) {
        const numStr = String(num).padStart(3, '0');
        const usn = `01FE${year}${degree.toUpperCase()}${branch.toUpperCase()}${numStr}`;
        const email = `${usn.toLowerCase()}${DOMAIN}`;
        const department = DEPARTMENT_MAP[branch];
        let semester = 3;
        if (branch === 'cs' && (year === '24' || year === '25')) {
          semester = 4;
        }
        rows.push(`${usn},${email},${DEFAULT_PASSWORD},${department},${semester}`);
      }
    }
  }
}

const outPath = path.join(__dirname, 'sample_students.csv');
fs.writeFileSync(outPath, rows.join('\n'), 'utf8');

console.log(`✅ Generated ${rows.length - 1} student rows`);
console.log(`📁 Saved to: ${outPath}`);
console.log(`📊 File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
