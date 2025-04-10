const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post(['/', '/google'], async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      let profilePicData = null;
      let contentType = 'image/jpeg';

      if (picture) {
        try {
          const response = await axios.get(picture, { responseType: 'arraybuffer' });
          profilePicData = Buffer.from(response.data, 'binary');
          contentType = response.headers['content-type'];
          console.log(`Downloaded profile picture from Google: ${profilePicData.length} bytes`);
        } catch (downloadError) {
          console.error('Error downloading profile picture:', downloadError);
        }
      }

      user = new User({
        fullname: name,
        email,
        password: bcrypt.hashSync(crypto.randomBytes(20).toString('hex'), 10),
        role: 'user',
        profilePicture: profilePicData ? {
          data: profilePicData,
          contentType: contentType
        } : undefined,
        googleProfilePictureUrl: picture || null,
      });

      await user.save();
    } else if (picture && !user.profilePicture?.data) {
      user.googleProfilePictureUrl = picture;

      try {
        const imageResponse = await axios.get(picture, { responseType: 'arraybuffer' });
        user.profilePicture = {
          data: Buffer.from(imageResponse.data),
          contentType: imageResponse.headers['content-type']
        };
        await user.save();
      } catch (pictureError) {
        console.error('Error downloading Google profile picture for existing user:', pictureError);
      }
    }

    const jwtToken = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const timestamp = new Date().getTime();
    const profilePictureUrl = user.profilePicture && user.profilePicture.data ?
      `/users/${user._id}/profile-picture?t=${timestamp}` : null;

    res.json({
      success: true,
      user: {
        token: jwtToken,
        _id: user._id,
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        profilePicture: profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
});

module.exports = router;