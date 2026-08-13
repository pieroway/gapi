-- Migration: Add user_id column to gapi_event_comments table
-- This allows tracking which user posted each comment

ALTER TABLE `gapi_event_comments`
ADD COLUMN `user_id` VARCHAR(100) NULL AFTER `comment_text`;

-- Add an index for better query performance when filtering by user_id
CREATE INDEX `idx_user_id` ON `gapi_event_comments`(`user_id`);
