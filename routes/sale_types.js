// routes/sale_types.js
const express = require('express');
const router = express.Router();
const sale_types = require('../data/sale_types');

// GET all sale types
router.get('/', (req, res) => {
    res.json(sale_types);
});

module.exports = router;
