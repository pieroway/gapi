/**
 * =================================================================
 * Database Connection Module
 * =================================================================
 * This module creates and exports a MySQL connection pool using
 * credentials from environment variables. A connection pool is
 * more efficient than creating a new connection for every query.
 */

const mysql = require('mysql2/promise');

// Create a connection pool. The pool will manage individual connections.
// When running inside Docker, process.env.DB_HOST should be the name of the
// MySQL service (e.g., 'gapi-db'). For local development outside of Docker,
// it would typically be 'localhost' or '127.0.0.1'.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Default is 10, adjust as needed
  queueLimit: 0
});

// Test the connection on startup to provide immediate feedback.
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to the MySQL database.');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the MySQL database:', err.message);
    console.error('Please check your .env file or Docker environment variables (DB_HOST, DB_USER, etc.)');
  });

module.exports = pool;
