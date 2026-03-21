const mongoose = require('mongoose');
const setting = require('../../Config/Setting.json');

async function connectDatabase() {
  try {
    await mongoose.connect(setting.mongo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
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
