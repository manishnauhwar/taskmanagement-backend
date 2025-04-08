const router = require('express').Router();
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');
const taskMiddleware = require('../middleware/taskMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// This function handles date format conversion if needed
// Frontend now sends dates in YYYY-MM-DD format which is already compatible with MongoDB
function parseDate(dateString) {
  try {
    // Create a date object directly from the ISO format string (YYYY-MM-DD)
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

router.use(authMiddleware);

router.post('/post', taskMiddleware.validateTaskData, async (req, res) => {
  try {
    const { title, description, status, dueDate, priority, assignedTo } = req.body;

    if (!req.user || (!req.user.id && !req.user.userId)) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const userId = req.user.id || req.user.userId;

    // Parse the date using the new function
    const parsedDueDate = parseDate(dueDate);

    if (!parsedDueDate || isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD format."
      });
    }

    const task = new Task({
      title,
      description,
      status: status || "To Do",
      dueDate: parsedDueDate,
      priority,
      assignedTo: assignedTo || "",
      userId: userId
    });

    const savedTask = await task.save();

    await User.findByIdAndUpdate(
      userId,
      { $push: { tasks: savedTask._id } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: savedTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


router.get('/:id', taskMiddleware.validateTaskOwnership, async (req, res) => {
  res.status(200).json(req.task);
});

router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const userId = req.user.id || req.user.userId;

    if (task.userId.toString() === userId ||
      task.assignedTo === userId ||
      ['admin', 'manager'].includes(req.user.role)) {
      const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json(updatedTask);
    } else {
      res.status(403).json({ message: "Not authorized to modify this task" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.delete('/:id', checkRole(['admin', 'manager']), taskMiddleware.validateTaskOwnership, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const userId = req.user.id || req.user.userId;

    if (task.userId.toString() === userId ||
      task.assignedTo === userId ||
      ['admin', 'manager'].includes(req.user.role)) {
      if (req.body.status) task.status = req.body.status;
      if (req.body.assignedTo) task.assignedTo = req.body.assignedTo;
      const updatedTask = await task.save();
      res.status(200).json(updatedTask);
    } else {
      res.status(403).json({ message: "Not authorized to modify this task" });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
