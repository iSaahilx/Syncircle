import React, { useState } from 'react';
import RsvpButton from './RsvpButton';

const ParticipantList = ({ participants = [], organizers = [], eventId, onParticipantUpdate }) => {
  // State to track if the current user is in the participants list
  const [currentUserStatus, setCurrentUserStatus] = useState(null);
  
  // Get current user ID from localStorage
  const currentUserId = localStorage.getItem('userId');
  
  if (!participants.length && !organizers.length) {
    return (
      <div className="border rounded-lg p-4 bg-white shadow mb-6">
        <h3 className="text-lg font-semibold mb-2">Participants</h3>
        <p className="text-gray-500">No participants yet.</p>
      </div>
    );
  }

  // Combine organizers and participants for display
  const allParticipants = [
    ...organizers.map(org => ({
      ...org,
      isOrganizer: true
    })),
    ...participants.filter(p => 
      // Filter out participants who are already listed as organizers
      !organizers.some(org => org.user._id === p.user._id)
    )
  ];

  // Sort by status: organizers first, then going, maybe, pending, not going
  const statusOrder = {
    organizer: 0,
    going: 1,
    maybe: 2,
    pending: 3,
    'not going': 4
  };
  
  allParticipants.sort((a, b) => {
    const statusA = a.isOrganizer ? 'organizer' : a.status;
    const statusB = b.isOrganizer ? 'organizer' : b.status;
    return statusOrder[statusA] - statusOrder[statusB];
  });

  const getStatusBadge = (participant) => {
    if (participant.isOrganizer) {
      return (
        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
          Organizer
        </span>
      );
    }
    
    const statusColors = {
      going: 'bg-green-100 text-green-800',
      maybe: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
      'not going': 'bg-red-100 text-red-800'
    };
    
    const color = statusColors[participant.status] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`${color} text-xs px-2 py-1 rounded-full`}>
        {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
      </span>
    );
  };

  // Handle RSVP status update
  const handleStatusUpdate = (updatedData) => {
    if (onParticipantUpdate) {
      onParticipantUpdate(updatedData);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Participants</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 text-gray-600 text-sm leading-normal">
            <tr>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Response Date</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {allParticipants.map((participant, index) => {
              // Check if this is the current user
              const isCurrentUser = currentUserId && participant.user._id === currentUserId;
              
              return (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      {participant.user.avatar ? (
                        <img
                          src={participant.user.avatar}
                          alt={participant.user.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-medium">
                            {participant.user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <span>{participant.user.name || participant.user.email}</span>
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">You</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(participant)}
                  </td>
                  <td className="py-3 px-4">
                    {participant.responseDate ? new Date(participant.responseDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {/* Show RSVP button for all non-organizer participants */}
                    {!participant.isOrganizer && (
                      <RsvpButton 
                        eventId={eventId} 
                        currentStatus={participant.status} 
                        onStatusUpdate={handleStatusUpdate}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantList; 