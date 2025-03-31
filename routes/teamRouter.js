const router = require('express').Router();
const Team = require('../models/teamModel');
const User = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.post('/post', checkRole(['admin','manager']), async (req, res) => {
  try {
    const { name, managerId, memberIds, members } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: "Team name is required" });
    }
    const trimmedName = name.trim();
    const existingTeam = await Team.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } },
        { teamName: { $regex: new RegExp(`^${trimmedName}$`, 'i') } }
      ]
    });
    if (existingTeam) {
      return res.status(400).json({
        message: "A team with this name already exists. Please choose a different name."
      });
    }
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(400).json({ message: "Invalid manager ID or user is not a manager" });
    }
    const teamMembers = memberIds || members || [];
    const team = new Team({
      name: trimmedName,
      teamName: trimmedName,
      manager: managerId,
      members: teamMembers,
      createdBy: req.user.id
    });
    const savedTeam = await team.save();
    await User.findByIdAndUpdate(managerId, { teamId: savedTeam._id });
    if (teamMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: teamMembers } },
        { $set: { teamId: savedTeam._id } }
      );
    }
    const populatedTeam = await Team.findById(savedTeam._id)
      .populate('manager', 'username email')
      .populate('members', 'username email role');
    res.status(201).json(populatedTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "A team with this name already exists. Please choose a different name."
      });
    }
    res.status(500).json({ message: "Server error", error });
  }
});

router.get('/', checkRole(['admin','manager','user']), async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('manager', 'username email')
      .populate('members', 'username email role');
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('manager', 'username email')
      .populate('members', 'username email role')
      .populate('createdBy', 'username email');
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    if (req.user.role !== 'admin' &&
      !team.members.some(member => member._id.toString() === req.user.id) &&
      team.manager.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to view this team" });
    }
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.put('/:id', checkRole(['admin','manager']), async (req, res) => {
  try {
    const { name, managerId, memberIds } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ message: "Invalid manager ID or user is not a manager" });
      }
      team.manager = managerId;
    }
    if (memberIds) {
      const members = await User.find({ _id: { $in: memberIds } });
      if (members.length !== memberIds.length) {
        return res.status(400).json({ message: "One or more member IDs are invalid" });
      }
      team.members = memberIds;
    }
    if (name) team.name = name;
    const updatedTeam = await team.save();
    res.status(200).json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.delete('/:id', checkRole(['admin','manager']), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    await User.updateMany(
      { _id: { $in: [...team.members, team.manager] } },
      { $unset: { teamId: 1 } }
    );
    await Team.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
