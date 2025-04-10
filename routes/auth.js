/**
 * Authentication routes for stockInfo application
 */

const express = require('express');
const passport = require('passport');
const storage = require('../storage');
const { ensureAuthenticated } = require('../auth');
const router = express.Router();

/**
 * GET /login
 * Renders the login page
 */
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.sendFile('login.html', { root: './public' });
});

/**
 * GET /register
 * Renders the registration page
 */
router.get('/register', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.sendFile('register.html', { root: './public' });
});

/**
 * GET /auth/google
 * Initiates Google OAuth authentication
 */
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * GET /auth/google/callback
 * Google OAuth callback handler
 */
router.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login?error=google-auth-failed'
}), (req, res) => {
  // Successful authentication, redirect to dashboard
  res.redirect('/dashboard');
});

/**
 * POST /auth/login
 * Handles login form submission
 */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info.message || 'Authentication failed'
      });
    }

    req.logIn(user, async (err) => {
      if (err) {
        return next(err);
      }

      // Update last login timestamp
      try {
        await storage.updateUser(user.id, { last_login: new Date() });
      } catch (error) {
        console.error('Error updating last login:', error);
      }

      return res.json({
        success: true,
        user: req.user
      });
    });
  })(req, res, next);
});

/**
 * POST /auth/register
 * Handles user registration
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if username or email already exists
    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create new user
    const user = await storage.createUser({
      username,
      email,
      password, // Password is hashed in storage.js
      full_name: fullName, // Match the field name expected by storage.js
      role: 'user'
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Log in the new user
    req.logIn(userWithoutPassword, (err) => {
      if (err) {
        return next(err);
      }

      return res.json({
        success: true,
        user: userWithoutPassword
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
});

/**
 * GET /auth/logout
 * Logs out the current user
 */
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    // Return JSON success response instead of redirecting
    // This allows the frontend to handle redirection
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /auth/user
 * Returns the current authenticated user
 */
router.get('/user', ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

/**
 * PUT /auth/user
 * Updates the current user's profile
 */
router.put('/user', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, email, avatar, address, darkMode } = req.body;

    // Only allow updating certain fields
    const updateData = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (address !== undefined) updateData.address = address;
    if (darkMode !== undefined) updateData.dark_mode = !!darkMode;

    // Update user in database
    const updatedUser = await storage.updateUser(userId, updateData);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile'
    });
  }
});

module.exports = router;
