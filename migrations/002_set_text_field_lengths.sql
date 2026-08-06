-- =================================================================
-- Migration 002: Constrain text field lengths
-- =================================================================
-- Aligns DB column sizes with the application-layer validation limits
-- set in routes/events.js and routes/reports.js.
--
-- Run once against an existing database:
--   mysql -u <user> -p gapi < migrations/002_set_text_field_lengths.sql
-- =================================================================

USE `gapi`;

-- Limit event descriptions to 2000 characters (matches API validation)
ALTER TABLE `gapi_events`
  MODIFY `description` VARCHAR(2000);

-- Limit comment text to 1000 characters (matches API validation)
ALTER TABLE `gapi_event_comments`
  MODIFY `comment_text` VARCHAR(1000) NOT NULL;
