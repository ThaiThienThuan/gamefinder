const mongoose = require('mongoose');

async function connectDatabase() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');
    await mongoose.connect(uri);
    console.log('✓ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    throw error;
  }
}

async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected');
  } catch (error) {
    console.error('✗ MongoDB disconnection failed:', error.message);
    throw error;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose
};
