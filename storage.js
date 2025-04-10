/**
 * Storage module for stockInfo application
 * Handles database operations for users, stocks, and other data
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, 'data', 'stockinfo.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Use the connection from db.js instead of creating a new one
const dbModule = require('./db');
const db = dbModule.getConnection();

// Define promisified database methods using the connection from db.js
const dbRun = async (sql, params) => dbModule.update(sql, params);
const dbGet = async (sql, params) => dbModule.getOne(sql, params);
const dbAll = async (sql, params) => dbModule.query(sql, params);

// User operations

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<object>} User object
 */
async function getUser(id) {
  return dbGet('SELECT * FROM users WHERE id = ?', [id]);
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<object>} User object
 */
async function getUserByUsername(username) {
  return dbGet('SELECT * FROM users WHERE username = ?', [username]);
}

/**
 * Get user by email
 * @param {string} email - Email address
 * @returns {Promise<object>} User object
 */
async function getUserByEmail(email) {
  return dbGet('SELECT * FROM users WHERE email = ?', [email]);
}

/**
 * Create a new user
 * @param {object} userData - User data
 * @returns {Promise<object>} Created user
 */
async function createUser(userData) {
  let passwordHash = null;
  if (userData.password) {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(userData.password, salt);
  }

  // Use insert function instead of dbRun (which uses update)
  const lastID = await dbModule.insert(
    `INSERT INTO users (username, password, email, full_name, role, avatar, address, dark_mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userData.username,
      passwordHash,
      userData.email,
      userData.full_name,
      userData.role || 'user',
      userData.avatar || null,
      userData.address || null,
      userData.dark_mode ? 1 : 0
    ]
  );

  // Now wait for and return the newly created user record.
  const newUser = await getUser(lastID);
  return newUser;
}

/**
 * Update user data
 * @param {number} id - User ID
 * @param {object} userData - Updated user data
 * @returns {Promise<object>} Updated user
 */
async function updateUser(id, userData) {
  const updateFields = [];
  const updateValues = [];

  // Only update fields that are provided
  if (userData.username !== undefined) {
    updateFields.push('username = ?');
    updateValues.push(userData.username);
  }

  if (userData.password) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);
    updateFields.push('password = ?');
    updateValues.push(passwordHash);
  }

  if (userData.email !== undefined) {
    updateFields.push('email = ?');
    updateValues.push(userData.email);
  }

  if (userData.full_name !== undefined) {
    updateFields.push('full_name = ?');
    updateValues.push(userData.full_name);
  }

  if (userData.avatar !== undefined) {
    updateFields.push('avatar = ?');
    updateValues.push(userData.avatar);
  }

  if (userData.address !== undefined) {
    updateFields.push('address = ?');
    updateValues.push(userData.address);
  }

  if (userData.dark_mode !== undefined) {
    updateFields.push('dark_mode = ?');
    updateValues.push(userData.dark_mode ? 1 : 0);
  }

  if (userData.google_id !== undefined) {
    updateFields.push('google_id = ?');
    updateValues.push(userData.google_id);
  }

  // If no update fields, return the current user
  if (updateFields.length === 0) {
    return getUser(id);
  }

  // Add user ID to update values
  updateValues.push(id);

  await dbRun(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  return getUser(id);
}

/**
 * Delete a user
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteUser(id) {
  await dbRun('DELETE FROM users WHERE id = ?', [id]);
  return true;
}

/**
 * Get all users
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllUsers() {
  return dbAll('SELECT id, username, email, full_name, role, avatar, address, dark_mode, created_at, last_login FROM users');
}

/**
 * Update user's last login timestamp
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success status
 */
async function updateLastLogin(id) {
  await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return true;
}

// Watchlist operations

/**
 * Get user's watchlist items
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Watchlist items
 */
async function getUserWatchlist(userId) {
  return dbAll('SELECT * FROM user_watchlist WHERE user_id = ?', [userId]);
}

/**
 * Add stock to user's watchlist
 * @param {number} userId - User ID
 * @param {string} symbol - Stock symbol
 * @returns {Promise<object>} Created watchlist item
 */
async function addToWatchlist(userId, symbol) {
  try {
    const result = await dbRun(
      'INSERT INTO user_watchlist (user_id, symbol) VALUES (?, ?)',
      [userId, symbol.toUpperCase()]
    );

    return {
      id: result.lastID,
      userId,
      symbol: symbol.toUpperCase(),
      createdAt: new Date()
    };
  } catch (error) {
    // Handle unique constraint violation
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Stock ${symbol} is already in your watchlist`);
    }
    throw error;
  }
}

