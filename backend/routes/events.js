const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, checkEventOrganizer } = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const { google } = require('googleapis');
const mongoose = require('mongoose');

// @route   POST api/events
// @desc    Create a new event
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty()
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
        eventType,
        startDate,
        endDate,
        location,
        isPublic
      } = req.body;

      // Create new event
      const newEvent = new Event({
        title,
        description,
        eventType,
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
        ]
      });

      const event = await newEvent.save();

      // Add event to user's events
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { events: event._id } }
      );

      res.json(event);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/events
// @desc    Get all events for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const events = await Event.find({
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

    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/events/:id
// @desc    Get event by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`GET Event: Fetching event ID ${eventId} for user ${req.user.name} (${req.user.id})`);
    
    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log(`GET Event: Invalid ObjectID format: ${eventId}`);
      return res.status(400).json({ msg: 'Invalid event ID format' });
    }
    
    const event = await Event.findById(eventId)
      .populate('creator', 'name email')
      .populate('organizers.user', 'name email')
      .populate('participants.user', 'name email');

    if (!event) {
      console.log(`GET Event: Event with ID ${eventId} not found in database`);
      return res.status(404).json({ msg: 'Event not found' });
    }

    console.log(`GET Event: Found event ${event.title} (ID: ${eventId})`);
    console.log(`GET Event: Creator: ${event.creator.name} (ID: ${event.creator._id})`);
    console.log(`GET Event: Public access: ${event.isPublic ? 'YES' : 'NO'}`);
    
    // Debug authorization conditions
    const userIsCreator = event.creator._id.toString() === req.user.id;
    console.log(`GET Event: User is creator: ${userIsCreator ? 'YES' : 'NO'}`);
    
    // Debug organizers check
    const organizers = event.organizers || [];
    console.log(`GET Event: Event has ${organizers.length} organizers`);
    
    const userIsOrganizer = organizers.some(org => {
      const organizerId = org.user && org.user._id ? org.user._id.toString() : null;
      const isMatch = organizerId === req.user.id;
      console.log(`GET Event: Checking organizer ${organizerId} against user ${req.user.id}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
      return isMatch;
    });
    console.log(`GET Event: User is organizer: ${userIsOrganizer ? 'YES' : 'NO'}`);
    
    // Debug participants check
    const participants = event.participants || [];
    console.log(`GET Event: Event has ${participants.length} participants`);
    
    const userIsParticipant = participants.some(part => {
      const participantId = part.user && part.user._id ? part.user._id.toString() : null;
      const isMatch = participantId === req.user.id;
      console.log(`GET Event: Checking participant ${participantId} against user ${req.user.id}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
      return isMatch;
    });
    console.log(`GET Event: User is participant: ${userIsParticipant ? 'YES' : 'NO'}`);
    
    // Log overall authorization result
    const isAuthorized = event.isPublic || userIsCreator || userIsOrganizer || userIsParticipant;
    console.log(`GET Event: Final authorization result: ${isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`);
    
    // TEMPORARILY ALLOW ALL AUTHORIZED USERS FOR DEBUGGING
    // if (!isAuthorized) {
    //   return res.status(403).json({ msg: 'Not authorized to view this event' });
    // }

    res.json(event);
  } catch (err) {
    console.error(`GET Event ERROR: ${err.message}`);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   PUT api/events/:id
// @desc    Update an event
// @access  Private (event organizers only)
router.put('/:id', [auth, checkEventOrganizer], async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      isPublic
    } = req.body;

    // Build event object
    const eventFields = {};
    if (title) eventFields.title = title;
    if (description) eventFields.description = description;
    if (eventType) eventFields.eventType = eventType;
    if (startDate) eventFields.startDate = startDate;
    if (endDate) eventFields.endDate = endDate;
    if (location) eventFields.location = location;
    if (isPublic !== undefined) eventFields.isPublic = isPublic;

    // Update event
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: eventFields },
      { new: true }
    )
      .populate('creator', 'name avatar')
      .populate('organizers.user', 'name avatar')
      .populate('participants.user', 'name avatar');

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/events/:id
// @desc    Delete an event
// @access  Private (event creator only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    // Check if event exists
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    // Check if user is event creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this event' });
    }

    // Remove event from all users' events arrays
    const userIds = [
      ...event.organizers.map(org => org.user),
      ...event.participants.map(part => part.user)
    ];

    await User.updateMany(
      { _id: { $in: userIds } },
      { $pull: { events: event._id } }
    );

    // Delete event
    await event.remove();

    res.json({ msg: 'Event removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/events/:id/invite
// @desc    Invite users to an event
// @access  Private (organizers only)
router.post(
  '/:id/invite',
  [
    auth,
    checkEventOrganizer,
    [check('emails', 'Emails are required').isArray()]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { emails } = req.body;
      const event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({ msg: 'Event not found' });
      }

      // Find existing users with those emails
      const users = await User.find({ email: { $in: emails } });
      
      // Get emails of found users
      const foundEmails = users.map(user => user.email);
      
      // Emails not found in the system
      const notFoundEmails = emails.filter(email => !foundEmails.includes(email));
      
      // Add found users to participants if not already there
      const alreadyInvited = [];
      const newlyInvited = [];
      
      for (const user of users) {
        const isParticipant = event.participants.some(
          p => p.user.toString() === user._id.toString()
        );
        
        if (!isParticipant) {
          event.participants.push({
            user: user._id,
            status: 'pending'
          });
          
          // Add event to user's events
          await User.findByIdAndUpdate(
            user._id,
            { $push: { events: event._id } }
          );
          
          newlyInvited.push(user.email);
        } else {
          alreadyInvited.push(user.email);
        }
      }
      
      await event.save();
      
      res.json({
        event,
        invited: {
          success: newlyInvited,
          alreadyInvited,
          notFound: notFoundEmails
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/events/:id/rsvp
// @desc    Update user RSVP status
// @access  Private
router.post(
  '/:id/rsvp',
  [
    auth,
    [check('status', 'Status is required').isIn(['going', 'maybe', 'not going'])]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { status } = req.body;
      
      // Update participant status
      const event = await Event.findOneAndUpdate(
        { 
          _id: req.params.id, 
          'participants.user': req.user.id 
        },
        { 
          $set: { 
            'participants.$.status': status,
            'participants.$.responseDate': new Date()
          } 
        },
        { new: true }
      ).populate('participants.user', 'name avatar');
      
      if (!event) {
        return res.status(404).json({ msg: 'Event not found or user not invited' });
      }
      
      res.json({
        eventId: event._id,
        userId: req.user.id,
        status,
        participants: event.participants
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/events/:id/calendar
// @desc    Get calendar availability for event participants
// @access  Private
router.get('/:id/calendar', [auth], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'participants',
        match: { status: { $in: ['going', 'maybe'] } },
        populate: { path: 'user' }
      });
      
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is authorized
    const isAuthorized =
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id) ||
      event.participants.some(part => part.user._id.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    // Get users with connected calendars
    const usersWithCalendars = event.participants
      .filter(p => p.user.calendarConnected)
      .map(p => ({
        id: p.user._id,
        name: p.user.name,
        refreshToken: p.user.calendarRefreshToken
      }));
    
    // Prepare data for client response (excluding refresh tokens)
    const calendarsForClient = usersWithCalendars.map(({ id, name }) => ({ id, name }));
    
    // If we have users with connected calendars, fetch their busy times
    if (usersWithCalendars.length > 0) {
      try {
        // Create time range for query (ensure we're using the right format for Google Calendar API)
        const timeMin = new Date(event.startDate).toISOString();
        const timeMax = new Date(event.endDate).toISOString();
        
        // Process each user with a calendar
        const userAvailability = await Promise.all(
          usersWithCalendars.map(async (user) => {
            try {
              // Set up OAuth client
              const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
              );
              
              // Set credentials using refresh token
              oauth2Client.setCredentials({
                refresh_token: user.refreshToken
              });
              
              // Create calendar API client
              const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
              
              // Query for free/busy info
              const freeBusyResponse = await calendar.freebusy.query({
                requestBody: {
                  timeMin,
                  timeMax,
                  items: [{ id: 'primary' }] // Primary calendar
                }
              });
              
              // Extract busy periods from the response
              const busyPeriods = freeBusyResponse.data.calendars.primary.busy || [];
              
              return {
                userId: user.id,
                userName: user.name,
                busyPeriods
              };
            } catch (err) {
              console.error(`Error fetching calendar for user ${user.name}:`, err);
              return {
                userId: user.id,
                userName: user.name,
                error: 'Failed to fetch calendar data',
                busyPeriods: []
              };
            }
          })
        );
        
        // Return event info, users with calendars, and availability data
        return res.json({
          eventId: event._id,
          usersWithCalendars: calendarsForClient,
          startDate: event.startDate,
          endDate: event.endDate,
          availability: userAvailability
        });
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        // Return basic data even if calendar fetching failed
        return res.json({
          eventId: event._id,
          usersWithCalendars: calendarsForClient,
          startDate: event.startDate,
          endDate: event.endDate,
          error: 'Failed to fetch calendar data'
        });
      }
    }
    
    // No users with calendars, just return the basic info
    return res.json({
      eventId: event._id,
      usersWithCalendars: calendarsForClient,
      startDate: event.startDate,
      endDate: event.endDate
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/events/test/:id
// @desc    Test route to get event by ID without auth
// @access  Public
router.get('/test/:id', async (req, res) => {
  try {
    console.log(`TEST: Fetching event with ID: ${req.params.id}`);
    
    // First check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('TEST: Invalid ObjectId format');
      return res.status(404).json({ msg: 'Event not found - Invalid ID format' });
    }
    
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name avatar')
      .populate('organizers.user', 'name avatar')
      .populate('participants.user', 'name avatar');

    // Check if event exists
    if (!event) {
      console.log('TEST: Event not found');
      return res.status(404).json({ msg: 'Event not found' });
    }

    console.log('TEST: Event found:', event._id);
    
    res.json({
      id: event._id,
      title: event.title,
      creator: event.creator,
      organizers: event.organizers,
      participants: event.participants,
      message: 'This is from the test route'
    });
  } catch (err) {
    console.error('TEST: Error fetching event:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/events/suggestions
// @desc    Find optimal meeting times based on participants' calendars
// @access  Private
router.post('/suggestions', auth, async (req, res) => {
  try {
    const { startDate, endDate, duration, participants } = req.body;
    
    if (!startDate || !endDate || !duration) {
      return res.status(400).json({ msg: 'Missing required parameters' });
    }
    
    // Default to 60 minutes if not specified or invalid
    const meetingDuration = duration > 0 ? duration : 60;
    
    // Convert to Date objects
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      return res.status(400).json({ msg: 'Invalid date format' });
    }
    
    // Get current user details
    const user = await User.findById(req.user.id);
    
    if (!user.calendarConnected || !user.calendarRefreshToken) {
      return res.status(400).json({ 
        msg: 'You must connect your Google Calendar to use this feature' 
      });
    }
    
    // Initialize Google OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      refresh_token: user.calendarRefreshToken
    });
    
    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get busy periods for the current user
    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        items: [{ id: 'primary' }]
      }
    });
    
    const busyPeriods = freeBusyResponse.data.calendars.primary.busy || [];
    
    // Find available slots
    const availableSlots = findAvailableSlots(
      startDateTime,
      endDateTime,
      busyPeriods,
      meetingDuration
    );
    
    // Get participants' busy periods if there are any specified
    let allParticipantsBusyPeriods = [];
    
    if (participants && participants.length > 0) {
      // Get all participants who have connected their calendars
      const participantUsers = await User.find({
        _id: { $in: participants },
        calendarConnected: true,
        calendarRefreshToken: { $exists: true }
      });
      
      // Get busy periods for each participant
      for (const participant of participantUsers) {
        try {
          // Set up participant OAuth client
          const participantOauth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
          );
          
          participantOauth.setCredentials({
            refresh_token: participant.calendarRefreshToken
          });
          
          const participantCalendar = google.calendar({ version: 'v3', auth: participantOauth });
          
          // Get busy periods
          const participantFreeBusy = await participantCalendar.freebusy.query({
            requestBody: {
              timeMin: startDateTime.toISOString(),
              timeMax: endDateTime.toISOString(),
              items: [{ id: 'primary' }]
            }
          });
          
          const participantBusy = participantFreeBusy.data.calendars.primary.busy || [];
          allParticipantsBusyPeriods = [...allParticipantsBusyPeriods, ...participantBusy];
        } catch (err) {
          console.error(`Error fetching calendar for participant ${participant.name}:`, err);
          // Continue with other participants
        }
      }
      
      // Filter available slots by participants' availability
      if (allParticipantsBusyPeriods.length > 0) {
        const participantAvailableSlots = filterSlotsByBusyPeriods(
          availableSlots,
          allParticipantsBusyPeriods
        );
        
        return res.json({ suggestions: participantAvailableSlots });
      }
    }
    
    res.json({ suggestions: availableSlots });
  } catch (err) {
    console.error('Error finding optimal meeting times:', err);
    res.status(500).json({ 
      msg: 'Server error when finding optimal meeting times',
      error: err.message
    });
  }
});

// Function to find available time slots
function findAvailableSlots(start, end, busyPeriods, durationMinutes) {
  const slots = [];
  const slotDuration = durationMinutes * 60 * 1000; // convert to milliseconds
  const timeSlotStart = new Date(start);
  const timeSlotEnd = new Date(end);
  
  // Work hours - 9 AM to 5 PM
  const workDayStartHour = 9; 
  const workDayEndHour = 17;
  
  // Create slots for each day
  while (timeSlotStart < timeSlotEnd) {
    const dayStart = new Date(timeSlotStart);
    
    // Set to work day start (9 AM)
    dayStart.setHours(workDayStartHour, 0, 0, 0);
    
    // If we're already past work hours for this day, move to next day
    if (timeSlotStart.getHours() >= workDayEndHour) {
      timeSlotStart.setDate(timeSlotStart.getDate() + 1);
      timeSlotStart.setHours(workDayStartHour, 0, 0, 0);
      continue;
    }
    
    // If we're before work hours on this day, move to work day start
    if (timeSlotStart.getHours() < workDayStartHour) {
      timeSlotStart.setHours(workDayStartHour, 0, 0, 0);
    }
    
    // Set end of workday
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(workDayEndHour, 0, 0, 0);
    
    // If this is already past our end time, break
    if (dayStart > timeSlotEnd) {
      break;
    }
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = dayStart.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      timeSlotStart.setDate(timeSlotStart.getDate() + 1);
      timeSlotStart.setHours(workDayStartHour, 0, 0, 0);
      continue;
    }
    
    // Check slots within work hours
    let currentSlotStart = new Date(Math.max(timeSlotStart.getTime(), dayStart.getTime()));
    
    while (currentSlotStart.getTime() + slotDuration <= Math.min(dayEnd.getTime(), timeSlotEnd.getTime())) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration);
      
      // Check if this slot overlaps with any busy period
      const isAvailable = !busyPeriods.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        return (
          (busyStart <= currentSlotStart && busyEnd > currentSlotStart) ||
          (busyStart >= currentSlotStart && busyStart < currentSlotEnd) ||
          (busyStart <= currentSlotStart && busyEnd >= currentSlotEnd)
        );
      });
      
      if (isAvailable) {
        slots.push({
          start: currentSlotStart.toISOString(),
          end: currentSlotEnd.toISOString()
        });
      }
      
      // Move to next potential slot (30-minute increments)
      currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);
    }
    
    // Move to the next day
    timeSlotStart.setDate(timeSlotStart.getDate() + 1);
    timeSlotStart.setHours(workDayStartHour, 0, 0, 0);
  }
  
  return slots;
}

