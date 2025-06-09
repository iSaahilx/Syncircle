import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { currentUser, setError } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    avatar: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        avatar: currentUser.avatar || ''
      });
      setCalendarConnected(currentUser.calendarConnected || false);
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    
    try {
      await axios.put('/api/users/profile', formData);
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('Failed to update profile');
      setLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await axios.get('/api/auth/google');
      window.location.href = res.data.url;
    } catch (err) {
      setError('Failed to connect to Google Calendar');
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await axios.delete('/api/users/calendar/disconnect');
      setCalendarConnected(false);
    } catch (err) {
      setError('Failed to disconnect Google Calendar');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account information
        </p>
      </div>

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-md mb-6 text-sm">
          Profile updated successfully
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field mt-1"
            />
          </div>

          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
              Avatar URL
            </label>
            <input
              type="text"
              id="avatar"
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
              className="input-field mt-1"
              placeholder="https://example.com/avatar.jpg"
            />
            {formData.avatar && (
              <div className="mt-2">
                <img
                  src={formData.avatar}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Error'}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Services</h3>
        
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">Google Calendar</h4>
            <p className="text-sm text-gray-500">
              {calendarConnected
                ? 'Your Google Calendar is connected'
                : 'Connect your Google Calendar to sync events'}
            </p>
          </div>
          
          {calendarConnected ? (
            <button
              onClick={handleDisconnectCalendar}
              className="btn-secondary text-sm"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnectCalendar}
              className="btn-primary text-sm"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
