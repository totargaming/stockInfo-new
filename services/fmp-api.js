/**
 * Financial Modeling Prep API Service
 * Handles all external API calls to the Financial Modeling Prep API
 */

const axios = require('axios');
const storage = require('../storage');

// Financial Modeling Prep API configuration
const FMP_API_KEY = process.env.FMP_API_KEY || 'demo'; // Default to demo key if not provided
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Create an axios instance for FMP API requests
const fmpClient = axios.create({
    baseURL: FMP_BASE_URL,
    params: {
        apikey: FMP_API_KEY
    }
});

/**
 * Log API requests to the database
 * @param {number|null} userId - User ID or null for unauthenticated requests
 * @param {string} endpoint - API endpoint
 * @param {boolean} success - Whether the request was successful
 * @param {number} responseTime - Response time in milliseconds
 * @param {string|null} errorMessage - Error message if request failed
 */
async function logApiRequest(userId, endpoint, success, responseTime, errorMessage = null) {
    try {
        await storage.logApiRequest({
            userId,
            endpoint,
            requestTime: new Date(),
            responseTime,
            success: success ? 1 : 0, // SQLite uses integers for booleans
            errorMessage
        });
    } catch (error) {
        console.error('Failed to log API request:', error);
    }
}

/**
 * Get a stock quote by symbol
 * @param {string} symbol - Stock symbol
 * @param {number|null} userId - User ID for logging
 * @returns {Promise<Object>} - Stock quote data
 */
async function fetchStockQuote(symbol, userId = null) {
    if (!symbol) return null;

    const startTime = Date.now();

    try {
        const response = await fmpClient.get(`/quote/${symbol}`);

        const responseTime = Date.now() - startTime;
        await logApiRequest(userId, `/api/stocks/quote/${symbol}`, true, responseTime);

        return response.data[0] || null;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.error || error.message;
        await logApiRequest(userId, `/api/stocks/quote/${symbol}`, false, responseTime, errorMessage);

        // Handle rate limit errors specially
        if (error.response?.status === 429 || errorMessage?.includes('Limit Reach')) {
            throw new Error('API rate limit reached. Please try again later.');
        }

        throw new Error(`Error fetching stock quote: ${errorMessage}`);
    }
}

/**
 * Get company profile by symbol
 * @param {string} symbol - Stock symbol
 * @param {number|null} userId - User ID for logging
 * @returns {Promise<Object>} - Company profile data
 */
async function fetchCompanyProfile(symbol, userId = null) {
    if (!symbol) return null;

    const startTime = Date.now();

    try {
        const response = await fmpClient.get(`/profile/${symbol}`);

        const responseTime = Date.now() - startTime;
        await logApiRequest(userId, `/api/stocks/profile/${symbol}`, true, responseTime);

        return response.data[0] || null;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.error || error.message;
        await logApiRequest(userId, `/api/stocks/profile/${symbol}`, false, responseTime, errorMessage);

        if (error.response?.status === 429 || errorMessage?.includes('Limit Reach')) {
            throw new Error('API rate limit reached. Please try again later.');
        }

        throw new Error(`Error fetching company profile: ${errorMessage}`);
    }
}

/**
 * Get historical price data for a stock
 * @param {string} symbol - Stock symbol
 * @param {number|null} userId - User ID for logging
 * @returns {Promise<Object>} - Historical price data
 */
async function fetchHistoricalData(symbol, userId = null) {
    if (!symbol) return null;

    const startTime = Date.now();

    try {
        const response = await fmpClient.get(`/historical-price-full/${symbol}?serietype=line`);

        const responseTime = Date.now() - startTime;
        await logApiRequest(userId, `/api/stocks/historical/${symbol}`, true, responseTime);

        return response.data || null;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.error || error.message;
        await logApiRequest(userId, `/api/stocks/historical/${symbol}`, false, responseTime, errorMessage);

        if (error.response?.status === 429 || errorMessage?.includes('Limit Reach')) {
            throw new Error('API rate limit reached. Please try again later.');
        }

        throw new Error(`Error fetching historical data: ${errorMessage}`);
    }
}

/**
 * Search for stocks by query
 * @param {string} query - Search query
 * @param {number|null} userId - User ID for logging
 * @returns {Promise<Array>} - Search results
 */
async function searchStocks(query, userId = null) {
    if (!query || query.length < 2) return [];

    const startTime = Date.now();

    try {
        const response = await fmpClient.get(`/search?query=${encodeURIComponent(query)}&limit=10`);

        const responseTime = Date.now() - startTime;
        await logApiRequest(userId, `/api/stocks/search?query=${query}`, true, responseTime);

        return response.data || [];
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.error || error.message;
        await logApiRequest(userId, `/api/stocks/search?query=${query}`, false, responseTime, errorMessage);

        if (error.response?.status === 429 || errorMessage?.includes('Limit Reach')) {
            throw new Error('API rate limit reached. Please try again later.');
        }

        throw new Error(`Error searching stocks: ${errorMessage}`);
    }
}

/**
 * Get market summary data (major indices)
 * @param {number|null} userId - User ID for logging
 * @returns {Promise<Array>} - Market summary data
 */
async function fetchMarketSummary(userId = null) {
    const startTime = Date.now();

    try {
        const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX'];
        const response = await fmpClient.get(`/quote/${indices.join(',')}`);

        const responseTime = Date.now() - startTime;
        await logApiRequest(userId, '/api/stocks/market-summary', true, responseTime);

        return response.data || [];
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.error || error.message;
        await logApiRequest(userId, '/api/stocks/market-summary', false, responseTime, errorMessage);

        if (error.response?.status === 429 || errorMessage?.includes('Limit Reach')) {
            throw new Error('API rate limit reached. Please try again later.');
        }

        throw new Error(`Error fetching market summary: ${errorMessage}`);
    }
}

/**
 * Get financial news
 * @param {string|null} symbol - Optional stock symbol to filter news
 * @param {number|null} userId - User ID for logging
 * @returns {Promise<Array>} - Financial news data
 */
async function fetchFinancialNews(symbol = null, userId = null) {
    const startTime = Date.now();

    try {
        let endpoint = '/stock_news?limit=20';
        if (symbol) {
            endpoint = `/stock_news?tickers=${symbol.toUpperCase()}&limit=10`;
        }

        const response = await fmpClient.get(endpoint);

        const responseTime = Date.now() - startTime;
        await logApiRequest(userId, `/api/news${symbol ? `?symbol=${symbol}` : ''}`, true, responseTime);

        return response.data || [];
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.error || error.message;
        await logApiRequest(userId, `/api/news${symbol ? `?symbol=${symbol}` : ''}`, false, responseTime, errorMessage);

        if (error.response?.status === 429 || errorMessage?.includes('Limit Reach')) {
            throw new Error('API rate limit reached. Please try again later.');
        }

        throw new Error(`Error fetching financial news: ${errorMessage}`);
    }
}

module.exports = {
    fetchStockQuote,
    fetchCompanyProfile,
    fetchHistoricalData,
    searchStocks,
    fetchMarketSummary,
    fetchFinancialNews
};
