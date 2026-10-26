const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables. Please check your .env file.';
    console.error(`[Database Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'test',
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout for quick feedback
    });

    isConnected = true;
    console.log(`[Database] MongoDB Atlas connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    isConnected = false;
    if (error.name === 'MongooseServerSelectionError') {
      console.error('[Database Error] MongoDB Atlas Server Selection Error:');
      console.error(' -> Could not reach Atlas cluster servers. Most likely your current IP address is not whitelisted.');
      console.error(' -> Fix: Go to MongoDB Atlas (https://cloud.mongodb.com/) -> Network Access -> Add IP Address -> Select "Add Current IP Address".');
    } else {
      console.error('[Database Error] Failed to connect to MongoDB Atlas:', error.message);
    }
    throw error;
  }
};

const getDBStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    connected: mongoose.connection.readyState === 1
  };
};

module.exports = {
  connectDB,
  getDBStatus
};
