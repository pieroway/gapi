// Load environment variables from .env file for local development
require('dotenv').config();

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 61571;

// Rate limiting configuration
// General API rate limiter - applies to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for write operations (POST, PUT, DELETE)
const writeOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 write operations per windowMs
  message: 'Too many write operations from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: 'Too many file uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for report submissions to prevent spam
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 reports per hour
  message: 'Too many reports submitted from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' })); // Add size limit to prevent DoS
app.use(express.static('public'));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Config endpoint — exposes only the public Google Maps API key to the client
app.get('/api/config', (req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

/**
 * Admin authentication middleware.
 * Checks for a valid Bearer token in the Authorization header.
 * The expected token is set via the ADMIN_TOKEN environment variable.
 */
const requireAdmin = (req, res, next) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    // If no token is configured, block all admin access to be safe.
    return res.status(503).json({ message: 'Admin access is not configured on this server.' });
  }
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== adminToken) {
    return res.status(401).json({ message: 'Unauthorized. Invalid or missing admin token.' });
  }
  next();
};

// API Routes
// Note: More specific routes must come before general ones
app.use('/api/events', require('./routes/events'));
app.use('/api/sale_types', require('./routes/sale_types'));
app.use('/api/item_categories', require('./routes/item_categories'));
// Reports routes: POST (submit a report) is public; GET and DELETE require admin auth.
app.post('/api/reports', reportLimiter, require('./routes/reports'));
app.use('/api/reports', requireAdmin, require('./routes/reports'));

// Export limiters for use in route files
app.locals.writeOperationsLimiter = writeOperationsLimiter;
app.locals.uploadLimiter = uploadLimiter;
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
