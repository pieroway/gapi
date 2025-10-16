// routes/sale_types.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection pool

// GET all sale types from the database
router.get('/', async (req, res) => {
    try {
        const [saleTypes] = await db.query('SELECT id, name FROM gapi_sale_types ORDER BY id');
        res.json(saleTypes);
    } catch (error) {
        console.error('Failed to fetch sale types:', error);
        res.status(500).json({ message: 'Internal server error while fetching sale types.' });
    }
});

module.exports = router;
