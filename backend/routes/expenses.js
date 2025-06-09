const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Event = require('../models/Event');
const User = require('../models/User');

// @route   POST api/expenses
// @desc    Create a new expense
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('event', 'Event is required').not().isEmpty(),
      check('title', 'Title is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('paidBy', 'Paid by user is required').not().isEmpty(),
      check('shares', 'Shares are required').isArray()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        event: eventId,
        title,
        amount,
        currency,
        category,
        paidBy,
        splitType,
        shares,
        date,
        notes,
        receipt
      } = req.body;

      // Check if event exists and user is a participant
      const event = await Event.findById(eventId);
      
      if (!event) {
        return res.status(404).json({ msg: 'Event not found' });
      }
      
      const isParticipant = 
        event.creator.toString() === req.user.id ||
        event.organizers.some(org => org.user.toString() === req.user.id) ||
        event.participants.some(part => part.user.toString() === req.user.id);
        
      if (!isParticipant) {
        return res.status(403).json({ msg: 'Not authorized to add expenses to this event' });
      }
      
      // Validate that all users in shares are participants
      const eventParticipantIds = [
        event.creator.toString(),
        ...event.organizers.map(org => org.user.toString()),
        ...event.participants.map(part => part.user.toString())
      ];
      
      const allShareUsers = shares.map(share => share.user.toString());
      const invalidUsers = allShareUsers.filter(userId => !eventParticipantIds.includes(userId));
      
      if (invalidUsers.length > 0) {
        return res.status(400).json({ 
          msg: 'Some users in shares are not participants of this event',
          invalidUsers
        });
      }

      // Create new expense
      const newExpense = new Expense({
        event: eventId,
        title,
        amount,
        currency: currency || 'USD',
        category: category || 'other',
        paidBy,
        splitType: splitType || 'equal',
        shares,
        date: date || Date.now(),
        notes,
        receipt
      });

      const expense = await newExpense.save();
      
      // Add expense to event
      await Event.findByIdAndUpdate(
        eventId,
        { $push: { expenses: expense._id } }
      );

      // Populate user details
      const populatedExpense = await Expense.findById(expense._id)
        .populate('paidBy', 'name avatar')
        .populate('shares.user', 'name avatar');

      res.json(populatedExpense);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/expenses/event/:eventId
