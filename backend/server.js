const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB, getDBStatus } = require('./config/db');
const resourceRoutes = require('./routes/resourceRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - support localhost, deployed frontend, or any origin
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN === '*' || !process.env.CLIENT_ORIGIN
    ? true
    : process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'SmartLib Backend API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      resources: '/api/resources',
      reservations: '/api/reservations'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      ...dbStatus,
      ...(dbStatus.connected ? { host: mongoose.connection.host } : {
        note: 'If disconnected, verify IP whitelist in MongoDB Atlas Network Access (add 0.0.0.0/0).'
      })
    }
  });
});

// Middleware to ensure DB connection before database-dependent operations
const requireDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is currently unavailable. Please verify that your current IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0).'
    });
  }
  next();
};

// API Routes
app.use('/api/resources', requireDB, resourceRoutes);
app.use('/api/reservations', requireDB, reservationRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Attempt database connection with background retry
const initDatabase = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.warn('[Server Warning] Initial MongoDB connection failed. Will retry periodically in background.');
    // Periodically retry connecting every 15 seconds if initial connection failed
    const retryInterval = setInterval(async () => {
      if (mongoose.connection.readyState === 1) {
        clearInterval(retryInterval);
        return;
      }
      try {
        await connectDB();
        console.log('[Server] MongoDB Atlas reconnected successfully!');
        clearInterval(retryInterval);
      } catch (err) {
        // Keep waiting for whitelist update
      }
    }, 15000);
  }
};

// Start Server
const startServer = async () => {
  // Start express server
  const server = app.listen(PORT, () => {
    console.log(`[Server] SmartLib Backend running on port ${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
    console.log(`[Server] Resources API at http://localhost:${PORT}/api/resources`);
    console.log(`[Server] Reservations API at http://localhost:${PORT}/api/reservations`);
  });

  // Connect to DB
  await initDatabase();

  return server;
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message);
});

// Only start when run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
