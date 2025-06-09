const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/users
// @desc    Search users by email or name
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search) {
      return res.status(400).json({ msg: 'Please provide a search term' });
    }
    
    // Search users by email or name (excluding current user)
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } }
          ]
        }
      ]
    }).select('name email avatar');
    
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/friends
// @desc    Get user's friends list
// @access  Private
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'name email avatar');
      
    res.json(user.friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/friends/:id
// @desc    Add a friend
// @access  Private
router.post('/friends/:id', auth, async (req, res) => {
  try {
    // Check if friend id is valid
    if (req.user.id === req.params.id) {
      return res.status(400).json({ msg: 'Cannot add yourself as a friend' });
    }
    
    const friend = await User.findById(req.params.id);
    
    if (!friend) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if already friends
    const user = await User.findById(req.user.id);
    
    if (user.friends.includes(req.params.id)) {
      return res.status(400).json({ msg: 'Already friends with this user' });
    }
    
    // Add friend to both users
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { friends: req.params.id } }
    );
    
    await User.findByIdAndUpdate(
      req.params.id,
      { $push: { friends: req.user.id } }
    );
    
    // Get updated friends list
    const updatedUser = await User.findById(req.user.id)
      .populate('friends', 'name email avatar');
      
    res.json(updatedUser.friends);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/users/friends/:id
// @desc    Remove a friend
// @access  Private
router.delete('/friends/:id', auth, async (req, res) => {
  try {
    // Remove friend from both users
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { friends: req.params.id } }
    );
    
    await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { friends: req.user.id } }
    );
    
    // Get updated friends list
    const updatedUser = await User.findById(req.user.id)
      .populate('friends', 'name email avatar');
      
    res.json(updatedUser.friends);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, avatar } = req.body;
    
    try {
      const updateFields = {};
      if (name) updateFields.name = name;
      if (avatar) updateFields.avatar = avatar;
      
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
      ).select('-password');
      
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/users/calendar/connect
// @desc    Connect Google Calendar
// @access  Private
router.post('/calendar/connect', auth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ msg: 'Refresh token is required' });
    }
    
    // Update user with calendar connection info
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          calendarConnected: true,
          calendarRefreshToken: refreshToken
        }
      },
      { new: true }
    ).select('-password');
    
    res.json({
      calendarConnected: user.calendarConnected
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/users/calendar/disconnect
// @desc    Disconnect Google Calendar
// @access  Private
router.delete('/calendar/disconnect', auth, async (req, res) => {
  try {
    // Update user to remove calendar connection
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          calendarConnected: false,
          calendarRefreshToken: null
        }
      }
    );
    
    res.json({ msg: 'Calendar disconnected successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 