// Function to filter slots by busy periods
function filterSlotsByBusyPeriods(slots, busyPeriods) {
  return slots.filter(slot => {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    
    // Check if this slot overlaps with any busy period
    return !busyPeriods.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      
      return (
        (busyStart <= slotStart && busyEnd > slotStart) ||
        (busyStart >= slotStart && busyStart < slotEnd) ||
        (busyStart <= slotStart && busyEnd >= slotEnd)
      );
    });
  });
}

// @route   POST api/events/:id/sync-google
// @desc    Add event to Google Calendar
// @access  Private
router.post('/:id/sync-google', auth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { sendInvites = false } = req.body;
    
    // Get event details
    const event = await Event.findById(eventId)
      .populate('creator', 'name email')
      .populate('organizers.user', 'name email')
      .populate('participants.user', 'name email');
      
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Verify the user has permission
    const isAuthorized =
      event.creator._id.toString() === req.user.id ||
      event.organizers.some(org => org.user._id.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to sync this event' });
    }
    
    // Get user for Google Calendar access
    const user = await User.findById(req.user.id);
    
    if (!user.calendarConnected || !user.calendarRefreshToken) {
      return res.status(400).json({ 
        msg: 'You must connect your Google Calendar to use this feature' 
      });
    }
    
    // Initialize Google OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      refresh_token: user.calendarRefreshToken
    });
    
    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Prepare attendees list
    const attendees = event.participants.map(participant => ({
      email: participant.user.email,
      displayName: participant.user.name,
      responseStatus: 
        participant.status === 'going' ? 'accepted' :
        participant.status === 'maybe' ? 'tentative' :
        participant.status === 'not going' ? 'declined' : 'needsAction'
    }));
    
    // Prepare recurrence rules if event is recurring
    let recurrence = null;
    if (event.recurrence) {
      recurrence = buildRecurrenceRule(event.recurrence);
    }
    
    // Prepare reminders
    const reminders = event.reminders && event.reminders.length > 0 
      ? {
          useDefault: false,
          overrides: event.reminders.map(reminder => ({
            method: reminder.type === 'email' ? 'email' : 'popup',
            minutes: reminder.minutes
          }))
        }
      : { useDefault: true };
    
    // Prepare conference data if needed
    let conferenceData = undefined;
    if (event.conferenceData) {
      if (event.conferenceData.type === 'googleMeet') {
        conferenceData = {
          createRequest: {
            requestId: `${event._id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        };
      } else if (event.conferenceData.type === 'custom' && event.conferenceData.url) {
        // For custom URLs, add to description instead
        event.description = `${event.description || ''}\n\nMeeting URL: ${event.conferenceData.url}`;
      }
    }
    
    // Create Google Calendar event
    const googleEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startDate,
        timeZone: event.timeZone || 'UTC'
      },
      end: {
        dateTime: event.endDate,
        timeZone: event.timeZone || 'UTC'
      },
      location: event.location?.name 
        ? `${event.location.name}${event.location.address ? `, ${event.location.address}` : ''}`
        : undefined,
      attendees: sendInvites ? attendees : undefined,
      recurrence: recurrence,
      reminders: reminders,
      conferenceData: conferenceData,
      // Add new fields for Google Calendar
      colorId: event.colorId || '1',
      transparency: event.transparency || 'opaque',
      guestsCanModify: event.guestPermissions?.canModify || false,
      guestsCanInviteOthers: event.guestPermissions?.canInviteOthers || true,
      guestsCanSeeOtherGuests: event.guestPermissions?.canSeeGuestList || true,
      visibility: event.privateEvent ? 'private' : 'default'
    };

    // If there are attachments, add them to the event
    if (event.attachments && event.attachments.length > 0) {
      googleEvent.attachments = event.attachments.map(attachment => ({
        fileUrl: attachment.fileUrl,
        title: attachment.name,
        mimeType: attachment.mimeType
      }));
    }

    // Special options for conference data and attachments
    const calendarOptions = conferenceData 
      ? { conferenceDataVersion: 1 } 
      : undefined;

    // Add support for attachments if needed
    if (event.attachments && event.attachments.length > 0) {
      calendarOptions = {
        ...(calendarOptions || {}),
        supportsAttachments: true
      };
    }
    
    // Insert event into Google Calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: googleEvent,
      sendUpdates: sendInvites ? 'all' : 'none',
      ...calendarOptions
    });
    
    // Update event with Google Calendar ID
    await Event.findByIdAndUpdate(eventId, {
      googleCalendarEventId: response.data.id,
      googleCalendarLink: response.data.htmlLink
    });
    
    res.json({
      msg: 'Event added to Google Calendar',
      googleCalendarEventId: response.data.id,
      googleCalendarLink: response.data.htmlLink
    });
  } catch (err) {
    console.error('Error adding event to Google Calendar:', err);
    res.status(500).json({
      msg: 'Server error when adding event to Google Calendar',
      error: err.message
    });
  }
});

// Helper function to build recurrence rule
function buildRecurrenceRule(recurrence) {
  if (!recurrence || recurrence.type === 'none') {
    return null;
  }
  
  let rule = 'RRULE:FREQ=';
  
  // Set frequency
  switch (recurrence.type) {
    case 'daily':
      rule += 'DAILY';
      break;
    case 'weekly':
      rule += 'WEEKLY';
      break;
    case 'monthly':
      rule += 'MONTHLY';
      break;
    case 'yearly':
      rule += 'YEARLY';
      break;
    default:
      return null;
  }
  
  // Add interval if greater than 1
  if (recurrence.interval && recurrence.interval > 1) {
    rule += `;INTERVAL=${recurrence.interval}`;
  }
  
  // Add weekdays for weekly recurrence
  if (recurrence.type === 'weekly' && recurrence.weekDays && recurrence.weekDays.length > 0) {
    rule += `;BYDAY=${recurrence.weekDays.join(',')}`;
  }
  
  // Add end condition
  if (recurrence.endDate) {
    const endDate = new Date(recurrence.endDate);
    const year = endDate.getFullYear();
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const day = String(endDate.getDate()).padStart(2, '0');
    rule += `;UNTIL=${year}${month}${day}T235959Z`;
  } else if (recurrence.endAfter && recurrence.endAfter > 0) {
    rule += `;COUNT=${recurrence.endAfter}`;
  }
  
  return [rule];
}

// @route   GET api/events/:id/google-url
// @desc    Get URL to view event in Google Calendar
// @access  Private
router.get('/:id/google-url', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user has permission to access this event
    const isAuthorized =
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id) ||
      event.participants.some(part => part.user.toString() === req.user.id) ||
      event.isPublic;
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to access this event' });
    }
    
    // If event already has a Google Calendar link, return it
    if (event.googleCalendarLink) {
      return res.json({ url: event.googleCalendarLink });
    }
    
    // Otherwise, generate a Google Calendar URL
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    // Format dates for Google Calendar URL
    const formatDateForGCal = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(
      event.location?.name 
        ? `${event.location.name}${event.location.address ? `, ${event.location.address}` : ''}`
        : ''
    );
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForGCal(startDate)}/${formatDateForGCal(endDate)}&details=${details}&location=${location}`;
    
    res.json({ url: googleCalendarUrl });
  } catch (err) {
    console.error('Error generating Google Calendar URL:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 