const router = require('express').Router();
const Task = require('../models/taskModel');

function convertDateFormat(dateString) {
  const parts = dateString.split('-');
  if(parts.length !== 3) return dateString;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

router.post('/create', async (req, res) => {
  try {
    const { title, description, status, dueDate, priority, assignedTo } = req.body;
    const formattedDueDate = new Date(convertDateFormat(dueDate));
    
    const task = new Task({
      title,
      description,
      status,
      dueDate: formattedDueDate,
      priority,
      assignedTo: assignedTo || "" 
    });
    
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
