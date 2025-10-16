// Load environment variables from .env file for local development
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 61571;

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/sale_types', require('./routes/sale_types'));
app.use('/api/item_categories', require('./routes/item_categories'));
app.use('/api/reports', require('./routes/reports'));
// The `express.static` middleware above handles serving files from the 'public' directory.
// For a Single Page Application (SPA), we need a catch-all route that serves the
// main HTML file for any request that doesn't match a static file. This allows
// client-side routing and deep-linking to work correctly.
app.get('*', (req, res) => {
  // All non-file requests should serve the main application shell.
  // It's conventional to name this file 'index.html'.
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
