const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: Number,
    required: true,
    enum: [3, 4]
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '📚'
  },
  color: {
    type: String,
    default: '#6366f1'
  }
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);
