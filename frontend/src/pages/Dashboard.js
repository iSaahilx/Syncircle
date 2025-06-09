import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { CalendarIcon, UsersIcon, PlusIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('Fetching events...');
        const res = await axios.get('/api/events');
        console.log('Events data received:', res.data);
        
        // Validate and sort events
        if (!Array.isArray(res.data)) {
          throw new Error('Expected an array of events but received invalid data');
        }
        
        // Filter out any events without _id
        const validEvents = res.data.filter(event => event && event._id);
        
        // Sort events by date
        const sortedEvents = validEvents.sort((a, b) => {
          return new Date(a.startDate || a.date) - new Date(b.startDate || b.date);
        });
        
        setEvents(sortedEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  // Group events by upcoming (including today) and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.startDate || event.date || today);
    return eventDate >= today;
  });
  
  const pastEvents = events.filter(event => {
    const eventDate = new Date(event.startDate || event.date || today);
    return eventDate < today;
  });

  // Format date function
  const formatEventDate = (startDate, endDate) => {
    if (!startDate) return 'Date not specified';
    
    try {
      const start = new Date(startDate);
      
      if (!endDate) return format(start, 'MMM d, yyyy');
      
      const end = new Date(endDate);
      
      // Same day event
      if (start.toDateString() === end.toDateString()) {
        return format(start, 'MMM d, yyyy');
      }
      
      // Multi-day event
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Count participants
  const countParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) return 0;
    return participants.filter(p => p.status === 'going').length;
  };

  // Helper to ensure we use the correct ID field
  const getEventId = (event) => {
    if (!event || !event._id) {
      console.error('Invalid event object or missing ID', event);
      return null;
    }
    
    console.log(`Event ID: ${event._id}`);
    return event._id;
  };

  // Test event ID
  const testEventId = async (event) => {
    try {
      setTestResult({ loading: true, event: event.title });
      console.log(`Testing event ID: ${event._id}`);
      
      const response = await axios.get(`/api/events/test/${event._id}`);
      console.log('Test result:', response.data);
      
      setTestResult({ 
        success: true, 
        data: response.data,
        event: event.title 
      });
    } catch (err) {
      console.error('Test error:', err);
      setTestResult({ 
        success: false, 
        error: err.response?.data?.msg || 'Unknown error',
        event: event.title 
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Events</h2>
        <Link
          to="/events/create"
          className="btn-primary inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Event
        </Link>
      </div>

      {testResult && (
        <div className={`p-4 mb-6 rounded-lg ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <h3 className="font-bold">{testResult.loading ? 'Testing...' : `Test Results for "${testResult.event}"`}</h3>
          {testResult.loading ? (
            <p>Loading test results...</p>
          ) : testResult.success ? (
            <div>
              <p>Event found in database!</p>
              <p>ID: {testResult.data.id}</p>
              <p>Title: {testResult.data.title}</p>
              <p>Creator: {testResult.data.creator?.name || 'Unknown'}</p>
            </div>
          ) : (
            <p>Error: {testResult.error}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-4">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No events yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first event to get started.
          </p>
          <div className="mt-6">
            <Link
              to="/events/create"
              className="btn-primary inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Event
            </Link>
          </div>
        </div>
      ) :
        <div className="space-y-8">
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map(event => {
                  if (!event || !event._id) return null;
                  return (
                    <div key={event._id} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 truncate">{event.title || 'Untitled Event'}</h4>
                            <p className="text-gray-600 text-sm mt-1 capitalize">{event.eventType || 'Event'}</p>
                            <p className="text-gray-400 text-xs mt-1">ID: {event._id}</p>
                          </div>
                          <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                            {event.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span>{formatEventDate(event.startDate || event.date, event.endDate)}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <UsersIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span>{countParticipants(event.participants)} participants</span>
                          </div>
                        </div>

                        <div className="flex mt-4 space-x-2">
                          <Link
                            to={`/events/${getEventId(event)}`}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded"
                          >
                            View Event
                          </Link>
                          <button
                            onClick={() => testEventId(event)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
                          >
                            Test ID
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Past Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastEvents.map(event => {
                  if (!event || !event._id) return null;
                  return (
                    <div key={event._id} className="bg-white rounded-lg shadow overflow-hidden opacity-75">
                      <div className="p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 truncate">{event.title || 'Untitled Event'}</h4>
                            <p className="text-gray-600 text-sm mt-1 capitalize">{event.eventType || 'Event'}</p>
                            <p className="text-gray-400 text-xs mt-1">ID: {event._id}</p>
                          </div>
                          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                            Past
                          </span>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span>{formatEventDate(event.startDate || event.date, event.endDate)}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <UsersIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span>{countParticipants(event.participants)} participants</span>
                          </div>
                        </div>

                        <div className="flex mt-4 space-x-2">
                          <Link
                            to={`/events/${getEventId(event)}`}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded"
                          >
                            View Event
                          </Link>
                          <button
                            onClick={() => testEventId(event)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
                          >
                            Test ID
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      }
    </div>
  );
};

export default Dashboard; 