const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  type: {
    type: String,
    enum: ['system', 'personal'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for system resources
  },
  resourceType: {
    type: String,
    enum: ['video', 'article', 'pdf', 'link', 'notes'],
    default: 'link'
  }
}, { timestamps: true });

module.exports = mongoose.model('Resource', ResourceSchema);
