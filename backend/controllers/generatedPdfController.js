const GeneratedPdf = require('../models/GeneratedPdf');

exports.getGeneratedPdfs = async (req, res) => {
  try {
    const pdfs = await GeneratedPdf.find({ organization: req.orgId })
      .populate('songs', 'titleTamil titleEnglish')
      .sort({ createdAt: -1 });
    res.status(200).json({ status: 'Ok', data: pdfs });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getPdfById = async (req, res) => {
  try {
    const { id } = req.params;
    const pdf = await GeneratedPdf.findOne({ _id: id, organization: req.orgId })
      .populate('songs');
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    res.status(200).json({ status: 'Ok', data: pdf });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.createGeneratedPdf = async (req, res) => {
  try {
    const { title, html, songs } = req.body;
    if (!title || !html) {
      return res.status(400).json({ status: 'error', message: 'Title and HTML content are required' });
    }

    const pdf = new GeneratedPdf({
      title,
      html,
      songs: songs || [],
      organization: req.orgId,
      createdBy: req.user._id
    });

    await pdf.save();
    res.status(201).json({ status: 'Ok', data: pdf });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.updateGeneratedPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, html, songs } = req.body;

    const pdf = await GeneratedPdf.findOneAndUpdate(
      { _id: id, organization: req.orgId },
      { $set: { title, html, songs } },
      { new: true }
    );

    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    res.status(200).json({ status: 'Ok', data: pdf });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.deleteGeneratedPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const pdf = await GeneratedPdf.findOneAndDelete({ _id: id, organization: req.orgId });
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    res.status(200).json({ status: 'Ok', data: 'PDF deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
