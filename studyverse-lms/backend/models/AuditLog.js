const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actionType:  { type: String, required: true },  // e.g. 'USER_DELETED', 'RESOURCE_DELETED'
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String, default: '' },
  targetId:    { type: String, default: '' },
  targetLabel: { type: String, default: '' },
  details:     { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
