-- =================================================================
-- Garage Sale Finder - Database Schema
-- =================================================================
-- This script creates all the necessary tables for the application.
-- It is designed to be run once to set up the database.
-- =================================================================

-- Set the default storage engine and character set for new tables
SET default_storage_engine=InnoDB;
SET NAMES utf8mb4;

--
-- Table structure for `sale_types`
-- (Create this first as `events` depends on it)
--
CREATE TABLE `sale_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
);

--
-- Pre-populate `sale_types` with initial data
--
INSERT INTO `sale_types` (name) VALUES ('Garage Sale'), ('Yard Sale'), ('Moving Sale'), ('Estate Sale');

--
-- Table structure for `item_categories`
-- (Create this first as `event_item_categories` depends on it)
--
CREATE TABLE `item_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
);

--
-- Pre-populate `item_categories` with initial data
--
INSERT INTO `item_categories` (name) VALUES ('Furniture'), ('Electronics'), ('Clothing'), ('Toys'), ('Books'), ('Antiques'), ('Tools'), ('Home Goods');


--
-- Table structure for `events`
-- (This is the core table)
--
CREATE TABLE `events` (
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
  FOREIGN KEY (`sale_type_id`) REFERENCES `sale_types`(`id`) ON DELETE SET NULL
);


--
-- Table structure for `event_photos`
-- (One-to-many relationship with `events`)
--
CREATE TABLE `event_photos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
);


--
-- Table structure for `event_item_categories`
-- (Many-to-many relationship between `events` and `item_categories`)
--
CREATE TABLE `event_item_categories` (
  `event_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  PRIMARY KEY (`event_id`, `category_id`),
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `item_categories`(`id`) ON DELETE CASCADE
);


--
-- Table structure for `event_ratings`
-- (One-to-many relationship with `events`)
--
CREATE TABLE `event_ratings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `rating_value` TINYINT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
);


--
-- Table structure for `event_comments`
-- (One-to-many relationship with `events`)
--
CREATE TABLE `event_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `comment_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
);

