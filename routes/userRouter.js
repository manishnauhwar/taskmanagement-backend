const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

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
    const { fullname, email, password } = req.body;

    console.log('Signup request received:', { fullname, email });

    if (!fullname || !email || !password) {
      return res.status(400).json({ message: 'All fields are required: fullname, email, password' });
    }

    const existingUser = await User.findOne({ fullname });
    const existingEmail = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    } else if (fullname.length < 3) {
      return res.status(400).json({ message: 'fullname must be at least 3 characters long' });
    }

    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const hashPass = await bcrypt.hash(password, 6);

    const newUser = new User({
      fullname,
      email,
      password: hashPass,
      role: 'user',
    });

    await newUser.save();
    console.log('User created successfully:', newUser._id);
    return res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.code === 11000) {
      const errorField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `The ${errorField} already exists in our system. Please use a different one.`,
        error: error.toString()
      });
    }

    res.status(400).json({
      message: error.message || 'Server error during signup',
      error: error.toString()
    });
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
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, password } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (fullname && fullname.length < 3) {
      return res.status(400).json({ message: 'fullname must be at least 3 characters long' });
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
    if (fullname) user.fullname = fullname;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update the teamId field
    if (teamId !== undefined) {
      user.teamId = teamId;
    }

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error('Error updating user:', error);
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

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User found',
      user: {
        _id: user._id,
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/role/:role', async (req, res) => {
  try {
    const { role } = req.params;

    if (!['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const users = await User.find({ role })
      .select('_id fullname email role teamId')
      .sort({ fullname: 1 });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});
router.post('/admin/create-user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Only admins can create users" });
    }

    const { fullname, email, password, role } = req.body;

    if (!fullname || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required: fullname, email, password, role' });
    }

    const existingUser = await User.findOne({ fullname });
    const existingEmail = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    } else if (fullname.length < 3) {
      return res.status(400).json({ message: 'fullname must be at least 3 characters long' });
    }

    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!['user', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: user, manager, admin' });
    }
    const hashPass = await bcrypt.hash(password, 6);

    const newUser = new User({
      fullname,
      email,
      password: hashPass,
      role,
      username: null
    });

    await newUser.save();

    return res.status(201).json({
      message: 'User created successfully by admin',
      user: {
        _id: newUser._id,
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:id/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profilePicture) {
      try {
        const oldFilePath = path.join(__dirname, '..', user.profilePicture.replace(/^\//, ''));
        if (fs.existsSync(oldFilePath) && !oldFilePath.includes('default')) {
          fs.unlinkSync(oldFilePath);
        }
      } catch (err) {
        console.error('Error deleting old profile picture:', err);
      }
    }

    const relativePath = '/uploads/' + req.file.filename;

    user.profilePicture = relativePath;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePictureUrl: relativePath
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get('/check-notification-preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User notification preferences:', {
      userId: user._id,
      email: user.email,
      notificationPreferences: user.notificationPreferences || 'not set'
    });

    res.json({
      email: user.email,
      notificationPreferences: user.notificationPreferences || { email: false, inApp: true }
    });
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/set-notification-preferences', authMiddleware, async (req, res) => {
  try {
    const { email, inApp } = req.body;

    console.log('Directly updating notification preferences:', {
      userId: req.user.id,
      emailPref: email,
      inAppPref: inApp
    });

    const notificationPreferences = {};
    if (typeof email === 'boolean') notificationPreferences.email = email;
    if (typeof inApp === 'boolean') notificationPreferences.inApp = inApp;

    if (Object.keys(notificationPreferences).length === 0) {
      return res.status(400).json({ message: 'No valid preferences provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationPreferences },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updated preferences:', user.notificationPreferences);

    res.json({
      message: 'Notification preferences updated directly',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Error directly updating notification preferences:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;