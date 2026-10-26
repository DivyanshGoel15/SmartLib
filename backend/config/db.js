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
      dbName: 'smartlib',
      serverSelectionTimeoutMS: 4000
    });

    isConnected = true;
    console.log(`[Database] MongoDB Atlas connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // If Atlas connection fails (e.g. IP whitelist / network restriction), attempt fallback to local MongoDB instance
    if (error.name === 'MongooseServerSelectionError') {
      console.warn('[Database Notice] Remote MongoDB Atlas connection timed out (IP whitelist / network restriction).');
      console.log('[Database] Attempting connection to local MongoDB instance (mongodb://127.0.0.1:27017/smartlib)...');

      try {
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/smartlib', {
          serverSelectionTimeoutMS: 2500
        });
        isConnected = true;
        console.log(`[Database] Successfully connected to local MongoDB instance on ${localConn.connection.host}:${localConn.connection.port}`);
        return localConn;
      } catch (localError) {
        console.error('[Database Error] Local MongoDB instance is also unavailable.');
      }
    }

    isConnected = false;
    if (error.name === 'MongooseServerSelectionError') {
      console.error('[Database Error] MongoDB Atlas Server Selection Error:');
      console.error(' -> Could not reach Atlas cluster servers. Most likely your current IP address is not whitelisted.');
      console.error(' -> Fix: Go to MongoDB Atlas (https://cloud.mongodb.com/) -> Network Access -> Add IP Address -> Select "Add Current IP Address".');
    } else {
      console.error('[Database Error] Failed to connect to database:', error.message);
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