/**
 * Remove stock from user's watchlist
 * @param {number} userId - User ID
 * @param {string} symbol - Stock symbol
 * @returns {Promise<boolean>} Success status
 */
async function removeFromWatchlist(userId, symbol) {
  await dbRun(
    'DELETE FROM user_watchlist WHERE user_id = ? AND symbol = ?',
    [userId, symbol.toUpperCase()]
  );
  return true;
}

/**
 * Check if a stock is in user's watchlist
 * @param {number} userId - User ID
 * @param {string} symbol - Stock symbol
 * @returns {Promise<boolean>} True if stock is in watchlist
 */
async function isInWatchlist(userId, symbol) {
  const item = await dbGet(
    'SELECT * FROM user_watchlist WHERE user_id = ? AND symbol = ?',
    [userId, symbol.toUpperCase()]
  );
  return !!item;
}

// Portfolio operations

/**
 * Get all portfolios for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} User portfolios
 */
async function getUserPortfolios(userId) {
  return dbAll('SELECT * FROM portfolio WHERE user_id = ?', [userId]);
}

/**
 * Get portfolio by ID
 * @param {number} id - Portfolio ID
 * @returns {Promise<object>} Portfolio
 */
async function getPortfolio(id) {
  return dbGet('SELECT * FROM portfolio WHERE id = ?', [id]);
}

/**
 * Create a new portfolio
 * @param {object} portfolioData - Portfolio data
 * @returns {Promise<object>} Created portfolio
 */
async function createPortfolio(portfolioData) {
  const result = await dbRun(
    'INSERT INTO portfolio (user_id, name, description) VALUES (?, ?, ?)',
    [portfolioData.user_id, portfolioData.name, portfolioData.description || null]
  );

  return getPortfolio(result.lastID);
}

/**
 * Update a portfolio
 * @param {number} id - Portfolio ID
 * @param {object} portfolioData - Updated portfolio data
 * @returns {Promise<object>} Updated portfolio
 */
async function updatePortfolio(id, portfolioData) {
  const updateFields = [];
  const updateValues = [];

  if (portfolioData.name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(portfolioData.name);
  }

  if (portfolioData.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(portfolioData.description);
  }

  // If no update fields, return the current portfolio
  if (updateFields.length === 0) {
    return getPortfolio(id);
  }

  // Add portfolio ID to update values
  updateValues.push(id);

  await dbRun(
    `UPDATE portfolio SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  return getPortfolio(id);
}

/**
 * Delete a portfolio
 * @param {number} id - Portfolio ID
 * @returns {Promise<boolean>} Success status
 */
async function deletePortfolio(id) {
  await dbRun('DELETE FROM portfolio WHERE id = ?', [id]);
  return true;
}

// Portfolio positions operations

/**
 * Get all positions for a portfolio
 * @param {number} portfolioId - Portfolio ID
 * @returns {Promise<Array>} Portfolio positions
 */
async function getPortfolioPositions(portfolioId) {
  return dbAll('SELECT * FROM portfolio_positions WHERE portfolio_id = ?', [portfolioId]);
}

/**
 * Get position by ID
 * @param {number} id - Position ID
 * @returns {Promise<object>} Portfolio position
 */
async function getPosition(id) {
  return dbGet('SELECT * FROM portfolio_positions WHERE id = ?', [id]);
}

/**
 * Add position to portfolio
 * @param {object} positionData - Position data
 * @returns {Promise<object>} Created position
 */
async function addPosition(positionData) {
  const result = await dbRun(
    `INSERT INTO portfolio_positions (
      portfolio_id, symbol, shares, purchase_price, purchase_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      positionData.portfolio_id,
      positionData.symbol.toUpperCase(),
      positionData.shares,
      positionData.purchase_price,
      positionData.purchase_date || new Date(),
      positionData.notes || null
    ]
  );

  return getPosition(result.lastID);
}

