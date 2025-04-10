/**
 * Database setup for stockInfo
 * Creates SQLite database tables based on the WealthTracker schema
 */

const db = require('./db');
const util = require('util');

/**
 * Initialize the database with all tables based on WealthTracker schema
 */
async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');

    // Create tables one by one instead of using transaction
    // Begin transaction
    await db.update('BEGIN TRANSACTION');

    try {
      // Users table
      await db.update(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            avatar TEXT,
            address TEXT,
            dark_mode INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            google_id TEXT UNIQUE
        )
      `);

      // User watchlist items
      await db.update(`
        CREATE TABLE IF NOT EXISTS user_watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, symbol)
        )
      `);

      // Portfolio table
      await db.update(`
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Portfolio positions
      await db.update(`
        CREATE TABLE IF NOT EXISTS portfolio_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            portfolio_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            shares REAL NOT NULL,
            purchase_price REAL NOT NULL,
            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            FOREIGN KEY (portfolio_id) REFERENCES portfolio(id) ON DELETE CASCADE
        )
      `);

      // Stock screening criteria saved by users
      await db.update(`
        CREATE TABLE IF NOT EXISTS screening_criteria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            criteria TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Application settings for admin
      await db.update(`
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT NOT NULL UNIQUE,
            setting_value TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )
      `);

      // API usage logs
      await db.update(`
        CREATE TABLE IF NOT EXISTS api_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            endpoint TEXT NOT NULL,
            request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            response_time INTEGER,
            success INTEGER NOT NULL,
            error_message TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Restricted stocks
      await db.update(`
        CREATE TABLE IF NOT EXISTS restricted_stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL UNIQUE,
            reason TEXT,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            added_by INTEGER,
            FOREIGN KEY (added_by) REFERENCES users(id)
        )
      `);

      // Featured stocks
      await db.update(`
        CREATE TABLE IF NOT EXISTS featured_stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_date TIMESTAMP,
            added_by INTEGER,
            FOREIGN KEY (added_by) REFERENCES users(id)
        )
      `);

      // User achievements
      await db.update(`
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Commit transaction
      await db.update('COMMIT');
      console.log('Database schema initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing database schema:', error);
      await db.update('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in database initialization:', error);
    throw error;
  }
}

/**
 * Create initial admin user if no users exist in the database
 */
async function createAdminUserIfNeeded() {
  try {
    // Check if any users exist
    const userCount = await db.getOne("SELECT COUNT(*) as count FROM users");

    if (userCount.count === 0) {
      console.log('No users found. Creating admin user...');

      // Create admin user with properly hashed password
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await db.update(`
        INSERT INTO users (username, password, email, full_name, role)
        VALUES ('admin', ?, 'admin@stockinfo.com', 'Administrator', 'admin')
      `, [hashedPassword]);

      console.log('Admin user created successfully');
    } else {
      console.log(`${userCount.count} users already exist in the database`);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

/**
 * Initialize database and seed with initial data
 */
async function setup() {
  try {
    await initializeDatabase();
    await createAdminUserIfNeeded();
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setup();
}

module.exports = {
  initializeDatabase,
  createAdminUserIfNeeded,
  setup
};
