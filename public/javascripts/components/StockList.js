// StockList component
app.component('stock-list', {
  props: {
    stocks: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['view-stock'],
  methods: {
    formatPrice(price) {
      return '$' + parseFloat(price).toFixed(2);
    },
    formatChange(change) {
      return (change > 0 ? '+' : '') + parseFloat(change).toFixed(2);
    },
    formatChangePercent(changePercent) {
      return (changePercent > 0 ? '+' : '') + parseFloat(changePercent).toFixed(2) + '%';
    },
    viewStock(symbol) {
      this.$emit('view-stock', symbol);
    }
  },
  template: `
    <div class="stock-table-container">
      <div v-if="loading" class="loading">
        <span>Loading stocks...</span>
      </div>
      <table v-else class="stock-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Company</th>
            <th>Price</th>
            <th>Change</th>
            <th>Change %</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in stocks" :key="stock.symbol">
            <td class="symbol">{{ stock.symbol }}</td>
            <td>{{ stock.name }}</td>
            <td class="price">{{ formatPrice(stock.price) }}</td>
            <td :class="stock.change >= 0 ? 'positive' : 'negative'">
              {{ formatChange(stock.change) }}
            </td>
            <td :class="stock.changePercent >= 0 ? 'positive' : 'negative'">
              {{ formatChangePercent(stock.changePercent) }}
            </td>
            <td>
              <button @click="viewStock(stock.symbol)" class="detail-link">View Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
});
