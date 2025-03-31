const mongoose = require('mongoose');

const TaskStateSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  totalTasks: { type: Number, required: true },
  completedTasks: { type: Number, required: true },
  id: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('TaskState', TaskStateSchema);
