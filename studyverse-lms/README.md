# StudyVerse LMS v2.0
## Full University Learning Management System
### Stack: MongoDB · Express · Node.js · Vanilla JS

---

## What's New (v2.0)

| Feature | Description |
|---|---|
| Role-Based Access | Admin / Team Member / Student |
| CSV Student Import | Bulk upload students via CSV |
| CSV Export | Download all student records |
| First Login Flow | Students set own password on first login |
| Password Strength | Indicator + show/hide toggle |
| Admin Dashboard | Full analytics, user management |
| Subject Management | Add/edit/delete subjects |
| Resource Moderation | Admin can delete any resource |
| Tasks Monitor | Admin views all student tasks |
| Audit Logs | Track all admin actions |
| USN Login | Students can log in with USN or email |
| Motivational Quotes | 80% nerdy, 20% flirty quotes on dashboard |
| User Management | Suspend, delete, reset password |

---

## Project Structure

```
studyverse-lms/
├── server.js
├── package.json
├── .env.example
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT + role-based protection
│   │   └── auditLog.js      # Audit log helper
│   ├── models/
│   │   ├── User.js          # Extended with role, usn, firstLogin
│   │   ├── Task.js
│   │   ├── Subject.js
│   │   ├── Resource.js
│   │   └── AuditLog.js      # NEW
│   └── routes/
│       ├── auth.js          # Login (email/USN), set-password, register
│       ├── users.js         # NEW - user management
│       ├── subjects.js      # Extended with admin CRUD
│       ├── resources.js     # Extended with moderation
│       ├── tasks.js         # Extended - admin sees all tasks
│       ├── progress.js
│       ├── gamification.js
│       ├── admin.js         # NEW - overview + analytics
│       ├── importStudents.js # NEW - CSV import
│       ├── exportStudents.js # NEW - CSV export
│       └── audit.js         # NEW - audit logs
└── frontend/
    ├── index.html           # Student SPA (updated)
    ├── css/style.css
    ├── js/
    │   ├── api.js
    │   ├── auth.js          # Updated - USN login, set-password, quotes
    │   ├── app.js           # Updated - firstLogin redirect
    │   ├── dashboard.js     # Updated - motivational quotes
    │   ├── subjects.js
    │   ├── tasks.js
    │   ├── progress.js
    │   ├── leaderboard.js
    │   └── settings.js
    └── admin/
        ├── index.html       # NEW - Full admin panel
        └── js/admin.js      # NEW - Admin panel logic

```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure .env
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Start server
```bash
npm run dev
```

### 4. Seed subjects
```
http://localhost:5000/api/subjects/seed
```

### 5. Create your first Admin account
```
http://localhost:5000/api/subjects/seed  (seed DB first)
```
Then use MongoDB or this one-time script:
```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./backend/models/User');
  await User.create({
    name: 'Admin',
    email: 'admin@studyverse.edu',
    password: 'admin123',
    role: 'admin',
    firstLogin: false
  });
  console.log('Admin created: admin@studyverse.edu / admin123');
  process.exit(0);
});
"
```

---

## Access URLs

| URL | Who |
|---|---|
| `http://localhost:5000` | Student portal |
| `http://localhost:5000/admin` | Admin panel |

---

## CSV Import Format

```csv
Name,USN,Email,Password,Department,Semester
Rahul Sharma,1RV23CS001,rahul@college.edu,rahul@123,CSE,3
Priya Nair,1RV23CS002,priya@college.edu,priya@123,CSE,3
```

Students log in with **email OR USN** + password.
On first login they are redirected to set their own password.

---

## Role Permissions

| Action | Admin | Team Member | Student |
|---|---|---|---|
| Admin dashboard | ✅ | ✅ | ❌ |
| View all users | ✅ | ✅ | ❌ |
| Delete users | ✅ | ❌ | ❌ |
| Suspend users | ✅ | ❌ | ❌ |
| Reset passwords | ✅ | ❌ | ❌ |
| CSV import/export | ✅ | ✅ | ❌ |
| Add/edit subjects | ✅ | ✅ | ❌ |
| Delete subjects | ✅ | ✅ | ❌ |
| Delete any resource | ✅ | ✅ | ❌ |
| View all tasks | ✅ | ✅ | ❌ |
| Audit logs | ✅ | ❌ | ❌ |
| Create admin/team | ✅ | ❌ | ❌ |
| Student dashboard | ❌ | ❌ | ✅ |
| Own tasks | ✅ | ✅ | ✅ |
