const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB, getDBStatus } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const userRoutes = require('./routes/userRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const seatRoutes = require('./routes/seatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - support localhost, deployed frontend, or any origin
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN === '*' || !process.env.CLIENT_ORIGIN
    ? true
    : process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path = require('path');
const fs = require('fs');

// Path to frontend assets: checks backend/public first, then parent directory ..
const publicDir = path.join(__dirname, 'public');
const parentDir = path.join(__dirname, '..');
const frontendDir = fs.existsSync(path.join(publicDir, 'landingpage')) ? publicDir : parentDir;

if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir, { index: false }));
}

// Root welcome endpoint
app.get('/', (req, res) => {
  const acceptHeader = req.headers.accept || '';
  const isBrowserHtmlRequest = acceptHeader.includes('text/html') && !acceptHeader.startsWith('*/*');
  const landingPagePath = path.join(frontendDir, 'landingpage', 'landingpage.html');

  if (isBrowserHtmlRequest && fs.existsSync(landingPagePath)) {
    return res.sendFile(landingPagePath);
  }

  res.status(200).json({
    message: 'SmartLib Backend API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      exams: '/api/exams',
      users: '/api/users',
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
        note: 'If disconnected, verify your current public IP is added to the MongoDB Atlas Network Access allowlist.'
      })
    }
  });
});

// Middleware to ensure DB connection before database-dependent operations
const requireDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is currently unavailable. Please verify that your current client IP address is whitelisted in MongoDB Atlas Network Access.'
    });
  }
  next();
};

// API Routes
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/exams', requireDB, examRoutes);
app.use('/api/users', requireDB, userRoutes);
app.use('/api/resources', requireDB, resourceRoutes);
app.use('/api/reservations', requireDB, reservationRoutes);
app.use('/api/seats', requireDB, seatRoutes);

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
    console.log(`[Server] Auth API at http://localhost:${PORT}/api/auth`);
    console.log(`[Server] Exams API at http://localhost:${PORT}/api/exams`);
    console.log(`[Server] Users API at http://localhost:${PORT}/api/users`);
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
