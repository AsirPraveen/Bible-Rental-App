const express = require('express');
const router = express.Router();
const generatedPdfController = require('../controllers/generatedPdfController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

router.get('/generated-pdfs', auth, orgScope, generatedPdfController.getGeneratedPdfs);
router.get('/generated-pdfs/:id', auth, orgScope, generatedPdfController.getPdfById);
router.post('/generated-pdfs', auth, orgScope, generatedPdfController.createGeneratedPdf);
router.put('/generated-pdfs/:id', auth, orgScope, generatedPdfController.updateGeneratedPdf);
router.delete('/generated-pdfs/:id', auth, orgScope, generatedPdfController.deleteGeneratedPdf);

module.exports = router;
