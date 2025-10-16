// routes/item_categories.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection pool

// GET all item categories from the database
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT id, name FROM gapi_item_categories ORDER BY id');
        res.json(categories);
    } catch (error) {
        console.error('Failed to fetch item categories:', error);
        res.status(500).json({ message: 'Internal server error while fetching item categories.' });
    }
});

module.exports = router;
