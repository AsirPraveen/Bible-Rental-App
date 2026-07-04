const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  templateId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Scoped unique constraint
emailTemplateSchema.index({ organization: 1, templateId: 1 }, { unique: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