// @desc    Get all expenses for an event
// @access  Private
router.get('/event/:eventId', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is authorized
    const isAuthorized = 
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id) ||
      event.participants.some(part => part.user.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to view expenses for this event' });
    }
    
    const expenses = await Expense.find({ event: req.params.eventId })
      .populate('paidBy', 'name avatar')
      .populate('shares.user', 'name avatar')
      .sort({ date: -1 });
      
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/expenses/:id
// @desc    Get expense by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name avatar')
      .populate('shares.user', 'name avatar')
      .populate('event', 'title');
      
    if (!expense) {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    
    // Get event details
    const event = await Event.findById(expense.event);
    
    // Check if user is authorized
    const isAuthorized = 
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id) ||
      event.participants.some(part => part.user.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to view this expense' });
    }
    
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    
    // Check if user is the one who paid or an event organizer
    const event = await Event.findById(expense.event);
    
    const isAuthorized = 
      expense.paidBy.toString() === req.user.id ||
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to update this expense' });
    }
    
    const {
      title,
      amount,
      currency,
      category,
      paidBy,
      splitType,
      shares,
      date,
      notes,
      receipt
    } = req.body;
    
    // Build expense object
    const expenseFields = {};
    if (title) expenseFields.title = title;
    if (amount) expenseFields.amount = amount;
    if (currency) expenseFields.currency = currency;
    if (category) expenseFields.category = category;
    if (paidBy) expenseFields.paidBy = paidBy;
    if (splitType) expenseFields.splitType = splitType;
    if (shares) expenseFields.shares = shares;
    if (date) expenseFields.date = date;
    if (notes !== undefined) expenseFields.notes = notes;
    if (receipt !== undefined) expenseFields.receipt = receipt;
    
    // Update expense
    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: expenseFields },
      { new: true }
    )
      .populate('paidBy', 'name avatar')
      .populate('shares.user', 'name avatar');
      
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/expenses/:id/settle
// @desc    Mark a share as paid/settled
// @access  Private
router.put('/:id/settle/:userId', auth, async (req, res) => {
  try {
    const { paid } = req.body;
    
    const expense = await Expense.findOneAndUpdate(
      { 
        _id: req.params.id, 
        'shares.user': req.params.userId 
      },
      { 
        $set: { 
          'shares.$.paid': paid !== undefined ? paid : true,
          'shares.$.paidDate': paid !== undefined && paid ? new Date() : null
        } 
      },
      { new: true }
    )
      .populate('paidBy', 'name avatar')
      .populate('shares.user', 'name avatar');
      
    if (!expense) {
      return res.status(404).json({ msg: 'Expense share not found' });
    }
    
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    
    // Check if user is authorized to delete
    const event = await Event.findById(expense.event);
    
    const isAuthorized = 
      expense.paidBy.toString() === req.user.id ||
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to delete this expense' });
    }
    
    // Remove expense from event
    await Event.findByIdAndUpdate(
      expense.event,
      { $pull: { expenses: expense._id } }
    );
    
    // Delete expense
    await expense.remove();
    
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Expense not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/expenses/summary/:eventId
// @desc    Get expense summary for an event
// @access  Private
router.get('/summary/:eventId', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is authorized
    const isAuthorized = 
      event.creator.toString() === req.user.id ||
      event.organizers.some(org => org.user.toString() === req.user.id) ||
      event.participants.some(part => part.user.toString() === req.user.id);
      
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to view expenses for this event' });
    }
    
    // Get all expenses for the event
    const expenses = await Expense.find({ event: req.params.eventId })
      .populate('paidBy', 'name avatar')
      .populate('shares.user', 'name avatar');
      
    // Calculate total amount
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate who paid what
    const userPayments = {};
    expenses.forEach(expense => {
      const payerId = expense.paidBy._id.toString();
      userPayments[payerId] = userPayments[payerId] || {
        user: {
          id: expense.paidBy._id,
          name: expense.paidBy.name,
          avatar: expense.paidBy.avatar
        },
        paid: 0,
        owed: 0
      };
      userPayments[payerId].paid += expense.amount;
    });
    
    // Calculate who owes what
    expenses.forEach(expense => {
      const shares = expense.calculateShares();
      
      shares.forEach(share => {
        const userId = share.user._id.toString();
        userPayments[userId] = userPayments[userId] || {
          user: {
            id: share.user._id,
            name: share.user.name,
            avatar: share.user.avatar
          },
          paid: 0,
          owed: 0
        };
        
        userPayments[userId].owed += share.calculatedAmount;
      });
    });
    
    // Calculate net balances
    const balances = Object.values(userPayments).map(payment => ({
      ...payment,
      balance: payment.paid - payment.owed
    }));
    
    // Simplify debts (who should pay whom)
    const debts = [];
    const debtors = balances.filter(b => b.balance < 0)
      .sort((a, b) => a.balance - b.balance);
      
    const creditors = balances.filter(b => b.balance > 0)
      .sort((a, b) => b.balance - a.balance);
      
    debtors.forEach(debtor => {
      let amountToPayBack = Math.abs(debtor.balance);
      
      for (let i = 0; i < creditors.length && amountToPayBack > 0; i++) {
        const creditor = creditors[i];
        
        if (creditor.balance <= 0) continue;
        
        const amount = Math.min(amountToPayBack, creditor.balance);
        
        if (amount > 0) {
          debts.push({
            from: debtor.user,
            to: creditor.user,
            amount: parseFloat(amount.toFixed(2))
          });
          
          amountToPayBack -= amount;
          creditors[i].balance -= amount;
        }
      }
    });
    
    res.json({
      eventId: req.params.eventId,
      totalAmount,
      userSummaries: balances,
      simplifiedDebts: debts
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 