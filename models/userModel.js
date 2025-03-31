const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
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
  }


});
module.exports = mongoose.model('User', userSchema);