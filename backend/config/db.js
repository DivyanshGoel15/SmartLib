const mongoose = require('mongoose');

const parseMongoUri = (uri, variableName) => {
  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch (error) {
    throw new Error(`${variableName} must be a valid MongoDB connection URI.`);
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol) ||
      !parsedUri.hostname ||
      parsedUri.hash) {
    throw new Error(`${variableName} must be a valid MongoDB connection URI.`);
  }

  let databaseName;
  try {
    const path = parsedUri.pathname.replace(/^\/+|\/+$/g, '');
    if (path.includes('/')) {
      throw new Error('Invalid database path.');
    }
    databaseName = decodeURIComponent(path);
  } catch (error) {
    throw new Error(`${variableName} must contain a valid database name.`);
  }
  return databaseName;
};

const getDatabaseConfig = () => {
  if (process.env.NODE_ENV === 'test') {
    const uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
      throw new Error('TEST_MONGODB_URI must be explicitly configured for database-writing tests.');
    }

    const databaseName = parseMongoUri(uri, 'TEST_MONGODB_URI');
    if (databaseName !== 'smartlib_test') {
      throw new Error('TEST_MONGODB_URI must target the isolated smartlib_test database.');
    }

    return { uri, dbName: 'smartlib_test' };
  }

  const primaryUri = process.env.MONGODB_URI;
  const alternateUri = process.env.MONGO_URI;
  if (primaryUri && alternateUri && primaryUri !== alternateUri) {
    throw new Error('MONGODB_URI and MONGO_URI disagree; configure only one database URI.');
  }
  const uri = primaryUri || alternateUri;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables. Please check your .env file.');
  }
  const uriDatabaseName = parseMongoUri(uri, primaryUri ? 'MONGODB_URI' : 'MONGO_URI');
  if (uriDatabaseName && uriDatabaseName !== 'smartlib') {
    throw new Error('The configured MongoDB URI must target the smartlib database.');
  }
  return { uri, dbName: 'smartlib' };
};

const validateExplicitDatabaseConfig = databaseConfig => {
  if (!databaseConfig || typeof databaseConfig.uri !== 'string' || !databaseConfig.uri.trim()) {
    throw new Error('An explicit database configuration must include a valid MongoDB URI.');
  }

  const uriDatabaseName = parseMongoUri(
    databaseConfig.uri,
    'The explicit database configuration'
  );

  const expectedDatabaseName = process.env.NODE_ENV === 'test' ? 'smartlib_test' : 'smartlib';
  if (databaseConfig.dbName !== expectedDatabaseName || uriDatabaseName !== databaseConfig.dbName) {
    throw new Error(`The explicit database configuration must target ${expectedDatabaseName}.`);
  }
};

const connectDB = async ({ databaseConfig, logErrors = true } = {}) => {
  try {
    const config = databaseConfig || getDatabaseConfig();
    if (databaseConfig) validateExplicitDatabaseConfig(databaseConfig);

    const { uri, dbName } = config;
    const conn = await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 4000
    });

    console.log('[Database] MongoDB connected successfully.');
    return conn;
  } catch (error) {
    if (logErrors) {
      if (error.name === 'MongooseServerSelectionError') {
        console.error('[Database Error] MongoDB Atlas Server Selection Error:');
        console.error(' -> Could not reach Atlas cluster servers. Most likely your current IP address is not whitelisted.');
        console.error(' -> Fix: Go to MongoDB Atlas (https://cloud.mongodb.com/) -> Network Access -> Add IP Address -> Select "Add Current IP Address".');
      } else {
        console.error('[Database Error] Failed to connect to database:', error.name || 'Error');
      }
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
