// Main Vue application file
const { createApp } = Vue;

// Create the main Vue application
const app = createApp({
  data() {
    return {
      stocks: [],
      featuredStocks: [],
      selectedStock: null,
      stockHistory: null,
      stockProfile: null,
      watchlist: [],
      isInWatchlist: false,
      loading: {
        stocks: false,
        stockDetails: false,
        watchlist: false
      },
      error: null,
      user: null,
      marketSummary: []
    };
  },
  methods: {
    async fetchStocks() {
      this.loading.stocks = true;
      try {
        const response = await axios.get('/api/stocks/market');
        this.stocks = response.data;

        // Also fetch featured stocks if available
        try {
          const featuredResponse = await axios.get('/api/stocks/featured');
          this.featuredStocks = featuredResponse.data;
        } catch (featuredErr) {
          console.warn('Featured stocks not available:', featuredErr);
        }
      } catch (err) {
        this.error = 'Error loading stocks. Please try again.';
        console.error('Error fetching stocks:', err);
      } finally {
        this.loading.stocks = false;
      }
    },

    async fetchUserData() {
      try {
        const response = await axios.get('/api/user/profile');
        this.user = response.data;

        // Get user's watchlist
        await this.fetchWatchlist();
      } catch (err) {
        console.log('User not authenticated or profile not available');
      }
    },

    async fetchWatchlist() {
      this.loading.watchlist = true;
      try {
        const response = await axios.get('/api/watchlist');
        this.watchlist = response.data;

        // Update watchlist status if a stock is selected
        if (this.selectedStock) {
          this.checkWatchlistStatus(this.selectedStock.symbol);
        }
      } catch (err) {
        console.warn('Watchlist not available:', err);
      } finally {
        this.loading.watchlist = false;
      }
    },

    checkWatchlistStatus(symbol) {
      this.isInWatchlist = this.watchlist.some(item =>
        item.symbol.toUpperCase() === symbol.toUpperCase()
      );
    },

    async viewStockDetails(symbol) {
      this.loading.stockDetails = true;
      try {
        const quoteResponse = await axios.get(`/api/stocks/quote/${symbol}`);
        this.selectedStock = quoteResponse.data;

        // Fetch company profile in parallel
        const profilePromise = axios.get(`/api/stocks/profile/${symbol}`)
          .then(response => {
            this.stockProfile = response.data;
          })
          .catch(err => {
            console.warn('Company profile not available:', err);
            this.stockProfile = null;
          });

        // Fetch historical data in parallel  
        const historyPromise = axios.get(`/api/stocks/historical/${symbol}`)
          .then(response => {
            this.stockHistory = response.data;
          })
          .catch(err => {
            console.warn('Historical data not available:', err);
            this.stockHistory = null;
          });

        // Check if stock is in watchlist  
        if (this.watchlist.length > 0) {
          this.checkWatchlistStatus(symbol);
        }

        // Wait for all requests to complete
        await Promise.allSettled([profilePromise, historyPromise]);

        // Update URL without page reload (for bookmarking)
        window.history.pushState(
          { symbol: symbol },
          `Stock Details: ${symbol}`,
          `/stock/${symbol}`
        );
      } catch (err) {
        this.error = 'Error loading stock details. Please try again.';
        console.error('Error fetching stock details:', err);
      } finally {
        this.loading.stockDetails = false;
      }
    },
    backToList() {
      this.selectedStock = null;
      this.stockProfile = null;
      this.stockHistory = null;
      window.history.pushState({}, 'Stock List', '/');
    },

    // Handle browser back/forward buttons
    handlePopState(event) {
      const pathParts = window.location.pathname.split('/');
      if (pathParts[1] === 'stock' && pathParts[2]) {
        this.viewStockDetails(pathParts[2]);
      } else {
        this.selectedStock = null;
        this.stockProfile = null;
        this.stockHistory = null;
      }
    },

    async fetchMarketSummary() {
      try {
        const response = await axios.get('/api/stocks/market-summary');
        this.marketSummary = response.data;
      } catch (err) {
        console.warn('Market summary not available:', err);
      }
    },

    async addToWatchlist(symbol) {
      try {
        await axios.post('/api/watchlist/items', { symbol });
        this.isInWatchlist = true;
        await this.fetchWatchlist(); // Refresh watchlist

        // Show success notification
        this.showNotification(`${symbol} added to watchlist`, 'success');
      } catch (err) {
        console.error('Error adding to watchlist:', err);

        // Show error notification
        this.showNotification(
          err.response?.data?.message || 'Failed to add to watchlist',
          'error'
        );
      }
    },

    async removeFromWatchlist(symbol) {
      try {
        await axios.delete(`/api/watchlist/items/${symbol}`);

        if (this.selectedStock && this.selectedStock.symbol === symbol) {
          this.isInWatchlist = false;
        }

        await this.fetchWatchlist(); // Refresh watchlist

        // Show success notification
        this.showNotification(`${symbol} removed from watchlist`, 'success');
      } catch (err) {
        console.error('Error removing from watchlist:', err);

        // Show error notification
        this.showNotification(
          err.response?.data?.message || 'Failed to remove from watchlist',
          'error'
        );
      }
    },

    showNotification(message, type = 'info') {
      this.error = message;

      // Clear notification after 3 seconds
      setTimeout(() => {
        if (this.error === message) {
          this.error = null;
        }
      }, 3000);
    }
  },
  mounted() {
    // Check if we're already on a stock detail page
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'stock' && pathParts[2]) {
      this.viewStockDetails(pathParts[2]);
    } else {
      this.fetchStocks();
    }

    // Add browser history navigation support
    window.addEventListener('popstate', this.handlePopState);
  },
  beforeUnmount() {
    window.removeEventListener('popstate', this.handlePopState);
  }
});

// Mount the Vue application
app.mount('#stock-app');
