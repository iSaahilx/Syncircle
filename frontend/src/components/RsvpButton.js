import React, { useState } from 'react';
import axios from 'axios';

const RsvpButton = ({ eventId, currentStatus = 'pending', onStatusUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const statusOptions = [
    { value: 'going', label: 'Going', color: 'bg-green-500 hover:bg-green-600' },
    { value: 'maybe', label: 'Maybe', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { value: 'not going', label: 'Not Going', color: 'bg-red-500 hover:bg-red-600' }
  ];

  const handleUpdateStatus = async (status) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`/api/events/${eventId}/rsvp`, { status });
      
      if (onStatusUpdate) {
        onStatusUpdate(response.data);
      }
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error updating RSVP status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get button color based on current status
  const getButtonColor = () => {
    switch (currentStatus.toLowerCase()) {
      case 'going':
        return 'bg-green-500 hover:bg-green-600';
      case 'maybe':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'not going':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Get current status display text
  const getStatusText = () => {
    return currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`${getButtonColor()} text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50' : ''}`}
      >
        {loading ? 'Updating...' : `RSVP: ${getStatusText()}`}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {isOpen && (
        <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleUpdateStatus(option.value)}
                className={`w-full text-left block px-4 py-2 text-sm text-white ${option.color}`}
                role="menuitem"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RsvpButton; 