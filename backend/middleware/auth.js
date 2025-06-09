const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');

// Middleware to authenticate JWT token
exports.auth = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    console.log('AUTH: No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    console.log('AUTH: Verifying token');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('AUTH: Token verified, user ID:', decoded.user.id);
    
    // Add user from payload
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      console.log('AUTH: User not found in database');
      return res.status(401).json({ msg: 'User not found' });
    }
    
    console.log('AUTH: User authenticated:', user.name);
    req.user = user;
    
    next();
  } catch (err) {
    console.error('AUTH: Token verification error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Invalid token format' });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired' });
    }
    
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Check if user is an event organizer
exports.checkEventOrganizer = async (req, res, next) => {
  try {
    console.log('CHECK ORGANIZER: Verifying event ID:', req.params.id);
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      console.log('CHECK ORGANIZER: Event not found');
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    console.log('CHECK ORGANIZER: Event found:', event._id.toString());
    console.log('CHECK ORGANIZER: User ID:', req.user.id);
    console.log('CHECK ORGANIZER: Creator ID:', event.creator.toString());
    
    // Check if user is creator
    if (event.creator.toString() === req.user.id) {
      console.log('CHECK ORGANIZER: User is creator, access granted');
      return next();
    }
    
    // Check if user is an organizer
    const isOrganizer = event.organizers.some(
      org => org.user.toString() === req.user.id
    );
    
    console.log('CHECK ORGANIZER: Is user an organizer?', isOrganizer);
    
    if (!isOrganizer) {
      return res.status(403).json({ msg: 'Not authorized as an event organizer' });
    }
    
    console.log('CHECK ORGANIZER: User is an organizer, access granted');
    next();
  } catch (err) {
    console.error('CHECK ORGANIZER: Error:', err.message);
    res.status(500).send('Server Error');
  }
}; 