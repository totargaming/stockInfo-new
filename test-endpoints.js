// test-endpoints.js
const axios = require('axios');
const colors = require('colors/safe');

const BASE_URL = 'http://localhost:3000'; // Change if your server runs on a different port
let authToken = null;

// Regular user credentials
const userCredentials = {
    username: 'user',
    password: 'admin123'
};

// Helper for making authenticated requests
const authRequest = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true // Don't throw on HTTP errors
});

// Update auth token for requests
authRequest.interceptors.request.use(config => {
    if (authToken) {
        config.headers.Cookie = authToken;
    }
    // Ensure all requests include JSON headers to be detected as API requests
    config.headers['Content-Type'] = 'application/json';
    config.headers['Accept'] = 'application/json';
    return config;
});

// Log formatting helpers
const logSuccess = msg => console.log(colors.green('✓ ' + msg));
const logError = msg => console.log(colors.red('✗ ' + msg));
const logInfo = msg => console.log(colors.blue('ℹ ' + msg));
const logSection = msg => console.log(colors.yellow('\n=== ' + msg + ' ==='));

async function runTests() {
    logSection('AUTHENTICATION TESTS');

    try {
        // 1. User Login
        logInfo('Testing user login...');
        const loginResponse = await authRequest.post('/auth/login', userCredentials);

        if (loginResponse.status === 200 && loginResponse.data.id) {
            logSuccess('Login successful');
            // Save the session cookie
            authToken = loginResponse.headers['set-cookie'][0];
        } else {
            logError(`Login failed: ${loginResponse.status} ${JSON.stringify(loginResponse.data)}`);
            // Try to create a test user if login failed
            await tryCreateTestUser();
        }

        // 2. Get Current User
        logInfo('Testing get current user...');
        const userResponse = await authRequest.get('/api/user');

        if (userResponse.status === 200 && userResponse.data.username) {
            logSuccess(`Got user: ${userResponse.data.username}`);
        } else {
            logError(`Failed to get user: ${userResponse.status} ${JSON.stringify(userResponse.data)}`);
        }

        // 3. Test Google Auth routes exist
        logInfo('Checking Google auth routes...');
        const googleAuthResponse = await authRequest.get('/auth/google', { maxRedirects: 0 });

        if (googleAuthResponse.status === 302) {
            logSuccess('Google auth route is working');
        } else {
            logError(`Google auth route failed: ${googleAuthResponse.status}`);
        }

        logSection('STOCK API TESTS');

        // 4. Test Quote API
        logInfo('Testing quote API...');
        const quoteResponse = await authRequest.get('/api/stocks/quote/AAPL');

        if (quoteResponse.status === 200 && quoteResponse.data.symbol) {
            logSuccess(`Got quote for ${quoteResponse.data.symbol} at $${quoteResponse.data.price}`);
        } else {
            logError(`Failed to get quote: ${quoteResponse.status} ${JSON.stringify(quoteResponse.data)}`);
        }

        // 5. Test Profile API
        logInfo('Testing profile API...');
        const profileResponse = await authRequest.get('/api/stocks/profile/MSFT');

        if (profileResponse.status === 200 && profileResponse.data.companyName) {
            logSuccess(`Got profile for ${profileResponse.data.companyName}`);
        } else {
            logError(`Failed to get profile: ${profileResponse.status} ${JSON.stringify(profileResponse.data)}`);
        }

        // 6. Test Historical Data API
        logInfo('Testing historical data API...');
        const historicalResponse = await authRequest.get('/api/stocks/historical/TSLA');

        if (historicalResponse.status === 200 && Array.isArray(historicalResponse.data.historical)) {
            logSuccess(`Got historical data with ${historicalResponse.data.historical.length} entries`);
        } else {
            logError(`Failed to get historical data: ${historicalResponse.status} ${JSON.stringify(historicalResponse.data)}`);
        }

        // 7. Test Search API
        logInfo('Testing search API...');
        const searchResponse = await authRequest.get('/api/stocks/search?query=apple');

        if (searchResponse.status === 200 && Array.isArray(searchResponse.data)) {
            logSuccess(`Search returned ${searchResponse.data.length} results`);
        } else {
            logError(`Failed to search: ${searchResponse.status} ${JSON.stringify(searchResponse.data)}`);
        }

        logSection('WATCHLIST TESTS');

        // 8. Test Get Watchlist
        logInfo('Testing get watchlist...');
        const watchlistResponse = await authRequest.get('/api/watchlist');

        if (watchlistResponse.status === 200 && Array.isArray(watchlistResponse.data)) {
            logSuccess(`Got watchlist with ${watchlistResponse.data.length} items`);
        } else {
            logError(`Failed to get watchlist: ${watchlistResponse.status} ${JSON.stringify(watchlistResponse.data)}`);
        }

        // 9. Test Add to Watchlist
        logInfo('Testing add to watchlist...');
        const addWatchlistResponse = await authRequest.post('/api/watchlist', { symbol: 'AMZN' });

        if (addWatchlistResponse.status === 201 ||
            (addWatchlistResponse.status === 409 && addWatchlistResponse.data.message.includes('already in watchlist'))) {
            logSuccess('Add to watchlist successful or already in watchlist');
        } else {
            logError(`Failed to add to watchlist: ${addWatchlistResponse.status} ${JSON.stringify(addWatchlistResponse.data)}`);
        }

        logSection('PORTFOLIO TESTS');

        // 10. Test Get Portfolios
        logInfo('Testing get portfolios...');
        const portfoliosResponse = await authRequest.get('/api/portfolios');

        if (portfoliosResponse.status === 200 && Array.isArray(portfoliosResponse.data)) {
            logSuccess(`Got ${portfoliosResponse.data.length} portfolios`);

            if (portfoliosResponse.data.length > 0) {
                const portfolioId = portfoliosResponse.data[0].id;

                // 11. Test Get Portfolio Details
                logInfo(`Testing get portfolio details for ID ${portfolioId}...`);
                const portfolioDetailsResponse = await authRequest.get(`/api/portfolios/${portfolioId}`);

                if (portfolioDetailsResponse.status === 200) {
                    logSuccess(`Got portfolio details with ${portfolioDetailsResponse.data.positions?.length || 0} positions`);
                } else {
                    logError(`Failed to get portfolio details: ${portfolioDetailsResponse.status} ${JSON.stringify(portfolioDetailsResponse.data)}`);
                }
            } else {
                // Create a test portfolio if none exist
                logInfo('No portfolios found, creating test portfolio...');
                const createPortfolioResponse = await authRequest.post('/api/portfolios', {
                    name: 'Test Portfolio',
                    description: 'Created by test script'
                });

                if (createPortfolioResponse.status === 201) {
                    logSuccess('Test portfolio created');
                } else {
                    logError(`Failed to create test portfolio: ${createPortfolioResponse.status} ${JSON.stringify(createPortfolioResponse.data)}`);
                }
            }
        } else {
            logError(`Failed to get portfolios: ${portfoliosResponse.status} ${JSON.stringify(portfoliosResponse.data)}`);
        }

        logSection('ADMIN TESTS');

        // 12. Test Admin API Access
        logInfo('Testing admin API access (may fail for regular users)...');
        const adminUsersResponse = await authRequest.get('/api/admin/users');

        if (adminUsersResponse.status === 200) {
            logSuccess('Admin API access successful');
        } else {
            logInfo(`Admin API denied as expected for non-admin user: ${adminUsersResponse.status}`);
        }

        logSection('TEST SUMMARY');
        console.log('All tests completed.');

    } catch (error) {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
    }
}

async function tryCreateTestUser() {
    logInfo('Attempting to create test user...');
    try {
        const registerResponse = await authRequest.post('/auth/register', {
            username: userCredentials.username,
            password: userCredentials.password,
            email: 'test@example.com',
            fullName: 'Test User' // Changed from full_name to fullName to match server expectation
        }, {
            headers: { // Moved headers out of request body into proper axios headers parameter
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (registerResponse.status === 201) {
            logSuccess('Test user created');
            authToken = registerResponse.headers['set-cookie'][0];
            return true;
        } else {
            logError(`Failed to create test user: ${registerResponse.status} ${JSON.stringify(registerResponse.data)}`);
            return false;
        }
    } catch (error) {
        logError(`Error creating test user: ${error.message}`);
        return false;
    }
}

// Run the tests
runTests().then(() => {
    console.log('Test script completed');
});