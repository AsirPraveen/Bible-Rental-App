const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const standaloneReminderController = require('../controllers/standaloneReminderController');

router.get('/', auth, standaloneReminderController.getReminders);
router.post('/', auth, standaloneReminderController.createReminder);
router.delete('/all', auth, standaloneReminderController.clearAllReminders);
router.delete('/:id', auth, standaloneReminderController.deleteReminder);

module.exports = router;
