const BiblicalArtifact = require('../models/BiblicalArtifact');

// Get all artifacts
exports.getAllArtifacts = async (req, res) => {
  try {
    const artifacts = await BiblicalArtifact.find().sort({ name: 1 });
    return res.status(200).json({ status: "Success", data: artifacts });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return res.status(500).json({ status: "Error", message: 'Server error' });
  }
};

// Get a single artifact
exports.getArtifactById = async (req, res) => {
  try {
    const artifact = await BiblicalArtifact.findOne({ id: req.params.id });
    if (!artifact) {
      return res.status(404).json({ status: "Error", message: 'Artifact not found' });
    }
    return res.status(200).json({ status: "Success", data: artifact });
  } catch (error) {
    console.error('Error fetching artifact details:', error);
    return res.status(500).json({ status: "Error", message: 'Server error' });
  }
};

// Add a new artifact (Admin/SuperAdmin)
exports.createArtifact = async (req, res) => {
  try {
    const { id, name, reference, description, funFact, dimensions, materials, modelUrl, category, hotspots } = req.body;

    if (!id || !name || !reference || !description) {
      return res.status(400).json({ status: "Error", message: 'ID, name, reference, and description are required.' });
    }

    const existing = await BiblicalArtifact.findOne({ id });
    if (existing) {
      return res.status(400).json({ status: "Error", message: 'Artifact with this ID already exists.' });
    }

    const newArtifact = new BiblicalArtifact({
      id, name, reference, description, funFact, dimensions, materials, modelUrl, category, hotspots
    });

    await newArtifact.save();
    return res.status(201).json({ status: "Success", data: newArtifact });
  } catch (error) {
    console.error('Error creating artifact:', error);
    return res.status(500).json({ status: "Error", message: 'Server error' });
  }
};

// Update an artifact (SuperAdmin). The `id` slug is the stable public key and
// is deliberately not editable — changing it would orphan any saved reference.
exports.updateArtifact = async (req, res) => {
  try {
    const EDITABLE = [
      'name', 'reference', 'description', 'funFact',
      'dimensions', 'materials', 'modelUrl', 'category', 'hotspots'
    ];

    const updates = {};
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: "Error", message: 'No editable fields were provided.' });
    }

    const artifact = await BiblicalArtifact.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!artifact) {
      return res.status(404).json({ status: "Error", message: 'Artifact not found' });
    }

    return res.status(200).json({ status: "Success", data: artifact });
  } catch (error) {
    console.error('Error updating artifact:', error);
    return res.status(500).json({ status: "Error", message: 'Server error' });
  }
};

// Delete an artifact (Admin/SuperAdmin)
exports.deleteArtifact = async (req, res) => {
  try {
    const deleted = await BiblicalArtifact.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ status: "Error", message: 'Artifact not found' });
    }
    return res.status(200).json({ status: "Success", message: 'Artifact deleted successfully' });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    return res.status(500).json({ status: "Error", message: 'Server error' });
  }
};
