const mongoose = require('mongoose');
const Event = require('./models/Event');

mongoose.connect('mongodb://127.0.0.1:27017/syncircle')
  .then(() => {
    console.log('Connected to MongoDB');
    return Event.findById('67fd670c7a302be364426705')
      .populate('creator')
      .populate('organizers.user')
      .populate('participants.user');
  })
  .then(event => {
    if (!event) {
      console.log('Event not found');
      return;
    }
    
    console.log('Event found:');
    console.log('ID:', event._id);
    console.log('Title:', event.title);
    console.log('Public:', event.isPublic);
    console.log('Creator:', event.creator ? event.creator._id : 'None');
    
    console.log('\nOrganizers:');
    if (event.organizers && event.organizers.length > 0) {
      event.organizers.forEach(org => {
        console.log('- User:', org.user ? org.user._id : 'None');
      });
    } else {
      console.log('No organizers');
    }
    
    console.log('\nParticipants:');
    if (event.participants && event.participants.length > 0) {
      event.participants.forEach(part => {
        console.log('- User:', part.user ? part.user._id : 'None');
      });
    } else {
      console.log('No participants');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 