/**
 * Update a position
 * @param {number} id - Position ID
 * @param {object} positionData - Updated position data
 * @returns {Promise<object>} Updated position
 */
async function updatePosition(id, positionData) {
  const updateFields = [];
  const updateValues = [];

  if (positionData.shares !== undefined) {
    updateFields.push('shares = ?');
    updateValues.push(positionData.shares);
  }

  if (positionData.purchase_price !== undefined) {
    updateFields.push('purchase_price = ?');
    updateValues.push(positionData.purchase_price);
  }

  if (positionData.purchase_date !== undefined) {
    updateFields.push('purchase_date = ?');
    updateValues.push(positionData.purchase_date);
  }

  if (positionData.notes !== undefined) {
    updateFields.push('notes = ?');
    updateValues.push(positionData.notes);
  }

  // If no update fields, return the current position
  if (updateFields.length === 0) {
    return getPosition(id);
  }

  // Add position ID to update values
  updateValues.push(id);

  await dbRun(
    `UPDATE portfolio_positions SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  return getPosition(id);
}

/**
 * Delete a position
 * @param {number} id - Position ID
 * @returns {Promise<boolean>} Success status
 */
async function deletePosition(id) {
  await dbRun('DELETE FROM portfolio_positions WHERE id = ?', [id]);
  return true;
}

// API logging operations

/**
 * Log an API request
 * @param {object} logData - Log data
 * @returns {Promise<object>} Created log entry
 */
async function logApiRequest(logData) {
  const result = await dbRun(
    `INSERT INTO api_logs (
      user_id, endpoint, request_time, response_time, success, error_message
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      logData.userId || null,
      logData.endpoint,
      logData.requestTime || new Date(),
      logData.responseTime,
      logData.success ? 1 : 0,
      logData.errorMessage || null
    ]
  );

  return result.lastID;
}

/**
 * Get API logs, optionally filtered by user
 * @param {number} userId - Optional user ID filter
 * @param {number} limit - Maximum number of logs to return
 * @returns {Promise<Array>} API logs
 */
async function getApiLogs(userId = null, limit = 100) {
  if (userId) {
    return dbAll(
      'SELECT * FROM api_logs WHERE user_id = ? ORDER BY request_time DESC LIMIT ?',
      [userId, limit]
    );
  }

  return dbAll('SELECT * FROM api_logs ORDER BY request_time DESC LIMIT ?', [limit]);
}

// Admin operations - App settings

/**
 * Get all application settings
 * @returns {Promise<Array>} App settings
 */
async function getAppSettings() {
  return dbAll('SELECT * FROM app_settings');
}

/**
 * Get a specific application setting by key
 * @param {string} key - Setting key
 * @returns {Promise<object>} App setting
 */
