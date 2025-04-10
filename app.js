const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');

// Import custom modules
const { configurePassport, configureSession } = require('./auth');
const setupDatabase = require('./db-setup').setup;
const { getConnection } = require('./db');

// Initialize the app
const app = express();

// Load environment variables from .env file if present
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

// Setup middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configure session and passport
configureSession(app);
configurePassport(app);

// Database connection check middleware
app.use((req, res, next) => {
  // Skip for static files
  if (req.path.startsWith('/stylesheets') ||
    req.path.startsWith('/javascripts') ||
    req.path.startsWith('/images')) {
    return next();
  }

  const db = getConnection();
  if (!db) {
    console.error('Database connection not available');
    if (req.path.startsWith('/api')) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable'
      });
    }
    return next(createError(503, 'Database service unavailable'));
  }
  next();
});

// API request tracking
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();

    // Listen for response finish event to log API call duration
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
  }
  next();
});

// ===== ROUTES ORGANIZATION =====

// 1. Authentication routes - Don't require authentication for these routes
const authRouter = require('./routes/auth');

// Direct paths to login/register pages - must be BEFORE any authentication middleware
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Auth API endpoints
app.use('/auth', authRouter);

// 2. Web page routes - serve HTML pages
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
app.use('/', indexRouter);
app.use('/users', usersRouter);

// 3. API Routes - grouped under /api
// Stock data API
const stockApiRouter = require('./routes/stock-api');
app.use('/api/stocks', stockApiRouter);

// User data APIs
const watchlistRouter = require('./routes/watchlist');
const portfolioRouter = require('./routes/portfolio');
app.use('/api/watchlist', watchlistRouter);
app.use('/api/portfolios', portfolioRouter);

// Admin API - restricted access
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

// API-specific error handler (must be defined before the general error handler)
app.use('/api', function (err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    error: req.app.get('env') === 'development' ? {
      stack: err.stack,
      details: err.details || err
    } : { message: 'An error occurred' }
  };

  // Log server errors
  if (statusCode >= 500) {
    console.error(`API Error (${statusCode}):`, err);
  }

  res.status(statusCode).json(errorResponse);
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, 'Resource not found'));
});

// general error handler for web pages
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Set status code
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode);

  // Log server errors
  if (statusCode >= 500) {
    console.error(`Web Error (${statusCode}):`, err);
  }

  // Use JSON response for API requests and XHR
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.json({
      success: false,
      message: err.message || 'Internal Server Error',
      error: req.app.get('env') === 'development' ? err : {}
    });
  }

  // For HTML page requests, send the login page for authentication errors
  if (statusCode === 401 && !req.path.startsWith('/login')) {
    return res.redirect('/login');
  }

  // Use HTML for page requests - for now, send a basic HTML error page
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error - ${statusCode}</title>
        <link rel="stylesheet" href="/stylesheets/style.css">
      </head>
      <body>
        <div class="error-container">
          <h1>Error: ${statusCode}</h1>
          <p>${err.message || 'Something went wrong'}</p>
          <a href="/">Back to Home</a>
        </div>
      </body>
    </html>
  `);
});

// Initialize database on startup with proper error handling and retry logic
(async function initializeDatabase() {
  const MAX_RETRIES = 3;
  let retries = 0;
  let connected = false;

  while (!connected && retries < MAX_RETRIES) {
    try {
      await setupDatabase();
      console.log('✅ Database setup complete');
      connected = true;
    } catch (err) {
      retries++;
      console.error(`❌ Database setup attempt ${retries} failed:`, err.message);

      if (retries >= MAX_RETRIES) {
        console.error('Database initialization failed after multiple attempts. Exiting application.');
        process.exit(1);
      }

      // Wait 2 seconds before retry
      console.log(`Retrying database setup in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
})();

// Graceful shutdown to close database connections
process.on('SIGINT', () => {
  console.log('Application shutdown initiated...');

  try {
    const db = getConnection();
    if (db) {
      console.log('Closing database connection...');
      db.close();
    }
  } catch (err) {
    console.error('Error during shutdown:', err);
  }

  console.log('Application shutdown complete');
  process.exit(0);
});

module.exports = app;
