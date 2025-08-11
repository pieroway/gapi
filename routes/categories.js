const express = require('express');
const router = express.Router();
const categories = require('../data/categories');

// GET /api/categories - Get all categories
router.get('/', (req, res) => {
  res.json(categories);
});

module.exports = router;
