import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CalendarConnect from './CalendarConnect';

const CalendarAvailability = ({ eventId, startDate, endDate }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(
    currentUser?.calendarConnected || false
  );

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate time slots for the event period
  const generateTimeSlots = () => {
    if (!startDate || !endDate) return [];
    
    const slots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Create slots in 30-minute increments
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    let currentSlot = new Date(start);
    
    while (currentSlot < end) {
      const slotEnd = new Date(currentSlot.getTime() + slotDuration);
      
      slots.push({
        start: new Date(currentSlot),
        end: new Date(slotEnd),
        available: true // default to available
      });
      
      currentSlot = slotEnd;
    }
    
    return slots;
  };
  
  // Calculate which slots are free for all participants
  const calculateAvailableSlots = (slots, userAvailability) => {
    if (!userAvailability || !userAvailability.length) return slots;
    
    return slots.map(slot => {
      // Check if any user is busy during this time slot
      const isBusy = userAvailability.some(user => {
        if (!user.busyPeriods || !user.busyPeriods.length) return false;
        
        return user.busyPeriods.some(busyPeriod => {
          const busyStart = new Date(busyPeriod.start);
          const busyEnd = new Date(busyPeriod.end);
          
          // Check if the busy period overlaps with the slot
          return (
            (busyStart <= slot.start && busyEnd > slot.start) || // Busy period starts before slot and ends during slot
            (busyStart >= slot.start && busyStart < slot.end) || // Busy period starts during slot
            (busyStart <= slot.start && busyEnd >= slot.end) // Busy period encompasses the entire slot
          );
        });
      });
      
      return {
        ...slot,
        available: !isBusy
      };
    });
  };

  // Fetch availability data when component mounts
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        
        const response = await axios.get(`/api/events/${eventId}/calendar`);
        setAvailability(response.data);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching calendar availability:', err);
        setError(
          err.response?.data?.msg || 
          'Failed to fetch calendar availability'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [eventId, calendarConnected]);

  // Handle calendar connection status change
  const handleCalendarStatusChange = (isConnected) => {
    setCalendarConnected(isConnected);
  };

  // Generate time slots and mark availability
  const timeSlots = availability ? 
    calculateAvailableSlots(
      generateTimeSlots(), 
      availability.availability || []
    ) : [];

  // Group slots by day for better display
  const groupSlotsByDay = (slots) => {
    const days = {};
    
    slots.forEach(slot => {
      const dateKey = slot.start.toDateString();
      
      if (!days[dateKey]) {
        days[dateKey] = [];
      }
      
      days[dateKey].push(slot);
    });
    
    return days;
  };
  
  const slotsByDay = groupSlotsByDay(timeSlots);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3">Loading calendar availability...</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Calendar Availability</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Calendar Connection Status */}
      <CalendarConnect 
        isConnected={calendarConnected} 
        onStatusChange={handleCalendarStatusChange} 
      />
      
      {/* Event Time Range */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <h4 className="font-medium text-blue-800 mb-1">Event Time Range</h4>
        <p className="text-blue-600">
          {startDate && endDate ? (
            <>
              {formatDate(startDate)} {formatTime(startDate)} - {formatDate(endDate)} {formatTime(endDate)}
            </>
          ) : (
            'Time range not specified'
          )}
        </p>
      </div>
      
      {/* Participants with Connected Calendars */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Participants with Calendar Access</h4>
        
        {availability && availability.usersWithCalendars && availability.usersWithCalendars.length > 0 ? (
          <ul className="divide-y">
            {availability.usersWithCalendars.map(user => (
              <li key={user.id} className="py-2 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>{user.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 mb-2">No participants have connected their calendars yet.</p>
        )}
        
        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
          <p>To see availability, participants must connect their Google Calendar.</p>
        </div>
      </div>
      
      {/* Availability Display */}
      {availability && availability.availability && availability.availability.length > 0 ? (
        <div className="mb-4">
          <h4 className="font-medium mb-3">Available Time Slots</h4>
          
          {Object.keys(slotsByDay).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(slotsByDay).map(([day, slots]) => (
                <div key={day} className="border rounded overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 font-medium">
                    {new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((slot, idx) => (
                      <div 
                        key={idx}
                        className={`px-2 py-1 text-xs rounded ${
                          slot.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No time slots available for the event period.</p>
          )}
          
          <div className="flex items-center mt-3">
            <div className="flex items-center mr-4">
              <div className="w-3 h-3 bg-green-100 rounded mr-1"></div>
              <span className="text-xs text-gray-600">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 rounded mr-1"></div>
              <span className="text-xs text-gray-600">Busy</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded">
          <h4 className="font-medium mb-1">No Availability Data</h4>
          <p className="text-sm">
            {availability && availability.usersWithCalendars && availability.usersWithCalendars.length > 0 
              ? "We couldn't fetch calendar data for the connected participants. Please try again later."
              : "Connect your Google Calendar and invite other participants to do the same to view availability."}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarAvailability; 