async function getAppSettingByKey(key) {
  return dbGet('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
}

/**
 * Save an application setting
 * @param {object} settingData - Setting data
 * @returns {Promise<object>} Created/updated setting
 */
async function saveAppSetting(settingData) {
  // Check if setting exists
  const existing = await getAppSettingByKey(settingData.setting_key);

  if (existing) {
    // Update existing setting
    await dbRun(
      `UPDATE app_settings SET 
        setting_value = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = ?`,
      [
        settingData.setting_value,
        settingData.description || null,
        settingData.updated_by,
        settingData.setting_key
      ]
    );
  } else {
    // Create new setting
    await dbRun(
      `INSERT INTO app_settings (
        setting_key, setting_value, description, updated_by
      ) VALUES (?, ?, ?, ?)`,
      [
        settingData.setting_key,
        settingData.setting_value,
        settingData.description || null,
        settingData.updated_by
      ]
    );
  }

  return getAppSettingByKey(settingData.setting_key);
}

// Admin operations - Restricted stocks

/**
 * Get all restricted stocks
 * @returns {Promise<Array>} Restricted stocks
 */
async function getRestrictedStocks() {
  return dbAll('SELECT * FROM restricted_stocks');
}

/**
 * Add a restricted stock
 * @param {object} stockData - Stock data
 * @returns {Promise<object>} Created restricted stock
 */
async function addRestrictedStock(stockData) {
  const result = await dbRun(
    'INSERT INTO restricted_stocks (symbol, reason, added_by) VALUES (?, ?, ?)',
    [stockData.symbol.toUpperCase(), stockData.reason || null, stockData.added_by]
  );

  return {
    id: result.lastID,
    symbol: stockData.symbol.toUpperCase(),
    reason: stockData.reason,
    added_by: stockData.added_by,
    added_at: new Date()
  };
}

/**
 * Remove a restricted stock
 * @param {number} id - Restricted stock ID
 * @returns {Promise<boolean>} Success status
 */
async function removeRestrictedStock(id) {
  await dbRun('DELETE FROM restricted_stocks WHERE id = ?', [id]);
  return true;
}

// Admin operations - Featured stocks

/**
 * Get all featured stocks
 * @returns {Promise<Array>} Featured stocks
 */
async function getFeaturedStocks() {
  const now = new Date();
  return dbAll(
    'SELECT * FROM featured_stocks WHERE end_date IS NULL OR end_date > ?',
    [now]
  );
}

/**
 * Add a featured stock
 * @param {object} stockData - Stock data
 * @returns {Promise<object>} Created featured stock
 */
async function addFeaturedStock(stockData) {
  const result = await dbRun(
    `INSERT INTO featured_stocks (
      symbol, title, description, start_date, end_date, added_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      stockData.symbol.toUpperCase(),
      stockData.title,
      stockData.description || null,
      stockData.start_date || new Date(),
      stockData.end_date || null,
      stockData.added_by
    ]
  );

  return dbGet('SELECT * FROM featured_stocks WHERE id = ?', [result.lastID]);
}

/**
 * Update a featured stock
 * @param {number} id - Featured stock ID
 * @param {object} stockData - Updated stock data
 * @returns {Promise<object>} Updated featured stock
 */
async function updateFeaturedStock(id, stockData) {
  const updateFields = [];
  const updateValues = [];

  if (stockData.symbol !== undefined) {
    updateFields.push('symbol = ?');
    updateValues.push(stockData.symbol.toUpperCase());
  }

  if (stockData.title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(stockData.title);
  }

  if (stockData.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(stockData.description);
  }

  if (stockData.start_date !== undefined) {
    updateFields.push('start_date = ?');
    updateValues.push(stockData.start_date);
  }

  if (stockData.end_date !== undefined) {
    updateFields.push('end_date = ?');
    updateValues.push(stockData.end_date);
  }

  // If no update fields, return the current featured stock
  if (updateFields.length === 0) {
    return dbGet('SELECT * FROM featured_stocks WHERE id = ?', [id]);
  }

  // Add featured stock ID to update values
  updateValues.push(id);

  await dbRun(
    `UPDATE featured_stocks SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  return dbGet('SELECT * FROM featured_stocks WHERE id = ?', [id]);
}

/**
 * Remove a featured stock
 * @param {number} id - Featured stock ID
 * @returns {Promise<boolean>} Success status
 */
async function removeFeaturedStock(id) {
  await dbRun('DELETE FROM featured_stocks WHERE id = ?', [id]);
  return true;
}

/**
 * Get user by Google ID
 * @param {string} googleId - Google ID
 * @returns {Promise<object>} User object
 */
async function getUserByGoogleId(googleId) {
  return dbGet('SELECT * FROM users WHERE google_id = ?', [googleId]);
}

// Export all storage functions
module.exports = {
  // User operations
  getUser,
  getUserByUsername,
  getUserByEmail,
  getUserByGoogleId,
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  updateLastLogin,

  // Watchlist operations
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,

  // Portfolio operations
  getUserPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,

  // Portfolio positions operations
  getPortfolioPositions,
  getPosition,
  addPosition,
  updatePosition,
  deletePosition,

  // API logging operations
  logApiRequest,
  getApiLogs,

  // Admin operations - App settings
  getAppSettings,
  getAppSettingByKey,
  saveAppSetting,

  // Admin operations - Restricted stocks
  getRestrictedStocks,
  addRestrictedStock,
  removeRestrictedStock,

  // Admin operations - Featured stocks
  getFeaturedStocks,
  addFeaturedStock,
  updateFeaturedStock,
  removeFeaturedStock,

  // Database connection (for direct access if needed)
  db
};
