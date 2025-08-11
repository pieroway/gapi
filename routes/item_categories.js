// routes/item_categories.js
const express = require('express');
const router = express.Router();
const item_categories = require('../data/item_categories');

// GET all item categories
router.get('/', (req, res) => {
    res.json(item_categories);
});

module.exports = router;
