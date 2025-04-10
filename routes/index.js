var express = require('express');
var router = express.Router();
var { ensureAuthenticated } = require('../auth');
var path = require('path');

/* GET home page */
router.get('/', function (req, res, next) {
  res.sendFile('index.html', { root: './public' });
});

// Protect all dashboard routes
router.use(['/dashboard', '/stock'], ensureAuthenticated);

/* GET dashboard page - serve the SPA */
router.get(['/dashboard', '/stock/:symbol'], function (req, res, next) {
  // For a single page application, we just need to serve the main HTML file
  // The Vue application will handle the routing on the client side
  res.sendFile(path.join(__dirname, '../public/index.html'));
});



module.exports = router;
