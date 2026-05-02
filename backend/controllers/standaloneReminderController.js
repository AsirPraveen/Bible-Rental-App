const StandaloneReminder = require('../models/StandaloneReminder');

exports.getReminders = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const reminders = await StandaloneReminder.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json({ status: 'ok', data: reminders });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ status: 'error', data: error.message });
    }
};

exports.createReminder = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { title, message, scheduledTime, repeating, notificationId } = req.body;
        
        const newReminder = await StandaloneReminder.create({
            user: userId,
            title,
            message,
            scheduledTime,
            repeating,
            notificationId
        });
        
        res.status(201).json({ status: 'ok', data: newReminder });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ status: 'error', data: error.message });
    }
};

exports.deleteReminder = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { id } = req.params;
        
        const reminder = await StandaloneReminder.findOneAndDelete({ _id: id, user: userId });
        if (!reminder) {
            return res.status(404).json({ status: 'error', data: 'Reminder not found' });
        }
        
        res.status(200).json({ status: 'ok', data: 'Reminder deleted successfully' });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ status: 'error', data: error.message });
    }
};

exports.clearAllReminders = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await StandaloneReminder.deleteMany({ user: userId });
        res.status(200).json({ status: 'ok', data: 'All reminders cleared' });
    } catch (error) {
        console.error('Error clearing reminders:', error);
        res.status(500).json({ status: 'error', data: error.message });
    }
};
