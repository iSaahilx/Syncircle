const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  eventType: {
    type: String,
    enum: ['trip', 'party', 'wedding', 'meetup', 'conference', 'other'],
    default: 'other'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    name: { type: String },
    address: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      default: 'organizer'
    },
    permissions: {
      type: [String],
      default: ['edit', 'invite', 'manage']
    }
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'maybe', 'not going', 'pending'],
      default: 'pending'
    },
    responseDate: {
      type: Date
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    unique: true
  },
  expenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }],
  chat: {
    messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }]
  },
  // New Google Calendar related fields
  recurrence: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'none'
    },
    interval: {
      type: Number,
      default: 1
    },
    weekDays: {
      type: [String],
      enum: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    },
    endAfter: {
      type: Number
    },
    endDate: {
      type: Date
    }
  },
  reminders: [{
    type: {
      type: String,
      enum: ['notification', 'email'],
      default: 'notification'
    },
    minutes: {
      type: Number,
      default: 30
    }
  }],
  conferenceData: {
    type: {
      type: String,
      enum: ['none', 'googleMeet', 'zoom', 'custom'],
      default: 'none'
    },
    url: {
      type: String
    }
  },
  googleCalendarEventId: {
    type: String
  },
  googleCalendarLink: {
    type: String
  },
  timeSlots: [{
    date: {
      type: Date
    },
    startTime: {
      type: String
    },
    endTime: {
      type: String
    }
  }],
  // New fields for additional Google Calendar features
  colorId: {
    type: String,
    enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    default: '1' // Default blue color
  },
  guestPermissions: {
    canModify: {
      type: Boolean,
      default: false
    },
    canInviteOthers: {
      type: Boolean,
      default: true
    },
    canSeeGuestList: {
      type: Boolean,
      default: true
    }
  },
  attachments: [{
    name: {
      type: String
    },
    fileUrl: {
      type: String
    },
    mimeType: {
      type: String
    },
    iconLink: {
      type: String
    },
    fileSize: {
      type: Number
    }
  }],
  timeZone: {
    type: String,
    default: 'UTC'
  },
  transparency: {
    type: String,
    enum: ['opaque', 'transparent'], // opaque = busy/blocks time, transparent = free/doesn't block
    default: 'opaque'
  },
  privateEvent: {
    type: Boolean,
    default: false
  },
  // Trip-specific fields
  tripDetails: {
    destination: {
      country: { type: String },
      city: { type: String },
      region: { type: String }
    },
    itinerary: [{
      day: { type: Number }, // Day number in the trip (1, 2, 3...)
      date: { type: Date },
      activities: [{
        title: { type: String },
        description: { type: String },
        startTime: { type: String },
        endTime: { type: String },
        location: {
          name: { type: String },
          address: { type: String },
          coordinates: {
            lat: { type: Number },
            lng: { type: Number }
          }
        },
        notes: { type: String },
        completed: { type: Boolean, default: false }
      }]
    }],
    accommodations: [{
      name: { type: String },
      type: { 
        type: String, 
        enum: ['hotel', 'hostel', 'apartment', 'house', 'campsite', 'other'],
        default: 'hotel'
      },
      address: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
      checkIn: { type: Date },
      checkOut: { type: Date },
      confirmationNumber: { type: String },
      contact: { type: String },
      price: { type: Number },
      currency: { type: String, default: 'USD' },
      notes: { type: String },
      attachments: [{
        name: { type: String },
        fileUrl: { type: String }
      }]
    }],
    transportation: [{
      type: { 
        type: String, 
        enum: ['flight', 'train', 'bus', 'car', 'ferry', 'other'],
        default: 'flight'
      },
      provider: { type: String }, // Airline, car rental company, etc.
      departureLocation: { type: String },
      departureDateTime: { type: Date },
      arrivalLocation: { type: String },
      arrivalDateTime: { type: Date },
      confirmationNumber: { type: String },
      reservationDetails: { type: String }, // Seat numbers, class, etc.
      price: { type: Number },
      basePrice: { type: Number },
      numPeople: { type: Number, default: 1 },
      currency: { type: String, default: 'USD' },
      notes: { type: String },
      attachments: [{
        name: { type: String },
        fileUrl: { type: String }
      }]
    }],
    packingList: [{
      item: { type: String },
      category: { 
        type: String,
        enum: ['essentials', 'clothing', 'toiletries', 'electronics', 'documents', 'other'],
        default: 'other'
      },
      quantity: { type: Number, default: 1 },
      packed: { type: Boolean, default: false }
    }],
    documents: [{
      name: { type: String },
      type: { 
        type: String,
        enum: ['passport', 'visa', 'insurance', 'reservation', 'other'],
        default: 'other'
      },
      fileUrl: { type: String },
      notes: { type: String }
    }],
    budget: {
      currency: { type: String, default: 'USD' },
      total: { type: Number },
      categories: [{
        name: { type: String }, // Accommodation, Food, Transportation, Activities, etc.
        allocated: { type: Number },
        spent: { type: Number, default: 0 }
      }]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique invite code before saving
EventSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 10);
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema); 