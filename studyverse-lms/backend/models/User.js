const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // ── Core ──────────────────────────────────────────────
  name:     { type: String, trim: true, default: '' },
  username: { type: String, trim: true, default: '' },
  usn:      { type: String, trim: true, uppercase: true, unique: true, sparse: true },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: { type: String, required: true, minlength: 6, select: false },

  // ── Role ──────────────────────────────────────────────
  role: { type: String, enum: ['student','team_member','admin'], default: 'student' },

  // ── Academic ──────────────────────────────────────────
  department: { type: String, default: 'CSE', enum: ['CSE'] },
  semester:   { type: Number, enum: [3, 4], default: null },

  // ── Status ────────────────────────────────────────────
  status:   { type: String, enum: ['active','suspended','blocked'], default: 'active' },
  firstLogin:        { type: Boolean, default: true },
  passwordUpdatedAt: { type: Date, default: null },
  lastLogin:         { type: Date, default: null },

  // ── Security (for non-CSV students) ───────────────────
  securityQuestion: { type: String, default: '' },
  securityAnswer:   { type: String, default: '', select: false },

  // ── Gamification ──────────────────────────────────────
  points:          { type: Number, default: 0 },
  streak:          { type: Number, default: 0 },
  lastActiveDate:  { type: Date, default: null },
  optInLeaderboard:{ type: Boolean, default: true },
  theme:           { type: String, enum: ['light','dark','system'], default: 'system' }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (this.isModified('securityAnswer') && this.securityAnswer) {
    this.securityAnswer = await bcrypt.hash(this.securityAnswer.toLowerCase(), 10);
  }
  next();
});

UserSchema.methods.getSignedJwt = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

UserSchema.methods.matchPassword      = async function(p)  { return bcrypt.compare(p, this.password); };
UserSchema.methods.matchSecurityAnswer = async function(a) { return bcrypt.compare(a.toLowerCase(), this.securityAnswer); };

module.exports = mongoose.model('User', UserSchema);
