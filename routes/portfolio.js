/**
 * Portfolio routes for StockInfo application
 * Handles creating, updating, and retrieving user portfolios and positions
 */

const express = require('express');
const { ensureAuthenticated } = require('../auth');
const storage = require('../storage');
const router = express.Router();

// All portfolio routes require authentication
router.use(ensureAuthenticated);

/**
 * GET /api/portfolio
 * Get all portfolios for current user
 */
router.get('/', async (req, res) => {
    try {
        const portfolios = await storage.getUserPortfolios(req.user.id);
        res.json(portfolios);
    } catch (error) {
        console.error('Error fetching portfolios:', error);
        res.status(500).json({
            error: 'Failed to fetch portfolios',
            message: error.message
        });
    }
});

/**
 * GET /api/portfolio/:id
 * Get a specific portfolio by ID
 */
router.get('/:id', async (req, res) => {
    const portfolioId = parseInt(req.params.id);

    if (isNaN(portfolioId)) {
        return res.status(400).json({
            error: 'Invalid portfolio ID'
        });
    }

    try {
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        // Check if the portfolio belongs to the current user
        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Get positions for the portfolio
        const positions = await storage.getPortfolioPositions(portfolioId);

        res.json({
            ...portfolio,
            positions
        });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({
            error: 'Failed to fetch portfolio',
            message: error.message
        });
    }
});

/**
 * POST /api/portfolio
 * Create a new portfolio
 */
router.post('/', async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({
            error: 'Missing required field: name'
        });
    }

    try {
        const portfolio = await storage.createPortfolio({
            user_id: req.user.id,
            name,
            description
        });

        res.status(201).json(portfolio);
    } catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({
            error: 'Failed to create portfolio',
            message: error.message
        });
    }
});

/**
 * PUT /api/portfolio/:id
 * Update a portfolio
 */
router.put('/:id', async (req, res) => {
    const portfolioId = parseInt(req.params.id);
    const { name, description } = req.body;

    if (isNaN(portfolioId)) {
        return res.status(400).json({
            error: 'Invalid portfolio ID'
        });
    }

    try {
        // Check if portfolio exists and belongs to user
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Update the portfolio
        const updatedPortfolio = await storage.updatePortfolio(portfolioId, {
            name,
            description
        });

        res.json(updatedPortfolio);
    } catch (error) {
        console.error('Error updating portfolio:', error);
        res.status(500).json({
            error: 'Failed to update portfolio',
            message: error.message
        });
    }
});

/**
 * DELETE /api/portfolio/:id
 * Delete a portfolio
 */
router.delete('/:id', async (req, res) => {
    const portfolioId = parseInt(req.params.id);

    if (isNaN(portfolioId)) {
        return res.status(400).json({
            error: 'Invalid portfolio ID'
        });
    }

    try {
        // Check if portfolio exists and belongs to user
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Delete the portfolio
        await storage.deletePortfolio(portfolioId);

        res.json({
            success: true,
            message: 'Portfolio deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        res.status(500).json({
            error: 'Failed to delete portfolio',
            message: error.message
        });
    }
});

/**
 * GET /api/portfolio/:id/positions
 * Get all positions for a portfolio
 */
router.get('/:id/positions', async (req, res) => {
    const portfolioId = parseInt(req.params.id);

    if (isNaN(portfolioId)) {
        return res.status(400).json({
            error: 'Invalid portfolio ID'
        });
    }

    try {
        // Check if portfolio exists and belongs to user
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Get positions
        const positions = await storage.getPortfolioPositions(portfolioId);

        res.json(positions);
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({
            error: 'Failed to fetch positions',
            message: error.message
        });
    }
});

/**
 * POST /api/portfolio/:id/positions
 * Add a position to a portfolio
 */
router.post('/:id/positions', async (req, res) => {
    const portfolioId = parseInt(req.params.id);
    const { symbol, shares, purchase_price, purchase_date, notes } = req.body;

    if (isNaN(portfolioId) || !symbol || !shares || !purchase_price) {
        return res.status(400).json({
            error: 'Missing required fields: symbol, shares, purchase_price'
        });
    }

    try {
        // Check if portfolio exists and belongs to user
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Add position
        const position = await storage.addPosition({
            portfolio_id: portfolioId,
            symbol,
            shares,
            purchase_price,
            purchase_date,
            notes
        });

        res.status(201).json(position);
    } catch (error) {
        console.error('Error adding position:', error);
        res.status(500).json({
            error: 'Failed to add position',
            message: error.message
        });
    }
});

/**
 * PUT /api/portfolio/:portfolioId/positions/:id
 * Update a position
 */
router.put('/:portfolioId/positions/:id', async (req, res) => {
    const portfolioId = parseInt(req.params.portfolioId);
    const positionId = parseInt(req.params.id);
    const { shares, purchase_price, purchase_date, notes } = req.body;

    if (isNaN(portfolioId) || isNaN(positionId)) {
        return res.status(400).json({
            error: 'Invalid portfolio or position ID'
        });
    }

    try {
        // Check if portfolio exists and belongs to user
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Get position to check if it exists and belongs to the portfolio
        const position = await storage.getPosition(positionId);

        if (!position) {
            return res.status(404).json({
                error: 'Position not found'
            });
        }

        if (position.portfolio_id !== portfolioId) {
            return res.status(400).json({
                error: 'Position does not belong to this portfolio'
            });
        }

        // Update position
        const updatedPosition = await storage.updatePosition(positionId, {
            shares,
            purchase_price,
            purchase_date,
            notes
        });

        res.json(updatedPosition);
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({
            error: 'Failed to update position',
            message: error.message
        });
    }
});

/**
 * DELETE /api/portfolio/:portfolioId/positions/:id
 * Delete a position
 */
router.delete('/:portfolioId/positions/:id', async (req, res) => {
    const portfolioId = parseInt(req.params.portfolioId);
    const positionId = parseInt(req.params.id);

    if (isNaN(portfolioId) || isNaN(positionId)) {
        return res.status(400).json({
            error: 'Invalid portfolio or position ID'
        });
    }

    try {
        // Check if portfolio exists and belongs to user
        const portfolio = await storage.getPortfolio(portfolioId);

        if (!portfolio) {
            return res.status(404).json({
                error: 'Portfolio not found'
            });
        }

        if (portfolio.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Get position to check if it exists and belongs to the portfolio
        const position = await storage.getPosition(positionId);

        if (!position) {
            return res.status(404).json({
                error: 'Position not found'
            });
        }

        if (position.portfolio_id !== portfolioId) {
            return res.status(400).json({
                error: 'Position does not belong to this portfolio'
            });
        }

        // Delete position
        await storage.deletePosition(positionId);

        res.json({
            success: true,
            message: 'Position deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting position:', error);
        res.status(500).json({
            error: 'Failed to delete position',
            message: error.message
        });
    }
});

module.exports = router;
