// StockDetail component
app.component('stock-detail', {
  props: {
    stock: {
      type: Object,
      required: true
    },
    profile: {
      type: Object,
      default: null
    },
    history: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    isInWatchlist: {
      type: Boolean,
      default: false
    }
  },
  emits: ['add-to-watchlist', 'remove-from-watchlist', 'back'],
  methods: {
    formatPrice(price) {
      if (!price && price !== 0) return 'N/A';
      return '$' + parseFloat(price).toFixed(2);
    },
    formatChange(change) {
      if (!change && change !== 0) return 'N/A';
      return (change > 0 ? '+' : '') + parseFloat(change).toFixed(2);
    },
    formatChangePercent(changePercent) {
      if (!changePercent && changePercent !== 0) return 'N/A';
      return (changePercent > 0 ? '+' : '') + parseFloat(changePercent).toFixed(2) + '%';
    },
    formatVolume(volume) {
      if (!volume) return 'N/A';
      if (volume >= 1000000000) {
        return (volume / 1000000000).toFixed(2) + 'B';
      }
      if (volume >= 1000000) {
        return (volume / 1000000).toFixed(2) + 'M';
      }
      if (volume >= 1000) {
        return (volume / 1000).toFixed(2) + 'K';
      }
      return volume.toString();
    },
    formatMarketCap(marketCap) {
      if (!marketCap) return 'N/A';
      if (marketCap >= 1000000000000) {
        return '$' + (marketCap / 1000000000000).toFixed(2) + 'T';
      }
      if (marketCap >= 1000000000) {
        return '$' + (marketCap / 1000000000).toFixed(2) + 'B';
      }
      if (marketCap >= 1000000) {
        return '$' + (marketCap / 1000000).toFixed(2) + 'M';
      }
      return '$' + marketCap.toString();
    },
    addToWatchlist() {
      this.$emit('add-to-watchlist', this.stock.symbol);
    },
    removeFromWatchlist() {
      this.$emit('remove-from-watchlist', this.stock.symbol);
    },
    goBack() {
      this.$emit('back');
    }
  },
  template: `
    <div class="stock-detail" v-if="stock">
      <div class="stock-detail-header">
        <button @click="goBack" class="back-button"><i class="fas fa-arrow-left"></i> Back to List</button>
        <div class="watchlist-actions">
          <button v-if="isInWatchlist" @click="removeFromWatchlist" class="btn btn-danger btn-sm">
            <i class="fas fa-star"></i> Remove from Watchlist
          </button>
          <button v-else @click="addToWatchlist" class="btn btn-primary btn-sm">
            <i class="fas fa-star"></i> Add to Watchlist
          </button>
        </div>
      </div>

      <div class="stock-info-header">
        <div class="stock-title">
          <h1 class="page-title">{{ stock.name || 'Unknown Company' }}</h1>
          <h2 class="stock-symbol">{{ stock.symbol }}</h2>
          <div v-if="profile" class="stock-meta">
            <span class="exchange">{{ profile.exchange }}</span>
            <span class="sector">{{ profile.sector || 'Unknown Sector' }}</span>
          </div>
        </div>
        
        <div class="stock-price-info">
          <div class="price-container">
            <p class="current-price">{{ formatPrice(stock.price) }}</p>
            <p :class="['price-change', stock.change >= 0 ? 'positive' : 'negative']">
              <span>{{ formatChange(stock.change) }}</span>
              <span>({{ formatChangePercent(stock.changesPercentage) }})</span>
            </p>
          </div>
        </div>
      </div>
      
      <div class="stock-detail-tabs">
        <div class="tab-headers">
          <button class="tab-btn active">Overview</button>
          <button class="tab-btn">Charts</button>
          <button class="tab-btn">News</button>
          <button class="tab-btn">Company</button>
        </div>
        
        <div class="tab-content">
          <div class="tab-pane active">
            <div class="stock-data-grid">
              <div class="data-box">
                <h3>Open</h3>
                <p>{{ formatPrice(stock.open) }}</p>
              </div>
              
              <div class="data-box">
                <h3>Previous Close</h3>
                <p>{{ formatPrice(stock.previousClose) }}</p>
              </div>
              
              <div class="data-box">
                <h3>Day Range</h3>
                <p>{{ formatPrice(stock.dayLow) }} - {{ formatPrice(stock.dayHigh) }}</p>
              </div>
              
              <div class="data-box">
                <h3>52 Week Range</h3>
                <p>{{ formatPrice(stock.yearLow) }} - {{ formatPrice(stock.yearHigh) }}</p>
              </div>
              
              <div class="data-box">
                <h3>Volume</h3>
                <p>{{ formatVolume(stock.volume) }}</p>
              </div>
              
              <div class="data-box">
                <h3>Avg Volume</h3>
                <p>{{ formatVolume(stock.avgVolume) }}</p>
              </div>
              
              <div class="data-box">
                <h3>Market Cap</h3>
                <p>{{ formatMarketCap(stock.marketCap) }}</p>
              </div>
              
              <div class="data-box">
                <h3>P/E Ratio</h3>
                <p>{{ stock.pe ? stock.pe.toFixed(2) : 'N/A' }}</p>
              </div>
              
              <div class="data-box">
                <h3>EPS</h3>
                <p>{{ stock.eps ? stock.eps.toFixed(2) : 'N/A' }}</p>
              </div>
            </div>
            
            <div v-if="profile" class="company-summary">
              <h3>About {{ stock.name }}</h3>
              <p>{{ profile.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>Loading stock details...</span>
    </div>
    <div v-else class="error">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Stock information not available.</p>
    </div>
  `
});
