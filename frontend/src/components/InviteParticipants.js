import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const InviteParticipants = ({ eventId, onInviteSuccess }) => {
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!emails.trim()) {
      setError('Please enter at least one email address');
      return;
    }
    
    // Split emails by commas, semicolons, or whitespace and trim
    const emailList = emails
      .split(/[,;\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    // Basic email validation
    const invalidEmails = emailList.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setError(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setInviteResult(null);
    
    try {
      const response = await axios.post(`/api/events/${eventId}/invite`, {
        emails: emailList
      });
      
      setInviteResult(response.data.invited);
      setEmails('');
      
      if (onInviteSuccess) {
        onInviteSuccess(response.data);
      }
    } catch (err) {
      console.error('Error inviting participants:', err);
      setError(
        err.response?.data?.msg || 
        'Failed to send invitations. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Invite Participants</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {inviteResult && (
        <div className="mb-4">
          {inviteResult.success.length > 0 && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-2">
              <p className="font-medium">Successfully invited {inviteResult.success.length} participant(s):</p>
              <p className="text-sm">{inviteResult.success.join(', ')}</p>
            </div>
          )}
          
          {inviteResult.alreadyInvited.length > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-2">
              <p className="font-medium">Already invited {inviteResult.alreadyInvited.length} participant(s):</p>
              <p className="text-sm">{inviteResult.alreadyInvited.join(', ')}</p>
            </div>
          )}
          
          {inviteResult.notFound.length > 0 && (
            <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-2 rounded">
              <p className="font-medium">Not found in system {inviteResult.notFound.length} email(s):</p>
              <p className="text-sm">{inviteResult.notFound.join(', ')}</p>
              <p className="text-xs mt-1">These users need to register before they can be invited.</p>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="emails" className="block text-gray-700 font-medium mb-2">
            Email Addresses
          </label>
          <textarea
            id="emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="Enter email addresses separated by commas (e.g., user1@example.com, user2@example.com)"
            rows="3"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter multiple email addresses separated by commas.
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Sending Invitations...' : 'Send Invitations'}
        </button>
      </form>
    </div>
  );
};

export default InviteParticipants; 