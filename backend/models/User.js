const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  passwordHash: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['email', 'phone'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
