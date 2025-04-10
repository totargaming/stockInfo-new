var express = require('express');
var router = express.Router();
var { ensureAuthenticated } = require('../auth');

// Protect all dashboard routes
router.use(ensureAuthenticated);

/* GET any page - serve the SPA */
router.get(['/dashboard', '/stock/:symbol'], function (req, res, next) {
  // For a single page application, we just need to serve the main HTML file
  // The Vue application will handle the routing on the client side
  res.sendFile('index.html', { root: './public' });
});



module.exports = router;
