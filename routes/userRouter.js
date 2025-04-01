const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require('../models/userModel');

router.get("/alluser", async (req, res) => {
  try {
    const allUsers = await userModel.find()
    res.status(200).json({ message: "all user data found", allUsers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
})

router.post('/signup', async (req, res) => {
  try {
    const { username, email } = req.body;
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
    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username && username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== id) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (password) {
      user.password = await bcrypt.hash(password, 6);
    }
    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (user) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

module.exports = router;