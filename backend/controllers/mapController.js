const HistoricalMap = require('../models/HistoricalMap');
const HistoricalLocation = require('../models/HistoricalLocation');

// Create a new map (Admin only in practice, though we don't have middleware yet)
exports.createMap = async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    
    if (!title || !description || !imageUrl) {
      return res.status(400).json({ status: "Error", data: 'Title, description, and imageUrl are required.' });
    }

    const newMap = new HistoricalMap({
      title,
      description,
      imageUrl
    });

    await newMap.save();
    return res.status(201).json({ status: "Success", data: newMap });
  } catch (error) {
    console.error('Error creating map:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Get all maps
exports.getAllMaps = async (req, res) => {
  try {
    const maps = await HistoricalMap.find().sort({ createdAt: -1 });

    return res.status(200).json({ status: "Success", data: maps });
  } catch (error) {
    console.error('Error fetching maps:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// ==========================================
// DYNAMIC BIBLICAL LOCATIONS FOR LEAFLET MAP
// ==========================================

// Get all locations
exports.getLocations = async (req, res) => {
  try {
    const locations = await HistoricalLocation.find().sort({ periodStart: 1 });
    return res.status(200).json({ status: "ok", data: locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return res.status(500).json({ error: 'Server error fetching locations' });
  }
};

// Add a new location
exports.addLocation = async (req, res) => {
  try {
    const { name, periodStart, periodEnd, description, latitude, longitude } = req.body;
    
    if (!name || periodStart == null || periodEnd == null || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Missing required location fields.' });
    }

    const newLocation = new HistoricalLocation({
      name, periodStart, periodEnd, description, latitude, longitude
    });

    await newLocation.save();
    return res.status(201).json({ status: "ok", data: newLocation });
  } catch (error) {
    console.error('Error adding location:', error);
    return res.status(500).json({ error: 'Server error adding location' });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLocation = await HistoricalLocation.findByIdAndDelete(id);
    
    if (!deletedLocation) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    return res.status(200).json({ status: "ok", message: "Location deleted successfully" });
  } catch (error) {
    console.error('Error deleting location:', error);
    return res.status(500).json({ error: 'Server error deleting location' });
  }
};
