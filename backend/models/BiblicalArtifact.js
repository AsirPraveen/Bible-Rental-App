const mongoose = require('mongoose');

const HotspotSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  detail: { type: String, required: true },
  position: { type: [Number], required: true }, // [x, y, z] coordinates in 3D space
  color: { type: String, default: '#D4AF37' }
});

const BiblicalArtifactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  reference: { type: String, required: true },
  description: { type: String, required: true },
  funFact: { type: String, default: '' },
  dimensions: { type: String, default: '' },
  materials: { type: [String], default: [] },
  modelUrl: { type: String, default: '' },
  category: { type: String, default: 'General' },
  hotspots: { type: [HotspotSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('BiblicalArtifact', BiblicalArtifactSchema);
