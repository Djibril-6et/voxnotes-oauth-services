const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  provider: { type: String, enum: ['email', 'github', 'google', 'discord'], default: 'email' },
  role: { type: String, enum: ['student', 'employee', 'disabled', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);