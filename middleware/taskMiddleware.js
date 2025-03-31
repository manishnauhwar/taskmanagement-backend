const Task = require('../models/taskModel');
const User = require('../models/userModel');

const taskMiddleware = {
  validateTaskOwnership: async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (['admin', 'manager'].includes(req.user.role)) {
        req.task = task;
        return next();
      }

      if (task.userId && task.userId.toString() === req.user.id) {
        req.task = task;
        return next();
      }

      if (task.assignedTo && task.assignedTo.toString() === req.user.id) {
        req.task = task;
        return next();
      }

      return res.status(403).json({ message: "Not authorized to access this task" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },
  validateTaskData: (req, res, next) => {
    const { title, description, priority, dueDate } = req.body;
    if (!title || !description || !priority || !dueDate) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }
    if (!["Low", "Medium", "High"].includes(priority)) {
      return res.status(400).json({ message: "Invalid priority level" });
    }
    next();
  }
};

module.exports = taskMiddleware;
