const express = require('express');
const router = express.Router();
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { getIO } = require('../config/socket');
const authMiddleware = require('../middleware/authMiddleware');
const { sendNotificationEmail } = require('../utils/emailService');

router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Received notification request:', req.body);
    const { type, title, message, recipient, sender } = req.body;

    if (!type || !title || !message || !recipient || !sender) {
      console.error('Missing required fields:', { type, title, message, recipient, sender });
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    const notification = new Notification({
      type,
      title,
      message,
      recipient,
      sender,
    });

    console.log('Creating notification:', notification);
    await notification.save();

    const recipientUser = await User.findById(recipient);
    console.log('Recipient user found:', recipientUser ? recipientUser.fullname : 'User not found');
    console.log('Recipient email:', recipientUser?.email);

    const emailEnabled = recipientUser?.notificationPreferences?.email === true;
    const inAppEnabled = recipientUser?.notificationPreferences?.inApp !== false; 
    console.log('Notification preferences:', {
      emailEnabled,
      inAppEnabled,
      userPrefs: recipientUser?.notificationPreferences || 'not set'
    });

    if (inAppEnabled) {
      try {
        const io = getIO();
        io.to(recipient).emit('notification', notification);
        console.log(`In-app notification sent to ${recipient}`);
      } catch (socketError) {
        console.error('Error sending socket notification:', socketError);
      }
    }

    if (emailEnabled) {
      try {
        console.log('Attempting to send email notification to:', recipientUser.email);
        const emailResult = await sendNotificationEmail(recipientUser, notification);
        console.log(`Email notification sent to ${recipientUser.email}`, emailResult);
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }
    } else {
      console.log('Email notifications not enabled for this user. Skipping email sending.');
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: error.message,
      details: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined
    });
  }
});

router.patch('/preferences', authMiddleware, async (req, res) => {
  try {
    const { email, inApp } = req.body;
    console.log('Updating notification preferences:', { email, inApp });

    const updateFields = {};
    if (typeof email === 'boolean') updateFields['notificationPreferences.email'] = email;
    if (typeof inApp === 'boolean') updateFields['notificationPreferences.inApp'] = inApp;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid preference fields provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updated user preferences:', user.notificationPreferences);

    res.json({
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const preferences = user.notificationPreferences || { email: false, inApp: true };
    console.log('User notification preferences:', preferences);

    res.json({
      preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullname email')
      .limit(50);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 