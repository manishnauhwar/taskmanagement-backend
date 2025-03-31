const router = require('express').Router();
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');
const taskMiddleware = require('../middleware/taskMiddleware');
const checkRole = require('../middleware/roleMiddleware');

function convertDateFormat(dateString) {
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

router.use(authMiddleware);

router.post('/post', taskMiddleware.validateTaskData, async (req, res) => {
  try {
    const { title, description, status, dueDate, priority, assignedTo } = req.body;
    const formattedDueDate = new Date(convertDateFormat(dueDate));
    const task = new Task({
      title,
      description,
      status: status || "To Do",
      dueDate: formattedDueDate,
      priority,
      assignedTo: assignedTo || "",
      userId: req.user.id
    });
    const savedTask = await task.save();
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { tasks: savedTask._id } },
      { new: true }
    );
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: "Server error", error });
  }
});

router.get('/', checkRole(['admin', 'manager', 'user']), async (req, res) => {
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

router.put('/:id', checkRole(['admin', 'manager', 'user']), taskMiddleware.validateTaskOwnership, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(task);
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

router.patch('/:id', checkRole(['admin', 'manager', 'user']), taskMiddleware.validateTaskOwnership, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.body.status === 'Completed' && task.status !== 'Completed') {

      const startDate = new Date(task.createdAt);
      const endDate = new Date();
      const completionTime = (endDate - startDate) / (1000 * 60 * 60);

      task.completionTime = completionTime;
      task.status = 'Completed';
      task.updatedAt = endDate;
    } else {
      task.status = req.body.status;
      task.updatedAt = new Date();
    }

    await task.save();
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
