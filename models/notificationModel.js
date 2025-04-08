const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true

  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task_assigned', 'task_completed', 'task_updated', 'task_deleted'],
    required: true
  },
  title: {
    type: String,
    required: true

  },
  message: {
    type: String,
    required: true

  },
  read: {
    type: Boolean,
    default: false

  },
  createdAt: {
    type: Date,
    default: Date.now

  }
});

module.exports = mongoose.model('Notification', notificationSchema);
