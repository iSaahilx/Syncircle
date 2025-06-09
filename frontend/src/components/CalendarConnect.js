import React, { useState } from 'react';
import axios from 'axios';

const CalendarConnect = ({ isConnected = false, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnectCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/auth/google');
      
      if (response.data && response.data.url) {
        // Redirect to Google OAuth consent screen
        window.location.href = response.data.url;
      } else {
        setError('Failed to get authorization URL');
      }
    } catch (err) {
      console.error('Error connecting calendar:', err);
      setError('Failed to connect to Google Calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisconnectCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete('/api/users/calendar/disconnect');
      
      if (onStatusChange) {
        onStatusChange(false);
      }
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      setError('Failed to disconnect Google Calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Google Calendar</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isConnected ? (
        <div>
          <div className="flex items-center mb-3">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span className="text-green-700">Connected to Google Calendar</span>
          </div>
          
          <button
            onClick={handleDisconnectCalendar}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect Calendar'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-3">
            <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
            <span className="text-gray-600">Not connected to Google Calendar</span>
          </div>
          
          <button
            onClick={handleConnectCalendar}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
          
          <p className="text-sm text-gray-500 mt-2">
            Connect your Google Calendar to enable schedule coordination with other participants.
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarConnect; 