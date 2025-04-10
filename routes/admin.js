/**
 * Admin routes for StockInfo application
 * Handles admin-only operations such as user management and app settings
 */

const express = require('express');
const storage = require('../storage');
const router = express.Router();

// Middleware to ensure user is an admin
const ensureAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
    }

    next();
};

// All admin routes require admin privileges
router.use(ensureAdmin);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            message: error.message
        });
    }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', async (req, res) => {
    const { username, password, email, full_name, role, avatar, address, dark_mode } = req.body;

    if (!username || !password || !email || !full_name) {
        return res.status(400).json({
            error: 'Missing required fields: username, password, email, full_name'
        });
    }

    try {
        const user = await storage.createUser({
            username,
            password,
            email,
            full_name,
            role,
            avatar,
            address,
            dark_mode
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            error: 'Failed to create user',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/users/:id
 * Get a specific user
 */
router.get('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
        return res.status(400).json({
            error: 'Invalid user ID'
        });
    }

    try {
        const user = await storage.getUser(userId);

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            error: 'Failed to fetch user',
            message: error.message
        });
    }
});

/**
 * PUT /api/admin/users/:id
 * Update a user
 */
router.put('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, password, email, full_name, role, avatar, address, dark_mode } = req.body;

    if (isNaN(userId)) {
        return res.status(400).json({
            error: 'Invalid user ID'
        });
    }

    try {
        const user = await storage.updateUser(userId, {
            username,
            password,
            email,
            full_name,
            role,
            avatar,
            address,
            dark_mode
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            error: 'Failed to update user',
            message: error.message
        });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
        return res.status(400).json({
            error: 'Invalid user ID'
        });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
        return res.status(400).json({
            error: 'Cannot delete your own account'
        });
    }

    try {
        await storage.deleteUser(userId);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/settings
 * Get all application settings
 */
router.get('/settings', async (req, res) => {
    try {
        const settings = await storage.getAppSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            error: 'Failed to fetch settings',
            message: error.message
        });
    }
});

/**
 * POST /api/admin/settings
 * Create or update an application setting
 */
router.post('/settings', async (req, res) => {
    const { setting_key, setting_value, description } = req.body;

    if (!setting_key || setting_value === undefined) {
        return res.status(400).json({
            error: 'Missing required fields: setting_key, setting_value'
        });
    }

    try {
        const setting = await storage.saveAppSetting({
            setting_key,
            setting_value,
            description,
            updated_by: req.user.id
        });

        res.json(setting);
    } catch (error) {
        console.error('Error saving setting:', error);
        res.status(500).json({
            error: 'Failed to save setting',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/restricted-stocks
 * Get all restricted stocks
 */
router.get('/restricted-stocks', async (req, res) => {
    try {
        const restrictedStocks = await storage.getRestrictedStocks();
        res.json(restrictedStocks);
    } catch (error) {
        console.error('Error fetching restricted stocks:', error);
        res.status(500).json({
            error: 'Failed to fetch restricted stocks',
            message: error.message
        });
    }
});

/**
 * POST /api/admin/restricted-stocks
 * Add a restricted stock
 */
router.post('/restricted-stocks', async (req, res) => {
    const { symbol, reason } = req.body;

    if (!symbol) {
        return res.status(400).json({
            error: 'Missing required field: symbol'
        });
    }

    try {
        const restrictedStock = await storage.addRestrictedStock({
            symbol,
            reason,
            added_by: req.user.id
        });

        res.status(201).json(restrictedStock);
    } catch (error) {
        console.error('Error adding restricted stock:', error);
        res.status(500).json({
            error: 'Failed to add restricted stock',
            message: error.message
        });
    }
});

/**
 * DELETE /api/admin/restricted-stocks/:id
 * Remove a restricted stock
 */
router.delete('/restricted-stocks/:id', async (req, res) => {
    const restrictedStockId = parseInt(req.params.id);

    if (isNaN(restrictedStockId)) {
        return res.status(400).json({
            error: 'Invalid restricted stock ID'
        });
    }

    try {
        await storage.removeRestrictedStock(restrictedStockId);

        res.json({
            success: true,
            message: 'Restricted stock removed successfully'
        });
    } catch (error) {
        console.error('Error removing restricted stock:', error);
        res.status(500).json({
            error: 'Failed to remove restricted stock',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/featured-stocks
 * Get all featured stocks
 */
router.get('/featured-stocks', async (req, res) => {
    try {
        const featuredStocks = await storage.getFeaturedStocks();
        res.json(featuredStocks);
    } catch (error) {
        console.error('Error fetching featured stocks:', error);
        res.status(500).json({
            error: 'Failed to fetch featured stocks',
            message: error.message
        });
    }
});

/**
 * POST /api/admin/featured-stocks
 * Add a featured stock
 */
router.post('/featured-stocks', async (req, res) => {
    const { symbol, title, description, start_date, end_date } = req.body;

    if (!symbol || !title) {
        return res.status(400).json({
            error: 'Missing required fields: symbol, title'
        });
    }

    try {
        const featuredStock = await storage.addFeaturedStock({
            symbol,
            title,
            description,
            start_date,
            end_date,
            added_by: req.user.id
        });

        res.status(201).json(featuredStock);
    } catch (error) {
        console.error('Error adding featured stock:', error);
        res.status(500).json({
            error: 'Failed to add featured stock',
            message: error.message
        });
    }
});

/**
 * PUT /api/admin/featured-stocks/:id
 * Update a featured stock
 */
router.put('/featured-stocks/:id', async (req, res) => {
    const featuredStockId = parseInt(req.params.id);
    const { symbol, title, description, start_date, end_date } = req.body;

    if (isNaN(featuredStockId)) {
        return res.status(400).json({
            error: 'Invalid featured stock ID'
        });
    }

    try {
        const featuredStock = await storage.updateFeaturedStock(featuredStockId, {
            symbol,
            title,
            description,
            start_date,
            end_date
        });

        res.json(featuredStock);
    } catch (error) {
        console.error('Error updating featured stock:', error);
        res.status(500).json({
            error: 'Failed to update featured stock',
            message: error.message
        });
    }
});

/**
 * DELETE /api/admin/featured-stocks/:id
 * Remove a featured stock
 */
router.delete('/featured-stocks/:id', async (req, res) => {
    const featuredStockId = parseInt(req.params.id);

    if (isNaN(featuredStockId)) {
        return res.status(400).json({
            error: 'Invalid featured stock ID'
        });
    }

    try {
        await storage.removeFeaturedStock(featuredStockId);

        res.json({
            success: true,
            message: 'Featured stock removed successfully'
        });
    } catch (error) {
        console.error('Error removing featured stock:', error);
        res.status(500).json({
            error: 'Failed to remove featured stock',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/logs
 * Get API usage logs
 */
router.get('/logs', async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    try {
        const logs = await storage.getApiLogs(userId, limit);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            error: 'Failed to fetch logs',
            message: error.message
        });
    }
});

module.exports = router;
