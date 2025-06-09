const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  category: {
    type: String,
    enum: ['food', 'travel', 'lodging', 'tickets', 'other'],
    default: 'other'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'amount', 'shares'],
    default: 'equal'
  },
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    value: {
      type: Number, // Percentage, amount or number of shares depending on splitType
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: {
      type: Date
    }
  }],
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  receipt: {
    type: String // URL to receipt image
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
ExpenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate the amount each person owes
ExpenseSchema.methods.calculateShares = function() {
  const { amount, splitType, shares } = this;
  
  if (splitType === 'equal') {
    const shareAmount = amount / shares.length;
    
    return shares.map(share => ({
      ...share,
      calculatedAmount: shareAmount
    }));
  }
  
  if (splitType === 'percentage') {
    return shares.map(share => ({
      ...share,
      calculatedAmount: (amount * share.value) / 100
    }));
  }
  
  if (splitType === 'amount') {
    return shares.map(share => ({
      ...share,
      calculatedAmount: share.value
    }));
  }
  
  if (splitType === 'shares') {
    const totalShares = shares.reduce((sum, share) => sum + share.value, 0);
    const valuePerShare = amount / totalShares;
    
    return shares.map(share => ({
      ...share,
      calculatedAmount: share.value * valuePerShare
    }));
  }
  
  return shares;
};

module.exports = mongoose.model('Expense', ExpenseSchema); 