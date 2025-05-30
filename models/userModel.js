const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    // unique: true
  },
  email:
  {
    type: String,
    required: true,
    unique: true
  },
  password:
  {
    type: String,
    required: true
  },
  role:
  {
    type: String,
    required: true,
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  profilePicture: {
    data: {
      type: Buffer,
      default: null
    },
    contentType: {
      type: String,
      default: 'image/jpeg'
    }
  },
  googleProfilePictureUrl: {
    type: String,
    default: null
  },
  tasks: [{
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'task'
  }],
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'team'
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'manager'
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: false
    },
    inApp: {
      type: Boolean,
      default: true
    }
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
});

userSchema.statics.resetCollection = async function () {
  try {
    await this.collection.dropIndexes();
    console.log('User collection indexes have been reset');
  } catch (error) {
    console.error('Error resetting user collection indexes:', error);
  }
};

module.exports = mongoose.model('User', userSchema);