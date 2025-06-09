import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Todo from '../components/Todo';
import InviteParticipants from '../components/InviteParticipants';
import ParticipantList from '../components/ParticipantList';
import CalendarAvailability from '../components/CalendarAvailability';
import { useAuth } from '../contexts/AuthContext';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showCalendarActions, setShowCalendarActions] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState(null);
  const [syncingWithGoogle, setSyncingWithGoogle] = useState(false);
  const [syncingError, setSyncingError] = useState(null);
  
  // Extract fetchEventDetails function from useEffect
  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      console.log(`Fetching event with ID: ${id}`);
      
      // Basic validation for MongoDB ObjectId format (24 hex characters)
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      if (!id || !objectIdPattern.test(id)) {
        console.error('Invalid ObjectId format:', id);
        setError('Invalid event ID format');
        setLoading(false);
        return;
      }

      // First try the test endpoint to see if the event exists at all
      try {
        const testResponse = await axios.get(`/api/events/test/${id}`);
        console.log('Test endpoint response:', testResponse.data);
        setDebugInfo(prev => ({ ...prev, testResponse: testResponse.data }));
      } catch (testError) {
        console.log('Test endpoint error:', testError);
        setDebugInfo(prev => ({ ...prev, testError }));
      }
      
      // Set a timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError('Request timed out. The server took too long to respond.');
      }, 15000); // 15 seconds timeout
      
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await axios.get(`/api/events/${id}?t=${timestamp}`);
        clearTimeout(timeoutId);
        
        console.log('Event data received:', response.data);
        setDebugInfo(prev => ({ ...prev, mainResponse: response.data }));
        
        if (!response.data) {
          throw new Error('No data received from server');
        }
        
        setEvent(response.data);
        setError(null);
      } catch (requestError) {
        clearTimeout(timeoutId);
        console.error('Error in API request:', requestError);
        
        if (requestError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const statusCode = requestError.response.status;
          const errorMsg = requestError.response.data?.msg || 'Unknown error occurred';
          
          if (statusCode === 404) {
            setError(`Event not found. It may have been deleted.`);
          } else if (statusCode === 403) {
            setError(`You don't have permission to view this event.`);
          } else {
            setError(`Server error (${statusCode}): ${errorMsg}`);
          }
        } else if (requestError.request) {
          // The request was made but no response was received
          setError('No response received from server. Please check your connection.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(`Error: ${requestError.message}`);
        }
        
        throw requestError; // Re-throw to be caught by the outer catch
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
      // Error is already set in the inner try/catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }

    return () => {
      // Cleanup function
      setEvent(null);
      setLoading(false);
      setError(null);
      setDebugInfo(null);
    };
  }, [id]);

  const handleDeleteEvent = async () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/events/${id}`);
        navigate('/dashboard');
      } catch (err) {
        setError('Failed to delete event. Please try again.');
        console.error(err);
      }
    }
  };

  const handleInviteSuccess = (data) => {
    // Update the event data with the new participants
    setEvent(data.event);
  };

  const handleParticipantUpdate = (data) => {
    // Update the event data with the updated participants
    if (data && data.participants) {
      setEvent({
        ...event,
        participants: data.participants
      });
    } else {
      // If we don't get full participant data back, refresh the event data
      fetchEventDetails();
    }
  };

  // Get Google Calendar URL
  const getGoogleCalendarUrl = async () => {
    try {
      const res = await axios.get(`/api/events/${id}/google-url`);
      setCalendarUrl(res.data.url);
    } catch (err) {
      console.error('Error getting Google Calendar URL:', err);
    }
  };
  
  // Add to Google Calendar
  const addToGoogleCalendar = async () => {
    try {
      setSyncingWithGoogle(true);
      setSyncingError(null);
      
      const res = await axios.post(`/api/events/${id}/sync-google`, {
        sendInvites: true
      });
      
      setEvent({
        ...event,
        googleCalendarEventId: res.data.googleCalendarEventId,
        googleCalendarLink: res.data.googleCalendarLink
      });
      
      setCalendarUrl(res.data.googleCalendarLink);
      setSyncingWithGoogle(false);
    } catch (err) {
      console.error('Error syncing with Google Calendar:', err);
      setSyncingError(
        err.response?.data?.msg || 
        'Failed to add event to Google Calendar. Make sure your Google Calendar is connected.'
      );
      setSyncingWithGoogle(false);
    }
  };
  
  // Add this to useEffect with other dependency arrays
  useEffect(() => {
    if (event && !calendarUrl) {
      getGoogleCalendarUrl();
    }
  }, [event]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading event details...</p>
        <p className="text-gray-400 text-sm mt-2">This may take a moment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        
        {debugInfo && debugInfo.testResponse && (
          <div className="bg-yellow-100 p-4 mb-4 rounded">
            <h3 className="font-bold">Debug Info:</h3>
            <p>Event exists in database as: {debugInfo.testResponse.title}</p>
            <p>Try refreshing the page or contact an administrator if this error persists.</p>
          </div>
        )}
        
        <button 
          onClick={() => navigate('/dashboard')} 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Event not found
        </div>
        
        {debugInfo && debugInfo.testResponse && (
          <div className="bg-yellow-100 p-4 mb-4 rounded">
            <h3 className="font-bold">Debug Info:</h3>
            <p>Event exists in database as: {debugInfo.testResponse.title}</p>
            <p>There may be an issue with retrieving the full event details.</p>
          </div>
        )}
        
        <button 
          onClick={() => navigate('/dashboard')} 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not specified';
    
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  // Format recurrence for display
  const formatRecurrence = (recurrence) => {
    if (!recurrence || recurrence.type === 'none') {
      return 'Does not repeat';
    }
    
    let recurrenceText = '';
    
    switch (recurrence.type) {
      case 'daily':
        recurrenceText = recurrence.interval > 1 ? `Every ${recurrence.interval} days` : 'Daily';
        break;
      case 'weekly':
        recurrenceText = recurrence.interval > 1 ? `Every ${recurrence.interval} weeks` : 'Weekly';
        if (recurrence.weekDays && recurrence.weekDays.length > 0) {
          const dayNames = {
            'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday', 
            'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
          };
          const daysList = recurrence.weekDays.map(day => dayNames[day]).join(', ');
          recurrenceText += ` on ${daysList}`;
        }
        break;
      case 'monthly':
        recurrenceText = recurrence.interval > 1 ? `Every ${recurrence.interval} months` : 'Monthly';
        break;
      case 'yearly':
        recurrenceText = recurrence.interval > 1 ? `Every ${recurrence.interval} years` : 'Yearly';
        break;
      default:
        recurrenceText = 'Custom recurrence';
    }
    
    // Add end information
    if (recurrence.endDate) {
      recurrenceText += ` until ${new Date(recurrence.endDate).toLocaleDateString()}`;
    } else if (recurrence.endAfter) {
      recurrenceText += `, ${recurrence.endAfter} time${recurrence.endAfter > 1 ? 's' : ''}`;
    }
    
    return recurrenceText;
  };
  
  // Format reminders for display
  const formatReminders = (reminders) => {
    if (!reminders || !reminders.length) {
      return 'No reminders';
    }
    
    return reminders.map(reminder => {
      if (reminder.minutes === 0) {
        return 'At time of event';
      } else if (reminder.minutes < 60) {
        return `${reminder.minutes} minute${reminder.minutes > 1 ? 's' : ''} before`;
      } else if (reminder.minutes === 60) {
        return '1 hour before';
      } else if (reminder.minutes < 1440) {
        return `${reminder.minutes / 60} hours before`;
      } else if (reminder.minutes === 1440) {
        return '1 day before';
      } else {
        return `${reminder.minutes / 1440} days before`;
      }
    }).join(', ');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-blue-500 p-4 text-white">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-sm">Organized by: {event.creator?.name || 'Unknown'}</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button 
            className={`py-3 px-6 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`py-3 px-6 ${activeTab === 'todos' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('todos')}
          >
            Todo List
          </button>
          <button 
            className={`py-3 px-6 ${activeTab === 'participants' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
          <button 
            className={`py-3 px-6 ${activeTab === 'calendar' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('calendar')}
          >
            Calendar
          </button>
        </div>
        
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Event Details</h3>
                  <p className="mb-2"><span className="font-medium">Start Date:</span> {formatDate(event.startDate)}</p>
                  <p className="mb-2"><span className="font-medium">End Date:</span> {formatDate(event.endDate)}</p>
                  <p className="mb-2"><span className="font-medium">Location:</span> {event.location?.name || event.location || 'Not specified'}</p>
                  <p className="mb-2"><span className="font-medium">Event Type:</span> {event.eventType || 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700">{event.description || 'No description provided'}</p>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <Link 
                  to={`/events/${id}/edit`} 
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                  Edit Event
                </Link>
                <button 
                  onClick={handleDeleteEvent} 
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete Event
                </button>
                <Link 
                  to="/dashboard" 
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Back to Dashboard
                </Link>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Calendar</h3>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  {event.googleCalendarLink ? (
                    <div className="text-green-700 mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Added to Google Calendar
                    </div>
                  ) : (
                    <div className="mb-2">
                      {calendarUrl && !syncingWithGoogle && (
                        <button 
                          onClick={addToGoogleCalendar} 
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded flex items-center"
                          disabled={!currentUser?.calendarConnected}
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.5 3h-3V1.5h-1.5V3h-7.5V1.5H6V3H4.5A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm0 16.5h-15v-9h15v9z" />
                          </svg>
                          Add to Google Calendar
                        </button>
                      )}
                      
                      {syncingWithGoogle && (
                        <div className="flex items-center text-blue-700">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                          Adding to Google Calendar...
                        </div>
                      )}
                      
                      {syncingError && (
                        <div className="text-red-600 text-sm mt-2">
                          {syncingError}
                        </div>
                      )}
                      
                      {!currentUser?.calendarConnected && (
                        <div className="text-amber-600 text-sm mt-2">
                          Connect your Google Calendar in your profile to use this feature.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {calendarUrl && !event.googleCalendarEventId && (
                    <a 
                      href={calendarUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in Google Calendar
                    </a>
                  )}
                  
                  {event.googleCalendarLink && (
                    <a 
                      href={event.googleCalendarLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View in Google Calendar
                    </a>
                  )}
                  
                  {event.recurrence && event.recurrence.type !== 'none' && (
                    <div className="mt-3 text-sm">
                      <div className="font-medium text-gray-700">Repeats</div>
                      <div className="text-gray-600">{formatRecurrence(event.recurrence)}</div>
                    </div>
                  )}
                  
                  {event.reminders && event.reminders.length > 0 && (
                    <div className="mt-3 text-sm">
                      <div className="font-medium text-gray-700">Reminders</div>
                      <div className="text-gray-600">{formatReminders(event.reminders)}</div>
                    </div>
                  )}
                  
                  {event.conferenceData && event.conferenceData.type !== 'none' && (
                    <div className="mt-3 text-sm">
                      <div className="font-medium text-gray-700">Video Conference</div>
                      <div className="text-gray-600">
                        {event.conferenceData.type === 'googleMeet' ? 'Google Meet' : 
                         event.conferenceData.type === 'zoom' ? 'Zoom Meeting' : 
                         'Custom Meeting'}
                        
                        {event.conferenceData.url && (
                          <a 
                            href={event.conferenceData.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            Join meeting
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Todo Tab */}
          {activeTab === 'todos' && (
            <div>
              <Todo eventId={id} />
            </div>
          )}
          
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div>
              {/* Debug info about user ID */}
              <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded">
                <p><strong>Debug info:</strong> User ID check is failing (localStorage.userId is null)</p>
                <p className="text-sm">Normally, only event creators and organizers can invite participants.</p>
                <p className="text-sm mb-2">For development, we're allowing all users to invite participants.</p>
                <button
                  onClick={() => {
                    // Temporarily set userId in localStorage for testing
                    localStorage.setItem('userId', event.creator?._id || '');
                    // Force re-render
                    window.location.reload();
                  }}
                  className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
                >
                  Set localStorage.userId for testing
                </button>
              </div>
              
              {/* Always show invite form in development */}
              <InviteParticipants eventId={id} onInviteSuccess={handleInviteSuccess} />
              
              <ParticipantList 
                participants={event.participants || []} 
                organizers={event.organizers || []} 
                eventId={id}
                onParticipantUpdate={handleParticipantUpdate}
              />
            </div>
          )}
          
          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div>
              <CalendarAvailability 
                eventId={id} 
                startDate={event.startDate} 
                endDate={event.endDate} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
