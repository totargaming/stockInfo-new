/**
 * Authentication module for stockInfo application
 * Handles user login, registration, and session management
 */

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const storage = require('./storage');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file if present
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

/**
 * Configure passport for authentication
 * @param {object} app - Express application
 */
function configurePassport(app) {
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  // Configure local strategy for username/password login
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: 'Incorrect username' });
        }

        // Use bcrypt to verify password hash
        const bcrypt = require('bcryptjs');
        const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;

        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password' });
        }

        // Update last login timestamp
        await storage.updateLastLogin(user.id);

        // Don't send password to client
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Configure Google OAuth strategy if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await storage.getUserByGoogleId(profile.id);

        if (!user) {
          // Check if user exists with same email
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // Update existing user with Google ID
              user = await storage.updateUser(user.id, { google_id: profile.id });
            }
          }

          // If no user exists, create a new one
          if (!user) {
            // Create username from display name and ID
            const usernameBase = profile.displayName.replace(/\s+/g, '').toLowerCase();
            const username = `${usernameBase}_${profile.id.substring(0, 5)}`;

            // Create new user with Google profile data
            user = await storage.createUser({
              username: username,
              email: email || `${profile.id}@google.user`,
              full_name: profile.displayName,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
              google_id: profile.id,
              role: 'user'
            });
          }
        }

        // Update last login timestamp
        await storage.updateLastLogin(user.id);

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }
}

/**
 * Configure session management
 * @param {object} app - Express application
 */
function configureSession(app) {
  const session = require('express-session');
  const FileStore = require('session-file-store')(session);

  // Ensure sessions directory exists
  const sessionsDir = path.join(__dirname, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
  }

  // Configure session middleware
  app.use(session({
    store: new FileStore({
      path: sessionsDir,
      ttl: 86400, // 1 day in seconds
      retries: 0
    }),
    secret: process.env.SESSION_SECRET || 'stockinfo-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  }));
}

/**
 * Authentication middleware to ensure user is authenticated
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Determine if this is an API request or a page request
  if (req.xhr || req.path.startsWith('/api/') ||
    req.headers['content-type'] === 'application/json' ||
    req.headers['accept'] === 'application/json' ||
    req.headers['user-agent']?.includes('axios')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Redirect to login page for regular requests
  return res.redirect('/login');
}

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of allowed roles
 */
function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (roles.length === 0) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

module.exports = {
  configurePassport,
  configureSession,
  ensureAuthenticated,
  authorize
};
