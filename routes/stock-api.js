/**
 * API routes for stock information
 * Handles fetching stock quotes, profiles, historical data and search
 */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../auth');
const fmpApi = require('../services/fmp-api');

// All routes require authentication
router.use(ensureAuthenticated);

/**
 * GET /api/stocks/quote/:symbol
 * Get stock quote by symbol
 */
router.get('/quote/:symbol', async (req, res, next) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const quote = await fmpApi.fetchStockQuote(symbol, req.user?.id);

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: `No quote data found for symbol: ${symbol}`
            });
        }

        res.json(quote);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stocks/profile/:symbol
 * Get company profile by symbol
 */
router.get('/profile/:symbol', async (req, res, next) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const profile = await fmpApi.fetchCompanyProfile(symbol, req.user?.id);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: `No company profile found for symbol: ${symbol}`
            });
        }

        res.json(profile);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stocks/historical/:symbol
 * Get historical price data for a stock
 */
router.get('/historical/:symbol', async (req, res, next) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const historicalData = await fmpApi.fetchHistoricalData(symbol, req.user?.id);

        if (!historicalData) {
            return res.status(404).json({
                success: false,
                message: `No historical data found for symbol: ${symbol}`
            });
        }

        res.json(historicalData);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stocks/search
 * Search for stocks by query
 */
router.get('/search', async (req, res, next) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }

        const results = await fmpApi.searchStocks(query, req.user?.id);
        res.json(results);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stocks/market-summary
 * Get market summary data (major indices)
 */
router.get('/market-summary', async (req, res, next) => {
    try {
        const marketSummary = await fmpApi.fetchMarketSummary(req.user?.id);
        res.json(marketSummary);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stocks/news
 * GET /api/stocks/news/:symbol
 * Get financial news, optionally filtered by symbol
 */
router.get('/news/:symbol?', async (req, res, next) => {
    try {
        const { symbol } = req.params;
        const news = await fmpApi.fetchFinancialNews(symbol, req.user?.id);

        res.json(news);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
