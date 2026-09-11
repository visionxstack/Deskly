const express = require('express');
const clientConfig = require('../config/client-config');

const router = express.Router();

// Serve client configuration (including fake secrets for recon practice)
router.get('/client', (req, res) => {
  res.json(clientConfig);
});

module.exports = router;
