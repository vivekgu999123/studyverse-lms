const AuditLog = require('../models/AuditLog');

async function logAction({ actionType, performedBy, performedByName = '', targetId = '', targetLabel = '', details = '' }) {
  try {
    await AuditLog.create({ actionType, performedBy, performedByName, targetId, targetLabel, details });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

module.exports = logAction;
