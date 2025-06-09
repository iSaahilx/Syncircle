import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { PaperAirplaneIcon, UserIcon } from '@heroicons/react/24/outline';

const TripDiscussion = ({ trip, setTrip }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMessages();
  }, [trip._id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/trips/${trip._id}/messages`);
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`/api/trips/${trip._id}/messages`, {
        content: newMessage
      });
      
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Function to determine if a message is from the current user
  const isCurrentUserMessage = (message) => {
    return message.user?._id === currentUser?.uid;
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 flex flex-col h-[600px]">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Trip Discussion</h2>
      
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${isCurrentUserMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3/4 rounded-lg p-3 ${
                  isCurrentUserMessage(message)
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center mb-1">
                  {!isCurrentUserMessage(message) && (
                    <div className="flex items-center mr-2">
                      {message.user?.avatar ? (
                        <img
                          src={message.user.avatar}
                          alt={message.user.name}
                          className="h-6 w-6 rounded-full mr-2"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                      )}
                      <span className="text-xs font-medium text-gray-700">
                        {message.user?.name || 'Unknown User'}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatTimestamp(message.createdAt)}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Message Input */}
      <div className="mt-auto">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            placeholder="Type your message here..."
            className="flex-1 focus:ring-primary-500 focus:border-primary-500 block w-full rounded-md sm:text-sm border-gray-300"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
          >
            <PaperAirplaneIcon className="h-5 w-5 -rotate-12" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TripDiscussion; 