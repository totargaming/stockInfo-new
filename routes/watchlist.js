/**
 * Watchlist routes for stockInfo application
 * Provides API endpoints for managing user watchlists
 */

const express = require('express');
const storage = require('../storage');
const { ensureAuthenticated } = require('../auth');
const fmpApi = require('../services/fmp-api');
const router = express.Router();

// All watchlist routes require authentication
router.use(ensureAuthenticated);

/**
 * GET /api/watchlist/items
 * Get the current user's watchlist items
 */
router.get('/items', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const watchlist = await storage.getUserWatchlist(userId);

        // Get stock data for each item in watchlist
        const watchlistWithDetails = await Promise.all(
            watchlist.map(async (item) => {
                try {
                    // Get current stock data
                    const stockData = await fmpApi.fetchStockQuote(item.symbol, userId);

                    return {
                        id: item.id,
                        symbol: item.symbol,
                        createdAt: item.created_at,
                        price: stockData?.price || null,
                        name: stockData?.name || null,
                        change: stockData?.changesPercentage || null
                    };
                } catch (error) {
                    // If API fails for a specific stock, return basic info
                    console.error(`Error fetching data for ${item.symbol}:`, error);
                    return {
                        id: item.id,
                        symbol: item.symbol,
                        createdAt: item.created_at
                    };
                }
            })
        );

        res.json(watchlistWithDetails);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/watchlist/items
 * Add a stock to the user's watchlist
 */
router.post('/items', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: 'Stock symbol is required'
            });
        }

        // Check if the stock exists by fetching its data
        try {
            const stockData = await fmpApi.fetchStockQuote(symbol, userId);

            if (!stockData) {
                return res.status(404).json({
                    success: false,
                    message: `Invalid stock symbol: ${symbol}`
                });
            }

            // Check if stock is in restricted list
            const restrictedStocks = await storage.getRestrictedStocks();
            const isRestricted = restrictedStocks.some(
                stock => stock.symbol.toUpperCase() === symbol.toUpperCase()
            );

            if (isRestricted) {
                return res.status(403).json({
                    success: false,
                    message: `Stock ${symbol} is restricted and cannot be added to watchlists.`
                });
            }

            // Add to watchlist
            const item = await storage.addToWatchlist(userId, symbol);

            // Add stock details to the response
            const response = {
                id: item.id,
                symbol: item.symbol,
                createdAt: item.createdAt,
                price: stockData.price,
                name: stockData.name,
                change: stockData.changesPercentage
            };

            res.status(201).json(response);
        } catch (error) {
            // Handle rate limit errors specially
            if (error.message.includes('API rate limit')) {
                return res.status(429).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: `Error adding stock to watchlist: ${error.message}`
            });
        }
    } catch (error) {
        // Handle unique constraint violations
        if (error.message.includes('already in your watchlist')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
});

/**
 * DELETE /api/watchlist/items/:symbol
 * Remove a stock from the user's watchlist
 */
router.delete('/items/:symbol', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        await storage.removeFromWatchlist(userId, symbol);

        res.json({
            success: true,
            message: `${symbol} removed from watchlist`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/watchlist/check/:symbol
 * Check if a stock is in the user's watchlist
 */
router.get('/check/:symbol', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        const isInWatchlist = await storage.isInWatchlist(userId, symbol);

        res.json({
            symbol,
            isInWatchlist
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
