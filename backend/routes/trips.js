const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, checkEventOrganizer } = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

// @route   GET api/trips
// @desc    Get all trip events for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const trips = await Event.find({
      eventType: 'trip',
      $or: [
        { creator: req.user.id },
        { 'organizers.user': req.user.id },
        { 'participants.user': req.user.id }
      ]
    })
      .sort({ startDate: 1 })
      .populate('creator', 'name avatar')
      .populate('organizers.user', 'name avatar')
      .populate('participants.user', 'name avatar');

    res.json(trips);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/trips/:id
// @desc    Get trip by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ msg: 'Invalid trip ID format' });
    }
    
    const trip = await Event.findOne({ 
      _id: eventId,
      eventType: 'trip'
    })
      .populate('creator', 'name email avatar')
      .populate('organizers.user', 'name email avatar')
      .populate('participants.user', 'name email avatar');

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check authorization
    const isAuthorized = trip.isPublic || 
      trip.creator._id.toString() === req.user.id ||
      trip.organizers.some(org => org.user._id.toString() === req.user.id) ||
      trip.participants.some(part => part.user._id.toString() === req.user.id);
    
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to view this trip' });
    }

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/trips
// @desc    Create a new trip
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty(),
      check('destination', 'Destination is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        title,
        description,
        startDate,
        endDate,
        location,
        isPublic,
        destination,
        tripDetails
      } = req.body;

      // Create new trip event
      const newTrip = new Event({
        title,
        description,
        eventType: 'trip',
        startDate,
        endDate,
        location,
        isPublic,
        creator: req.user.id,
        organizers: [
          {
            user: req.user.id,
            role: 'creator',
            permissions: ['edit', 'invite', 'manage']
          }
        ],
        participants: [
          {
            user: req.user.id,
            status: 'going',
            responseDate: new Date()
          }
        ],
        tripDetails: {
          destination,
          ...tripDetails
        }
      });

      const trip = await newTrip.save();

      // Add trip to user's events
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { events: trip._id } }
      );

      res.json(trip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/trips/:id
// @desc    Update trip details
// @access  Private (trip organizers only)
router.put('/:id', [auth, checkEventOrganizer], async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      isPublic,
      tripDetails
    } = req.body;

    // Build trip update object
    const tripFields = {};
    if (title) tripFields.title = title;
    if (description) tripFields.description = description;
    if (startDate) tripFields.startDate = startDate;
    if (endDate) tripFields.endDate = endDate;
    if (location) tripFields.location = location;
    if (isPublic !== undefined) tripFields.isPublic = isPublic;
    
    // Handle trip details update
    if (tripDetails) {
      tripFields.tripDetails = tripDetails;
    }

    // Ensure it's a trip event
    const trip = await Event.findOne({ 
      _id: req.params.id,
      eventType: 'trip'
    });
    
    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Update trip
    const updatedTrip = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: tripFields },
      { new: true }
    )
      .populate('creator', 'name avatar')
      .populate('organizers.user', 'name avatar')
      .populate('participants.user', 'name avatar');

    res.json(updatedTrip);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/trips/:id/accommodations
// @desc    Update trip accommodations
// @access  Private (trip organizers only)
router.put(
  '/:id/accommodations',
  [auth, checkEventOrganizer],
  async (req, res) => {
    try {
      const { accommodations } = req.body;

      // Ensure it's a trip event
      const trip = await Event.findOne({ 
        _id: req.params.id,
        eventType: 'trip'
      });
      
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Update accommodations
      const updatedTrip = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { 'tripDetails.accommodations': accommodations } },
        { new: true }
      );

      res.json(updatedTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/trips/:id/transportation
// @desc    Update trip transportation
// @access  Private (trip organizers only)
router.put(
  '/:id/transportation',
  [auth, checkEventOrganizer],
  async (req, res) => {
    try {
      const { transportation } = req.body;

      // Ensure it's a trip event
      const trip = await Event.findOne({ 
        _id: req.params.id,
        eventType: 'trip'
      });
      
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Update transportation
      const updatedTrip = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { 'tripDetails.transportation': transportation } },
        { new: true }
      );

      res.json(updatedTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/trips/:id/itinerary
// @desc    Update trip itinerary
// @access  Private (trip organizers only)
router.put(
  '/:id/itinerary',
  [auth, checkEventOrganizer],
  async (req, res) => {
    try {
      const { itinerary } = req.body;

      // Ensure it's a trip event
      const trip = await Event.findOne({ 
        _id: req.params.id,
        eventType: 'trip'
      });
      
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Update itinerary
      const updatedTrip = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { 'tripDetails.itinerary': itinerary } },
        { new: true }
      );

      res.json(updatedTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/trips/:id/packing-list
// @desc    Update trip packing list
// @access  Private (trip organizers only)
router.put(
  '/:id/packing-list',
  [auth, checkEventOrganizer],
  async (req, res) => {
    try {
      const { packingList } = req.body;

      // Ensure it's a trip event
      const trip = await Event.findOne({ 
        _id: req.params.id,
        eventType: 'trip'
      });
      
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Update packing list
      const updatedTrip = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { 'tripDetails.packingList': packingList } },
        { new: true }
      );

      res.json(updatedTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/trips/:id/budget
// @desc    Update trip budget
// @access  Private (trip organizers only)
router.put(
  '/:id/budget',
  [auth, checkEventOrganizer],
  async (req, res) => {
    try {
      const { budget } = req.body;

      // Ensure it's a trip event
      const trip = await Event.findOne({ 
        _id: req.params.id,
        eventType: 'trip'
      });
      
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Update budget
      const updatedTrip = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { 'tripDetails.budget': budget } },
        { new: true }
      );

      res.json(updatedTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/trips/:id/documents
// @desc    Update trip documents
// @access  Private (trip organizers only)
router.put(
  '/:id/documents',
  [auth, checkEventOrganizer],
  async (req, res) => {
    try {
      const { documents } = req.body;

      // Ensure it's a trip event
      const trip = await Event.findOne({ 
        _id: req.params.id,
        eventType: 'trip'
      });
      
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Update documents
      const updatedTrip = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { 'tripDetails.documents': documents } },
        { new: true }
      );

      res.json(updatedTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 