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
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Default is 10, adjust as needed
  queueLimit: 0
});

module.exports = pool;

