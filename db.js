/**
 * Database connection module for stockInfo
 * Provides SQLite connection and utility functions with connection state management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const util = require('util');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Database file path
const dbPath = path.join(dataDir, 'stockinfo.db');
let db = null;
let isConnected = false;

/**
 * Create and initialize the database connection
 */
function initConnection() {
    if (db) return db;

    try {
        // Create database connection with extended timeout and proper error logging
        db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Could not connect to database:', err.message);
                isConnected = false;
                return;
            }
            console.log('Connected to the SQLite database');
            isConnected = true;
        });

        // Promisify database operations for easier async/await usage
        db.runAsync = util.promisify(db.run.bind(db));
        db.getAsync = util.promisify(db.get.bind(db));
        db.allAsync = util.promisify(db.all.bind(db));
        db.execAsync = util.promisify(db.exec.bind(db));

        // Set pragmas for better performance and safety
        db.serialize(() => {
            db.run('PRAGMA foreign_keys = ON');
            db.run('PRAGMA journal_mode = WAL');
        });

        return db;
    } catch (err) {
        console.error('Error initializing database connection:', err);
        isConnected = false;
        return null;
    }
}

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query to execute
 * @param {Array|Object} params - Query parameters
 * @returns {Promise<any>} - Query result
 */
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const connection = getConnection();
        if (!connection) {
            reject(new Error('Database connection not available'));
            return;
        }

        connection.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Database query error:', err.message);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
};

/**
 * Get a single row from the database
 * @param {string} sql - SQL query
 * @param {Array|Object} params - Query parameters
 * @returns {Promise<any>} - Single row or null
 */
const getOne = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const connection = getConnection();
        if (!connection) {
            reject(new Error('Database connection not available'));
            return;
        }

        connection.get(sql, params, (err, row) => {
            if (err) {
                console.error('Database getOne error:', err.message);
                reject(err);
                return;
            }
            resolve(row);
        });
    });
};

/**
 * Insert data and return the last inserted ID
 * @param {string} sql - SQL insert statement
 * @param {Array|Object} params - Insert parameters
 * @returns {Promise<number>} - Last inserted ID
 */
const insert = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const connection = getConnection();
        if (!connection) {
            reject(new Error('Database connection not available'));
            return;
        }

        connection.run(sql, params, function (err) {
            if (err) {
                console.error('Database insert error:', err.message);
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
};

/**
 * Update data and return the number of changes
 * @param {string} sql - SQL update statement
 * @param {Array|Object} params - Update parameters
 * @returns {Promise<number>} - Number of changes
 */
const update = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const connection = getConnection();
        if (!connection) {
            reject(new Error('Database connection not available'));
            return;
        }

        connection.run(sql, params, function (err) {
            if (err) {
                console.error('Database update error:', err.message);
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
};

/**
 * Get the database connection
 * @returns {Object|null} - Database connection or null if not connected
 */
function getConnection() {
    if (!db || !isConnected) {
        return initConnection();
    }
    return db;
}

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
function closeConnection() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database connection:', err.message);
                    reject(err);
                    return;
                }
                console.log('Database connection closed');
                isConnected = false;
                db = null;
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Initialize connection on module load
initConnection();

module.exports = {
    query,
    getOne,
    insert,
    update,
    getConnection,
    closeConnection
};
