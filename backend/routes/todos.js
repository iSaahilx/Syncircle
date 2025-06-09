const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Todo = require('../models/Todo');
const Event = require('../models/Event');
const mongoose = require('mongoose');

// Create a new todo
router.post('/:eventId/todos', auth, (req, res) => {
  const { eventId } = req.params;
  const { text, completed } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ msg: 'Todo text is required' });
  }

  // Check if event exists and user has access
  Event.findById(eventId)
    .then(event => {
      if (!event) {
        return res.status(404).json({ msg: 'Event not found' });
      }

      // Check if user is authorized to add todos to this event
      if (
        !event.creator || event.creator.toString() !== req.user.id &&
        !(Array.isArray(event.organizers) && event.organizers.some(org => org.user && org.user.toString() === req.user.id)) &&
        !(Array.isArray(event.participants) && event.participants.some(participant => participant.user && participant.user.toString() === req.user.id))
      ) {
        return res.status(401).json({ msg: 'Not authorized to add todos to this event' });
      }

      // Create new todo
      const newTodo = new Todo({
        event: eventId,
        text,
        completed: completed || false,
        createdBy: req.user.id
      });

      newTodo.save()
        .then(todo => res.json(todo))
        .catch(err => {
          console.error(err.message);
          res.status(500).send('Server Error');
        });
    })
    .catch(err => {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Event not found - invalid ID format' });
      }
      res.status(500).send('Server Error');
    });
});

// Get all todos for an event
router.get('/:eventId/todos', auth, (req, res) => {
  const { eventId } = req.params;
  console.log(`GET todos request received for event ID: ${eventId}`);
  
  // Validate ObjectID format before querying
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    console.error(`Invalid event ID format: ${eventId}`);
    return res.status(400).json({ msg: 'Invalid event ID format' });
  }

  // Check if event exists and user has access
  Event.findById(eventId)
    .then(event => {
      if (!event) {
        console.error(`Event not found for ID: ${eventId}`);
        return res.status(404).json({ msg: 'Event not found' });
      }

      console.log(`Found event: ${event.title} (${event._id})`);
      console.log(`User ID: ${req.user.id}`);
      console.log(`Creator ID: ${event.creator.toString()}`);

      // Check if user is authorized to view this event's todos
      const isCreator = event.creator && event.creator.toString() === req.user.id;
      const isOrganizer = Array.isArray(event.organizers) && event.organizers.some(org => org.user && org.user.toString() === req.user.id);
      const isParticipant = Array.isArray(event.participants) && event.participants.some(participant => participant.user && participant.user.toString() === req.user.id);
      
      console.log(`Auth check - Creator: ${isCreator}, Organizer: ${isOrganizer}, Participant: ${isParticipant}`);
      
      // Restore authorization check
      if (!isCreator && !isOrganizer && !isParticipant) {
        console.error(`User ${req.user.id} not authorized to view todos for event ${eventId}`);
        return res.status(401).json({ msg: 'Not authorized to view todos for this event' });
      }

      // Get todos
      console.log(`Querying todos for event: ${eventId}`);
      Todo.find({ event: eventId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name')
        .then(todos => {
          console.log(`Found ${todos.length} todos for event ${eventId}`);
          res.json(todos);
        })
        .catch(err => {
          console.error(`Error fetching todos for event ${eventId}:`, err.message);
          console.error(err.stack);
          res.status(500).json({ msg: 'Server Error', error: err.message });
        });
    })
    .catch(err => {
      console.error(`Error finding event ${eventId}:`, err.message);
      console.error(err.stack);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Event not found - invalid ID format' });
      }
      res.status(500).json({ msg: 'Server Error', error: err.message });
    });
});

// Update a todo
router.put('/:eventId/todos/:id', auth, (req, res) => {
  const { eventId, id } = req.params;
  const { text, completed } = req.body;

  // Find todo
  Todo.findById(id)
    .then(todo => {
      if (!todo) {
        return res.status(404).json({ msg: 'Todo not found' });
      }

      // Check if todo belongs to the specified event
      if (todo.event.toString() !== eventId) {
        return res.status(400).json({ msg: 'Todo does not belong to this event' });
      }

      // Get event to check permissions
      Event.findById(eventId)
        .then(event => {
          if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
          }

          // Check if user is authorized to update this todo
          if (
            !event.creator || event.creator.toString() !== req.user.id &&
            (!todo.createdBy || todo.createdBy.toString() !== req.user.id) &&
            !(Array.isArray(event.organizers) && event.organizers.some(org => org.user && org.user.toString() === req.user.id)) &&
            !(Array.isArray(event.participants) && event.participants.some(participant => participant.user && participant.user.toString() === req.user.id))
          ) {
            return res.status(401).json({ msg: 'Not authorized to update this todo' });
          }

          // Update todo
          const todoFields = {};
          if (text !== undefined) todoFields.text = text;
          if (completed !== undefined) todoFields.completed = completed;

          Todo.findByIdAndUpdate(
            id,
            { $set: todoFields },
            { new: true }
          )
            .populate('createdBy', 'name')
            .then(updatedTodo => res.json(updatedTodo))
            .catch(err => {
              console.error(err.message);
              res.status(500).send('Server Error');
            });
        })
        .catch(err => {
          console.error(err.message);
          res.status(500).send('Server Error');
        });
    })
    .catch(err => {
      console.error(err.message);
      res.status(500).send('Server Error');
    });
});

// Delete a todo
router.delete('/:eventId/todos/:id', auth, (req, res) => {
  const { eventId, id } = req.params;

  // Find todo
  Todo.findById(id)
    .then(todo => {
      if (!todo) {
        return res.status(404).json({ msg: 'Todo not found' });
      }

      // Check if todo belongs to the specified event
      if (todo.event.toString() !== eventId) {
        return res.status(400).json({ msg: 'Todo does not belong to this event' });
      }

      // Get event to check permissions
      Event.findById(eventId)
        .then(event => {
          if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
          }

          // Check if user is authorized to delete this todo
          if (
            !event.creator || event.creator.toString() !== req.user.id &&
            (!todo.createdBy || todo.createdBy.toString() !== req.user.id) &&
            !(Array.isArray(event.organizers) && event.organizers.some(org => org.user && org.user.toString() === req.user.id))
          ) {
            return res.status(401).json({ msg: 'Not authorized to delete this todo' });
          }

          Todo.findByIdAndRemove(id)
            .then(() => res.json({ msg: 'Todo removed' }))
            .catch(err => {
              console.error(err.message);
              res.status(500).send('Server Error');
            });
        })
        .catch(err => {
          console.error(err.message);
          res.status(500).send('Server Error');
        });
    })
    .catch(err => {
      console.error(err.message);
      res.status(500).send('Server Error');
    });
});

module.exports = router; 