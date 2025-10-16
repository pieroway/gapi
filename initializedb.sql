-- =================================================================
-- Garage Sale Finder - Database Schema
-- =================================================================
-- This script creates all the necessary tables for the application.
-- It is designed to be run once to set up the database.
-- =================================================================

-- Select the database to use. This should be created beforehand.
USE `gapi`;

-- Set the default storage engine and character set for new tables
SET default_storage_engine = InnoDB;
SET NAMES utf8mb4;
--
-- Table structure for `sale_types`
-- (Create this first as `events` depends on it)
--
CREATE TABLE `gapi_sale_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
);

-- Table structure for `events`
-- (This is the core table)
--
CREATE TABLE `gapi_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `public_id` VARCHAR(36) NOT NULL UNIQUE,
  `edit_guid` VARCHAR(36) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `address` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `start_datetime` DATETIME NOT NULL,
  `end_datetime` DATETIME NOT NULL,
  `sale_type_id` INT,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `ended_early_flags` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_public_id` (`public_id`),
  INDEX `idx_edit_guid` (`edit_guid`),
  FOREIGN KEY (`sale_type_id`) REFERENCES `gapi_sale_types`(`id`) ON DELETE
  SET NULL
);
--
-- Table structure for `event_photos`
-- (One-to-many relationship with `events`)
--
CREATE TABLE `gapi_event_photos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `gapi_events`(`id`) ON DELETE CASCADE
);

--
-- Table structure for `item_categories`
-- (Create this before `event_item_categories`)
--
CREATE TABLE `gapi_item_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
);
-- =================================================================
-- Table structure for `event_item_categories`
-- (Many-to-many relationship between `events` and `item_categories`)
--
CREATE TABLE `gapi_event_item_categories` (
  `event_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  PRIMARY KEY (`event_id`, `category_id`),
  FOREIGN KEY (`event_id`) REFERENCES `gapi_events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `gapi_item_categories`(`id`) ON DELETE CASCADE
);
--
-- Table structure for `event_ratings`
-- (One-to-many relationship with `events`)
--
CREATE TABLE `gapi_event_ratings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `rating_value` TINYINT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `gapi_events`(`id`) ON DELETE CASCADE
);
--
-- Table structure for `event_comments`
-- (One-to-many relationship with `events`)
--
CREATE TABLE `gapi_event_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `comment_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `gapi_events`(`id`) ON DELETE CASCADE
);

-- =================================================================
-- INITIAL DATA POPULATION (LOOKUP TABLES)
-- =================================================================

--
-- Pre-populate `sale_types` with initial data
--
INSERT INTO `gapi_sale_types` (name)
VALUES ('Garage Sale'),
  ('Yard Sale'),
  ('Moving Sale'),
  ('Estate Sale');

--
-- Pre-populate `item_categories` with initial data
--
INSERT INTO `gapi_item_categories` (name)
VALUES ('Furniture'),
  ('Electronics'),
  ('Clothing'),
  ('Toys'),
  ('Books'),
  ('Antiques'),
  ('Tools'),
  ('Home Goods');
-- DUMMY DATA INSERTION
-- =================================================================
-- This section inserts sample data for development and testing.
-- =================================================================
--
-- Insert Dummy Events
-- Note: We assume the auto-incremented IDs will be 1 and 2.
--
INSERT INTO `gapi_events` (
    `public_id`,
    `edit_guid`,
    `title`,
    `description`,
    `address`,
    `latitude`,
    `longitude`,
    `start_datetime`,
    `end_datetime`,
    `sale_type_id`
  )
VALUES (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'fedcba09-8765-4321-0987-654321fedcba',
    'Huge Neighborhood Garage Sale',
    'Lots of items for everyone! Furniture, kids toys, clothing, and more. Come find a treasure!',
    '123 Main St, Anytown, USA 12345',
    40.7128,
    -74.0060,
    '2024-08-10 08:00:00',
    '2024-08-10 16:00:00',
    1
  ),
  (
    'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    '1fedcba0-9876-5432-1098-7654321fedcb',
    'Moving Out - Everything Must Go!',
    'We are moving across the country and selling everything. High-quality furniture, kitchen appliances, and tools.',
    '456 Oak Ave, Sometown, USA 54321',
    34.0522,
    -118.2437,
    '2024-08-11 09:00:00',
    '2024-08-11 14:00:00',
    3
  );
--
-- Insert Dummy Photos (for event_id = 1)
--
INSERT INTO `gapi_event_photos` (`event_id`, `file_path`)
VALUES (1, 'https://picsum.photos/seed/today/200/300'),
  (1, 'https://picsum.photos/seed/today/200/300');
--
--
-- Insert Dummy Item Categories (for both events)
--
INSERT INTO `gapi_event_item_categories` (`event_id`, `category_id`)
VALUES (1, 1),
  -- Event 1 has Furniture
  (1, 3),
  -- Event 1 has Clothing
  (1, 4),
  -- Event 1 has Toys
  (2, 1),
  -- Event 2 has Furniture
  (2, 7),
  -- Event 2 has Tools
  (2, 8);
-- Event 2 has Home Goods
--
-- Insert Dummy Ratings (for event_id = 1)
--
INSERT INTO `gapi_event_ratings` (`event_id`, `rating_value`)
VALUES (1, 5),
  (1, 4);
--
-- Insert Dummy Comments (for event_id = 2)
--
INSERT INTO `gapi_event_comments` (`event_id`, `comment_text`)
VALUES (2, 'Are you selling any power tools?');