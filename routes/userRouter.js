const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, and PNG image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 7 * 1024 * 1024 }
});

router.get("/alluser", async (req, res) => {
  try {
    const allUsers = await userModel.find()
    res.status(200).json({ message: "all user data found", allUsers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
})

router.post('/signup', upload.single('profilePicture'), async (req, res) => {
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

    const profilePicture = req.file ? {
      data: req.file.buffer,
      contentType: req.file.mimetype
    } : null;

    const newUser = new User({
      fullname,
      email,
      password: hashPass,
      role: 'user',
      profilePicture
    });

    await newUser.save();
    console.log('User created successfully:', newUser._id);

    const timestamp = new Date().getTime();
    const profilePictureUrl = profilePicture ?
      `/users/${newUser._id}/profile-picture?t=${timestamp}` : null;

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role,
        profilePicture: profilePictureUrl
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

    const timestamp = new Date().getTime();
    const profilePictureUrl = user.profilePicture && user.profilePicture.data ?
      `/users/${user._id}/profile-picture?t=${timestamp}` : null;

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        profilePicture: profilePictureUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// router.put('/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { fullname, email, password } = req.body;

//     const user = await User.findById(id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (fullname && fullname.length < 3) {
//       return res.status(400).json({ message: 'fullname must be at least 3 characters long' });
//     }

//     if (email) {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(email)) {
//         return res.status(400).json({ message: 'Invalid email format' });
//       }
//       const existingEmail = await User.findOne({ email });
//       if (existingEmail && existingEmail._id.toString() !== id) {
//         return res.status(400).json({ message: 'Email already exists' });
//       }
//     }

//     if (password && password.length < 6) {
//       return res.status(400).json({ message: 'Password must be at least 6 characters long' });
//     }

//     if (password) {
//       user.password = await bcrypt.hash(password, 6);
//     }
//     if (fullname) user.fullname = fullname;
//     if (email) user.email = email;

//     await user.save();

//     res.status(200).json({ message: "User updated successfully", user });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// });

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Destructure the role field along with the other fields.
    const { fullname, email, password, role } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Validate fullname.
    if (fullname && fullname.length < 3) {
      return res.status(400).json({ message: 'fullname must be at least 3 characters long' });
    }

    // Validate email format and check for duplicate email.
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

    // Validate password.
    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Update password if provided.
    if (password) {
      user.password = await bcrypt.hash(password, 6);
    }
    // Update fullname and email if provided.
    if (fullname) user.fullname = fullname;
    if (email) user.email = email;

    // For role updates: Only allow this if the authenticated user is an admin.
    if (role && req.user && req.user.role === 'admin') {
      // Optionally add a check to ensure the role is one of the accepted values.
      if (!['user', 'manager', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }
      user.role = role;
    }

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

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = generateResetToken();
      const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

      console.log('Generated reset token:', resetToken);
      console.log('Token expires at:', resetTokenExpires);

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save();

      console.log('Token stored in user document');

      const frontendUrl = process.env.FRONTEND_URL;
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

      const emailSubject = 'Password Reset - Task Manager';
      const emailText = `Click the following link to reset your password: ${resetUrl}\n\nThis link will expire in 15 minutes.`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset - Task Manager</h2>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this password reset, please ignore this email.</p>
        </div>
      `;

      await sendEmail(email, emailSubject, emailText, emailHtml);

      res.json({
        exists: true,
        message: 'Password reset link has been sent to your email'
      });
    } else {
      res.json({
        exists: false,
        message: 'Email not found'
      });
    }
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
});

router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log('Verifying reset token:', token);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    console.log('Found user:', user ? 'yes' : 'no');
    if (user) {
      console.log('Token expires at:', user.resetPasswordExpires);
      console.log('Current time:', new Date());
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Valid reset token'
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying reset token'
    });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
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
router.post('/admin/create-user', upload.single('profilePicture'), async (req, res) => {
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

    const profilePicture = req.file ? {
      data: req.file.buffer,
      contentType: req.file.mimetype
    } : null;

    const newUser = new User({
      fullname,
      email,
      password: hashPass,
      role,
      username: null,
      profilePicture
    });

    await newUser.save();

    const timestamp = new Date().getTime();
    const profilePictureUrl = profilePicture ?
      `/users/${newUser._id}/profile-picture?t=${timestamp}` : null;

    return res.status(201).json({
      message: 'User created successfully by admin',
      user: {
        _id: newUser._id,
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role,
        profilePicture: profilePictureUrl
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

    console.log(`Profile picture upload request for user ${id}`);

    if (!req.file) {
      console.log('No file uploaded in the request');
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log(`File received: ${req.file.originalname}, Size: ${req.file.size}, Type: ${req.file.mimetype}`);

    console.log(`Buffer size: ${req.file.buffer.length} bytes`);

    const user = await User.findById(id);
    if (!user) {
      console.log(`User ${id} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    user.profilePicture = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    console.log('Saving profile picture...');

    await user.save();

    console.log('Profile picture saved successfully');

    const timestamp = new Date().getTime();
    return res.status(200).json({
      message: "Profile picture updated successfully",
      profilePictureUrl: `/users/${id}/profile-picture?t=${timestamp}`
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return res.status(500).json({
      message: "Server error during profile picture upload",
      error: error.message,
      stack: error.stack
    });
  }
});

router.get('/:id/profile-picture', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Serving profile picture for user ${id}`);

    const user = await User.findById(id);

    if (!user) {
      console.log(`User ${id} not found`);
      return res.status(404).send();
    }

    if (user.profilePicture && user.profilePicture.data) {
      console.log(`Serving local profile picture for user ${id}, size: ${user.profilePicture.data.length} bytes`);
      res.set('Content-Type', user.profilePicture.contentType || 'image/jpeg');
      return res.send(user.profilePicture.data);
    }

    if (user.googleProfilePictureUrl) {
      console.log(`Redirecting to Google profile picture for user ${id}`);
      return res.redirect(user.googleProfilePictureUrl);
    }

    console.log(`No profile picture found for user ${id}`);
    return res.status(404).send();
  } catch (error) {
    console.error('Error serving profile picture:', error);
    return res.status(500).json({ message: "Error serving profile picture" });
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