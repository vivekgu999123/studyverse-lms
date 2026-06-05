const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Original routes ──────────────────────────────────────
app.use('/api/auth',         require('./backend/routes/auth'));
app.use('/api/subjects',     require('./backend/routes/subjects'));
app.use('/api/resources',    require('./backend/routes/resources'));
app.use('/api/tasks',        require('./backend/routes/tasks'));
app.use('/api/progress',     require('./backend/routes/progress'));
app.use('/api/gamification', require('./backend/routes/gamification'));

// ── New LMS routes ───────────────────────────────────────
app.use('/api/admin',        require('./backend/routes/admin'));
app.use('/api/users',        require('./backend/routes/users'));
app.use('/api/import',       require('./backend/routes/importStudents'));
app.use('/api/export',       require('./backend/routes/exportStudents'));
app.use('/api/audit',        require('./backend/routes/audit'));

// Admin panel SPA
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'index.html'));
});

// Student SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 StudyVerse LMS running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });
