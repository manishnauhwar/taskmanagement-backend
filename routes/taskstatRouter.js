const router = require('express').Router();
const TaskState = require('../models/taskstatModel');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const taskStatistics = await TaskState.find();
    res.status(200).json(taskStatistics);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.post('/post', async (req, res) => {
  try {
    const { year, totalTasks, completedTasks, id } = req.body;
    const newTaskStat = new TaskState({ year, totalTasks, completedTasks, id });
    await newTaskStat.save();
    res.status(201).json(newTaskStat);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
