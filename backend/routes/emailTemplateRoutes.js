const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplateController');
const adminAuth = require('../middleware/adminAuth');

// Admin only — manage email templates
router.get('/email-template/:templateId', adminAuth, emailTemplateController.getEmailTemplate);
router.post('/email-template/update', adminAuth, emailTemplateController.updateEmailTemplate);

module.exports = router;
