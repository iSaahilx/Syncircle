import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const CreateEvent = () => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'other',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '12:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '13:00',
    location: {
      name: '',
      address: '',
      coordinates: {
        lat: null,
        lng: null
      }
    },
    isPublic: false,
    recurrence: {
      type: 'none',
      interval: 1,
      endAfter: 1,
      endDate: format(new Date(), 'yyyy-MM-dd'),
      weekDays: []
    },
    reminders: [
      { type: 'notification', minutes: 30 }
    ],
    conferenceData: {
      type: 'none',
      url: ''
    },
    syncWithGoogle: false,
    findBestTime: false,
    timeSlots: [],
    colorId: '1',
    guestPermissions: {
      canModify: false,
      canInviteOthers: true,
      canSeeGuestList: true
    },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    transparency: 'opaque',
    privateEvent: false,
    attachments: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedTimes, setSuggestedTimes] = useState([]);
  const [calendarConnected, setCalendarConnected] = useState(
    currentUser?.calendarConnected || false
  );
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchingBestTime, setSearchingBestTime] = useState(false);
  const navigate = useNavigate();
  
  const { 
    title, 
    description, 
    eventType, 
    startDate, 
    startTime, 
    endDate, 
    endTime, 
    location, 
    isPublic,
    recurrence,
    conferenceData,
    syncWithGoogle,
    findBestTime,
    reminders,
    timeSlots,
    colorId,
    guestPermissions,
    timeZone,
    transparency,
    privateEvent,
    attachments
  } = formData;
  
  const eventTypes = [
    { value: 'trip', label: 'Trip' },
    { value: 'party', label: 'Party' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'meetup', label: 'Meetup' },
    { value: 'conference', label: 'Conference' },
    { value: 'other', label: 'Other' }
  ];

  const recurrenceTypes = [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' }
  ];

  const weekDays = [
    { value: 'MO', label: 'Monday' },
    { value: 'TU', label: 'Tuesday' },
    { value: 'WE', label: 'Wednesday' },
    { value: 'TH', label: 'Thursday' },
    { value: 'FR', label: 'Friday' },
    { value: 'SA', label: 'Saturday' },
    { value: 'SU', label: 'Sunday' }
  ];

  const conferenceTypes = [
    { value: 'none', label: 'None' },
    { value: 'googleMeet', label: 'Google Meet' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'custom', label: 'Custom URL' }
  ];

  const reminderOptions = [
    { value: 0, label: 'At time of event' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
    { value: 1440, label: '1 day before' },
    { value: 10080, label: '1 week before' }
  ];

  const colorOptions = [
    { id: '1', name: 'Lavender', color: '#7986cb' },
    { id: '2', name: 'Sage', color: '#33b679' },
    { id: '3', name: 'Grape', color: '#8e24aa' },
    { id: '4', name: 'Flamingo', color: '#e67c73' },
    { id: '5', name: 'Banana', color: '#f6c026' },
    { id: '6', name: 'Tangerine', color: '#f5511d' },
    { id: '7', name: 'Peacock', color: '#039be5' },
    { id: '8', name: 'Graphite', color: '#616161' },
    { id: '9', name: 'Blueberry', color: '#3f51b5' },
    { id: '10', name: 'Basil', color: '#0b8043' },
    { id: '11', name: 'Tomato', color: '#d60000' }
  ];

  const timeZones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London, Edinburgh' },
    { value: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Osaka' },
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
    { value: 'Australia/Sydney', label: 'Sydney, Melbourne' }
  ];
  
  // Check if calendar is connected on mount
  useEffect(() => {
    setCalendarConnected(currentUser?.calendarConnected || false);
  }, [currentUser]);

  // Add a time slot
  const addTimeSlot = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      ...formData,
      timeSlots: [
        ...timeSlots,
        {
          date: format(tomorrow, 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '17:00'
        }
      ]
    });
  };

  // Remove a time slot
  const removeTimeSlot = (index) => {
    const updatedSlots = [...timeSlots];
    updatedSlots.splice(index, 1);
    setFormData({
      ...formData,
      timeSlots: updatedSlots
    });
  };

  // Handle adding a reminder
  const addReminder = () => {
    setFormData({
      ...formData,
      reminders: [...reminders, { type: 'notification', minutes: 30 }]
    });
  };

  // Handle removing a reminder
  const removeReminder = (index) => {
    const updatedReminders = [...reminders];
    updatedReminders.splice(index, 1);
    setFormData({
      ...formData,
      reminders: updatedReminders
    });
  };

  // Search for location suggestions (simulating Google Places API)
  const searchLocations = async (query) => {
    if (!query) return;
    
    setSearchingLocation(true);
    try {
      // This would be replaced with actual Google Places API call
      // For demo purposes, simulating a delay and response
      setTimeout(() => {
        const mockResults = [
          { name: query + ' Coffee Shop', address: '123 Main St, City, State', lat: 40.7128, lng: -74.0060 },
          { name: query + ' Mall', address: '456 Market Ave, City, State', lat: 40.7129, lng: -74.0061 },
          { name: query + ' Park', address: '789 Park Blvd, City, State', lat: 40.7130, lng: -74.0062 }
        ];
        setLocationSuggestions(mockResults);
        setSearchingLocation(false);
      }, 500);
    } catch (err) {
      console.error('Error searching locations:', err);
      setSearchingLocation(false);
    }
  };

  // Select a suggested location
  const selectLocation = (location) => {
    setFormData({
      ...formData,
      location: {
        name: location.name,
        address: location.address,
        coordinates: {
          lat: location.lat,
          lng: location.lng
        }
      }
    });
    setLocationSuggestions([]);
  };

  // Find best time based on participants' calendars
  const findOptimalTime = async () => {
    if (!calendarConnected) {
      setError('Please connect your Google Calendar first to use this feature');
      return;
    }
    
    setSearchingBestTime(true);
    try {
      // Make API call to find available slots
      const response = await axios.post('/api/events/suggestions', {
        startDate: new Date(`${startDate}T${startTime}`).toISOString(),
        endDate: new Date(`${endDate}T${endTime}`).toISOString(),
        duration: 60, // minutes
        participants: [] // Would be populated from invitees
      });
      
      setSuggestedTimes(response.data.suggestions || []);
    } catch (err) {
      console.error('Error finding optimal meeting time:', err);
      setError('Failed to find optimal meeting times. Please try again.');
    } finally {
      setSearchingBestTime(false);
    }
  };

  // Apply a suggested time
  const applySuggestedTime = (suggestion) => {
    const startDateTime = new Date(suggestion.start);
    const endDateTime = new Date(suggestion.end);
    
    setFormData({
      ...formData,
      startDate: format(startDateTime, 'yyyy-MM-dd'),
      startTime: format(startDateTime, 'HH:mm'),
      endDate: format(endDateTime, 'yyyy-MM-dd'),
      endTime: format(endDateTime, 'HH:mm')
    });
    
    setSuggestedTimes([]);
  };

  // Handle change for nested objects in form
  const handleNestedChange = (e, objectName, property) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    setFormData({
      ...formData,
      [objectName]: {
        ...formData[objectName],
        [property]: value
      }
    });
  };

  // Handle week day selection for recurring events
  const handleWeekDayToggle = (day) => {
    const weekDays = [...recurrence.weekDays];
    const index = weekDays.indexOf(day);
    
    if (index === -1) {
      weekDays.push(day);
    } else {
      weekDays.splice(index, 1);
    }
    
    setFormData({
      ...formData,
      recurrence: {
        ...recurrence,
        weekDays
      }
    });
  };

  // Handle reminder change
  const handleReminderChange = (index, field, value) => {
    const updatedReminders = [...reminders];
    updatedReminders[index] = {
      ...updatedReminders[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      reminders: updatedReminders
    });
  };

  // Handle time slot change
  const handleTimeSlotChange = (index, field, value) => {
    const updatedSlots = [...timeSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      timeSlots: updatedSlots
    });
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle location search input
  const handleLocationSearch = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      location: {
        ...location,
        name: value
      }
    });
    
    // Debounce location search
    if (value.length > 2) {
      const timeoutId = setTimeout(() => {
        searchLocations(value);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!title || !startDate || !endDate) {
      setError('Please fill in all required fields');
      return;
    }
    
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    if (endDateTime < startDateTime) {
      setError('End date must be after start date');
      return;
    }
    
    setLoading(true);
    
    try {
      const eventData = {
        title,
        description,
        eventType,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        location,
        isPublic,
        recurrence: recurrence.type !== 'none' ? recurrence : null,
        reminders,
        conferenceData: conferenceData.type !== 'none' ? conferenceData : null,
        timeSlots: findBestTime ? timeSlots : [],
        syncWithGoogle,
        colorId,
        guestPermissions,
        timeZone,
        transparency,
        privateEvent
      };
      
      const res = await axios.post('/api/events', eventData);
      
      // If syncWithGoogle is true, create event in Google Calendar
      if (syncWithGoogle && calendarConnected) {
        try {
          await axios.post(`/api/events/${res.data._id}/sync-google`, {
            sendInvites: true
          });
        } catch (err) {
          console.error('Error syncing with Google Calendar:', err);
          // Continue anyway as the event was created in our system
        }
      }
      
      setLoading(false);
      navigate(`/events/${res.data._id}`);
    } catch (err) {
      setError(
        err.response?.data?.msg || 
        'Failed to create event. Please try again.'
      );
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Process each file
    const newAttachments = files.map(file => ({
      name: file.name,
      fileUrl: URL.createObjectURL(file), // Create temporary URL
      mimeType: file.type,
      fileSize: file.size,
      // For a real app, you'd upload to server/cloud storage
      // and get a permanent URL instead of this temporary one
      file: file // Keep reference to the actual file for upload
    }));
    
    setFormData({
      ...formData,
      attachments: [...attachments, ...newAttachments]
    });
  };

  const removeAttachment = (index) => {
    const updatedAttachments = [...attachments];
    updatedAttachments.splice(index, 1);
    setFormData({
      ...formData,
      attachments: updatedAttachments
    });
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details to create your event
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-6 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={title}
            onChange={handleChange}
            required
            className="input-field mt-1"
            placeholder="Enter a descriptive title"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={handleChange}
            rows="3"
            className="input-field mt-1"
            placeholder="What's this event about?"
          />
        </div>
        
        <div>
          <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">
            Event Type
          </label>
          <select
            id="eventType"
            name="eventType"
            value={eventType}
            onChange={handleChange}
            className="input-field mt-1"
          >
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Smart Time Scheduling Section */}
        <div className="bg-blue-50 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-blue-800">Smart Scheduling</h3>
            {calendarConnected ? (
              <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded-full">
                Google Calendar Connected
              </span>
            ) : (
              <span className="text-xs text-red-600 px-2 py-1 bg-red-100 rounded-full">
                Not Connected
              </span>
            )}
          </div>
          
          <div className="mt-3 flex items-center">
            <input
              type="checkbox"
              id="findBestTime"
              name="findBestTime"
              checked={findBestTime}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="findBestTime" className="ml-2 block text-sm text-gray-700">
              Find the best time for participants
            </label>
          </div>
          
          {findBestTime && (
            <div className="mt-3">
              <p className="text-sm text-blue-700 mb-2">
                Provide multiple time slots that work for you:
              </p>
              
              {timeSlots.map((slot, index) => (
                <div key={index} className="flex mb-2 items-center space-x-2">
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => handleTimeSlotChange(index, 'date', e.target.value)}
                    className="input-field text-xs"
                  />
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                    className="input-field text-xs"
                  />
                  <span className="text-xs">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                    className="input-field text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addTimeSlot}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another time slot option
              </button>
              
              <button
                type="button"
                onClick={findOptimalTime}
                disabled={!calendarConnected || searchingBestTime}
                className="mt-3 w-full inline-flex justify-center items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none disabled:opacity-50"
              >
                {searchingBestTime ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing calendars...
                  </>
                ) : (
                  <>
                    <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Find optimal meeting times
                  </>
                )}
              </button>
              
              {suggestedTimes.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Suggested Times:</h4>
                  <div className="space-y-1">
                    {suggestedTimes.map((time, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applySuggestedTime(time)}
                        className="text-xs block w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded"
                      >
                        {new Date(time.start).toLocaleString()} - {new Date(time.end).toLocaleTimeString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <div className="mt-1 flex space-x-2">
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={startDate}
                onChange={handleChange}
                required
                className="input-field"
              />
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={startTime}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date *
            </label>
            <div className="mt-1 flex space-x-2">
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={endDate}
                onChange={handleChange}
                required
                className="input-field"
              />
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={endTime}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>
        
        {/* Recurrence Options */}
        <div>
          <label htmlFor="recurrence.type" className="block text-sm font-medium text-gray-700">
            Recurrence
          </label>
          <select
            id="recurrence.type"
            name="recurrence.type"
            value={recurrence.type}
            onChange={(e) => handleNestedChange(e, 'recurrence', 'type')}
            className="input-field mt-1"
          >
            {recurrenceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          
          {recurrence.type !== 'none' && (
            <div className="mt-3 pl-3 border-l-2 border-blue-200">
              {recurrence.type === 'custom' && (
                <div className="mb-2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Repeat every
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={recurrence.interval}
                      onChange={(e) => handleNestedChange({ target: { value: parseInt(e.target.value) }}, 'recurrence', 'interval')}
                      className="input-field w-16"
                    />
                    <select
                      value={recurrence.type}
                      onChange={(e) => handleNestedChange(e, 'recurrence', 'type')}
                      className="input-field"
                    >
                      <option value="daily">day(s)</option>
                      <option value="weekly">week(s)</option>
                      <option value="monthly">month(s)</option>
                      <option value="yearly">year(s)</option>
                    </select>
                  </div>
                </div>
              )}
              
              {(recurrence.type === 'weekly' || recurrence.type === 'custom') && (
                <div className="mb-2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Repeat on
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {weekDays.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWeekDayToggle(day.value)}
                        className={`w-8 h-8 rounded-full text-xs flex items-center justify-center ${
                          recurrence.weekDays.includes(day.value)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {day.value.substring(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-2">
                <label className="block text-sm text-gray-700 mb-1">
                  Ends
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="never"
                      name="recurrenceEnd"
                      checked={!recurrence.endDate && !recurrence.endAfter}
                      onChange={() => setFormData({
                        ...formData,
                        recurrence: {
                          ...recurrence,
                          endDate: null,
                          endAfter: null
                        }
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="never" className="text-sm text-gray-700">Never</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="endAfter"
                      name="recurrenceEnd"
                      checked={!!recurrence.endAfter}
                      onChange={() => setFormData({
                        ...formData,
                        recurrence: {
                          ...recurrence,
                          endAfter: 1,
                          endDate: null
                        }
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="endAfter" className="text-sm text-gray-700 mr-2">After</label>
                    {recurrence.endAfter !== null && (
                      <input
                        type="number"
                        min="1"
                        value={recurrence.endAfter}
                        onChange={(e) => handleNestedChange({ target: { value: parseInt(e.target.value) }}, 'recurrence', 'endAfter')}
                        className="input-field w-16 mr-2"
                      />
                    )}
                    <span className="text-sm text-gray-700">occurrences</span>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="endDate"
                      name="recurrenceEnd"
                      checked={!!recurrence.endDate}
                      onChange={() => setFormData({
                        ...formData,
                        recurrence: {
                          ...recurrence,
                          endDate: format(new Date(), 'yyyy-MM-dd'),
                          endAfter: null
                        }
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="endDate" className="text-sm text-gray-700 mr-2">On</label>
                    {recurrence.endDate && (
                      <input
                        type="date"
                        value={recurrence.endDate}
                        onChange={(e) => handleNestedChange(e, 'recurrence', 'endDate')}
                        className="input-field"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Location with suggestions (Google Places) */}
        <div>
          <label htmlFor="location.name" className="block text-sm font-medium text-gray-700">
            Venue/Location Name
          </label>
          <div className="relative">
            <input
              type="text"
              id="location.name"
              name="location.name"
              value={location.name}
              onChange={handleLocationSearch}
              className="input-field mt-1"
              placeholder="Search for a location..."
            />
            
            {searchingLocation && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
            
            {locationSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
                {locationSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectLocation(suggestion)}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
                  >
                    <div className="font-medium text-sm">{suggestion.name}</div>
                    <div className="text-xs text-gray-500">{suggestion.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="location.address" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            type="text"
            id="location.address"
            name="location.address"
            value={location.address}
            onChange={handleChange}
            className="input-field mt-1"
            placeholder="Street address, city, state"
          />
        </div>
        
        {/* Conference/Video Meeting Options */}
        <div>
          <label htmlFor="conferenceData.type" className="block text-sm font-medium text-gray-700">
            Video Conference
          </label>
          <select
            id="conferenceData.type"
            name="conferenceData.type"
            value={conferenceData.type}
            onChange={(e) => handleNestedChange(e, 'conferenceData', 'type')}
            className="input-field mt-1"
          >
            {conferenceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          
          {conferenceData.type === 'custom' && (
            <div className="mt-2">
              <input
                type="text"
                value={conferenceData.url}
                onChange={(e) => handleNestedChange(e, 'conferenceData', 'url')}
                className="input-field"
                placeholder="Enter meeting URL"
              />
            </div>
          )}
          
          {(conferenceData.type === 'googleMeet' || conferenceData.type === 'zoom') && (
            <div className="mt-2 text-sm text-gray-500">
              A meeting link will be automatically generated when the event is created.
            </div>
          )}
        </div>
        
        {/* Reminders Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reminders
          </label>
          
          <div className="space-y-2">
            {reminders.map((reminder, index) => (
              <div key={index} className="flex items-center space-x-2">
                <select
                  value={reminder.minutes}
                  onChange={(e) => handleReminderChange(index, 'minutes', Number(e.target.value))}
                  className="input-field"
                >
                  {reminderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                <button
                  type="button"
                  onClick={() => removeReminder(index)}
                  className="text-red-500 hover:text-red-700"
                  disabled={reminders.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={addReminder}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add reminder
          </button>
        </div>
        
        {/* Google Calendar Sync */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="syncWithGoogle"
            name="syncWithGoogle"
            checked={syncWithGoogle}
            onChange={handleChange}
            disabled={!calendarConnected}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="syncWithGoogle" className="ml-2 block text-sm text-gray-700">
            Add to my Google Calendar
            {!calendarConnected && (
              <span className="text-xs text-red-500 ml-1">
                (Connect Google Calendar first)
              </span>
            )}
          </label>
        </div>
        
        {/* Color Coding */}
        <div className="mb-4 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Color
          </label>
          <div className="grid grid-cols-6 gap-2">
            {colorOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormData({...formData, colorId: option.id})}
                className={`w-8 h-8 rounded-full hover:opacity-80 ${
                  colorId === option.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                style={{ backgroundColor: option.color }}
                title={option.name}
              />
            ))}
          </div>
        </div>

        {/* Time Zone */}
        <div className="mb-4">
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            Time Zone
          </label>
          <select
            id="timeZone"
            name="timeZone"
            value={timeZone}
            onChange={handleChange}
            className="input-field mt-1"
          >
            {timeZones.map(zone => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </div>

        {/* Guest Permissions */}
        <div className="mb-4 border-t pt-4">
          <h3 className="font-medium text-gray-700 mb-2">Guest Permissions</h3>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="guestPermissions.canModify"
                checked={guestPermissions.canModify}
                onChange={(e) => handleNestedChange(e, 'guestPermissions', 'canModify')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="guestPermissions.canModify" className="ml-2 text-sm text-gray-700">
                Guests can modify event
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="guestPermissions.canInviteOthers"
                checked={guestPermissions.canInviteOthers}
                onChange={(e) => handleNestedChange(e, 'guestPermissions', 'canInviteOthers')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="guestPermissions.canInviteOthers" className="ml-2 text-sm text-gray-700">
                Guests can invite others
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="guestPermissions.canSeeGuestList"
                checked={guestPermissions.canSeeGuestList}
                onChange={(e) => handleNestedChange(e, 'guestPermissions', 'canSeeGuestList')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="guestPermissions.canSeeGuestList" className="ml-2 text-sm text-gray-700">
                Guests can see other guests
              </label>
            </div>
          </div>
        </div>

        {/* File Attachments */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments
          </label>
          
          {attachments.length > 0 && (
            <div className="mb-2 space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm truncate max-w-xs">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2">
            <label className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 cursor-pointer">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attach files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Add files, documents, or images to share with participants
            </p>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="mb-4 border-t pt-4">
          <h3 className="font-medium text-gray-700 mb-2">Calendar Visibility</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="radio"
                id="visibilityBusy"
                name="transparency"
                value="opaque"
                checked={transparency === 'opaque'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300"
              />
              <label htmlFor="visibilityBusy" className="ml-2 text-sm text-gray-700">
                Show as busy
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="radio"
                id="visibilityFree"
                name="transparency"
                value="transparent"
                checked={transparency === 'transparent'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300"
              />
              <label htmlFor="visibilityFree" className="ml-2 text-sm text-gray-700">
                Show as free
              </label>
            </div>
            
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="privateEvent"
                name="privateEvent"
                checked={privateEvent}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="privateEvent" className="ml-2 text-sm text-gray-700">
                Private event (details visible only to you)
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={isPublic}
            onChange={handleChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
            Make this event public (anyone with the link can join)
          </label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent; 