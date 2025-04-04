const express = require('express');
const router = express.Router();
const Notification = require('../models/notificationModel');
const { getIO } = require('../config/socket');
const authMiddleware = require('../middleware/authMiddleware');

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

    const io = getIO();
    io.to(recipient).emit('notification', notification);

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

// router.patch('/read-all', authMiddleware, async (req, res) => {
//   try {
//     await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
//     res.json({ message: 'All notifications marked as read' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

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