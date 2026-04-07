const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplateController');

router.get('/email-template/:templateId', emailTemplateController.getEmailTemplate);
router.post('/email-template/update', emailTemplateController.updateEmailTemplate);

module.exports = router;
