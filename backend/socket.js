const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Event = require('./models/Event');
const Message = require('./models/Message');

module.exports = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.user.id).select('-password');
      
      if (!socket.user) {
        return next(new Error('User not found'));
      }
      
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name}`);
    
    // Join event rooms the user is part of
    socket.on('join-event', async (eventId) => {
      try {
        const event = await Event.findById(eventId);
        
        if (!event) {
          return socket.emit('error', { message: 'Event not found' });
        }
        
        // Check if user is part of the event
        const isParticipant = event.participants.some(
          p => p.user.toString() === socket.user.id
        );
        
        const isOrganizer = event.organizers.some(
          o => o.user.toString() === socket.user.id
        );
        
        if (!isParticipant && !isOrganizer && event.creator.toString() !== socket.user.id) {
          return socket.emit('error', { message: 'Not authorized to join this event' });
        }
        
        socket.join(`event:${eventId}`);
        socket.emit('joined-event', { eventId });
        
        // Notify others that user has connected
        socket.to(`event:${eventId}`).emit('user-connected', {
          user: {
            id: socket.user.id,
            name: socket.user.name,
            avatar: socket.user.avatar
          }
        });
      } catch (err) {
        socket.emit('error', { message: 'Server error' });
      }
    });
    
    // Leave event room
    socket.on('leave-event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });
    
    // Handle new messages
    socket.on('send-message', async (data) => {
      try {
        const { eventId, content, attachments } = data;
        
        // Create new message in database
        const message = new Message({
          event: eventId,
          sender: socket.user.id,
          content,
          attachments: attachments || [],
          readBy: [{ user: socket.user.id }] // Sender has read the message
        });
        
        await message.save();
        
        // Add message to event
        await Event.findByIdAndUpdate(eventId, {
          $push: { 'chat.messages': message._id }
        });
        
        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name avatar');
        
        // Broadcast to all clients in the room including sender
        io.to(`event:${eventId}`).emit('new-message', populatedMessage);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle RSVP updates
    socket.on('update-rsvp', async (data) => {
      try {
        const { eventId, status } = data;
        
        // Update participant status
        const event = await Event.findOneAndUpdate(
          { 
            _id: eventId, 
            'participants.user': socket.user.id 
          },
          { 
            $set: { 
              'participants.$.status': status,
              'participants.$.responseDate': new Date()
            } 
          },
          { new: true }
        ).populate('participants.user', 'name avatar');
        
        if (!event) {
          return socket.emit('error', { message: 'Failed to update RSVP' });
        }
        
        // Broadcast RSVP update to all participants
        io.to(`event:${eventId}`).emit('rsvp-updated', {
          userId: socket.user.id,
          status,
          participants: event.participants
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to update RSVP' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });
}; 