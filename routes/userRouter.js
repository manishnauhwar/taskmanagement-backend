const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post('/signup', async (req, res) => {
  try {
    const { username } = req.body;
    const { email } = req.body;
    const existingUser = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    } else if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const hashPass = await bcrypt.hash(req.body.password, 6);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashPass,
    });
    await newUser.save();
    return res.status(200).json({ message: 'User created successfully' });
  }

  catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Server error' });
  }
});

router.get('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "2d" });
    console.log(token);
    res.status(200).json({ message: "Login successful", id: user._id, token: token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;