const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplateController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Admin only — manage email templates
router.get('/email-template/:templateId', auth, orgScope, adminAuth, emailTemplateController.getEmailTemplate);
router.post('/email-template/update', auth, orgScope, adminAuth, emailTemplateController.updateEmailTemplate);

module.exports = router;
