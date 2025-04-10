// Authentication Vue application
// Use Vue directly without re-declaring createApp
// const { createApp } = Vue; - removing this line to avoid conflicts

// Create the auth Vue application
const authApp = Vue.createApp({
  data() {
    return {
      user: null,
      error: null
    };
  },
  methods: {
    async checkAuthStatus() {
      try {
        const response = await axios.get('/auth/user');
        if (response.data && response.data.user) {
          this.user = response.data.user;
        }
      } catch (err) {
        // User is not authenticated - this is normal, so no need to show an error
        this.user = null;
      }
    },
    async logout() {
      try {
        console.log('Logout started'); // Debug logging
        const response = await axios.get('/auth/logout');
        console.log('Logout response:', response.data); // Debug response
        if (response.data && response.data.success) {
          console.log('Logout successful');
          // Clear user data first
          this.user = null;
          // Wait a moment to ensure the session is cleared before redirecting
          setTimeout(() => {
            // Force a complete page reload rather than just changing location
            console.log('Redirecting to login page...'); // Debug redirect
            window.location.replace('/login');
          }, 300);
        } else {
          console.error('Logout response not successful:', response.data);
        }
      } catch (err) {
        console.error('Error during logout:', err);
      }
    }
  },
  mounted() {
    // Check authentication status when component mounts
    this.checkAuthStatus();
  }
});

// Mount the auth Vue application
authApp.mount('#auth-buttons');
