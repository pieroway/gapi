-- =================================================================
-- Migration 003: Create gapi_reports table
-- =================================================================
-- Moves reports from in-memory storage to persistent MySQL storage.
--
-- Run once against an existing database:
--   mysql -u <user> -p gapi < migrations/003_create_reports_table.sql
-- =================================================================

USE `gapi`;

CREATE TABLE IF NOT EXISTS `gapi_reports` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `event_id` INT NOT NULL,
  `reason` VARCHAR(50) NOT NULL,
  `details` VARCHAR(1000),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `gapi_events`(`id`) ON DELETE CASCADE
);
