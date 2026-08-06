-- =================================================================
-- Garage Sale Finder - Database Schema
-- =================================================================
-- This script creates all the necessary tables for the application.
-- It is designed to be run once to set up the database.
-- =================================================================

-- Drop the existing database if it exists, then create and select it.
-- This ensures a clean slate for initialization.
DROP DATABASE IF EXISTS `gapi`;
CREATE DATABASE `gapi`;
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
  `description` VARCHAR(2000),
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
  `comment_text` VARCHAR(1000) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `gapi_events`(`id`) ON DELETE CASCADE
);

--
-- Table structure for `reports`
-- (User-submitted reports about events)
--
CREATE TABLE `gapi_reports` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `event_id` INT NOT NULL,
  `reason` VARCHAR(50) NOT NULL,
  `details` VARCHAR(1000),
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
-- The sample events are generated within the approximate city limits of Ottawa, ON, Canada.
-- =================================================================
--
-- Insert Dummy Events
--
INSERT INTO `gapi_events` (`public_id`, `edit_guid`, `title`, `description`, `address`, `latitude`, `longitude`, `start_datetime`, `end_datetime`, `sale_type_id`) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'fedcba09-8765-4321-0987-654321fedcba', 'Kanata Lakes Community Sale', 'Multi-family garage sale. Toys, books, and home goods.', '100 Maple Grove Rd, Kanata, ON', 45.3198, -75.9116, '2024-09-14 08:00:00', '2024-09-14 15:00:00', 1),
('b2c3d4e5-f6a7-8901-2345-67890abcdef1', '1fedcba0-9876-5432-1098-7654321fedcb', 'Downtown Moving Sale', 'Moving out of our condo. Selling furniture and electronics.', '250 Rideau St, Ottawa, ON', 45.4275, -75.6895, '2024-09-14 09:00:00', '2024-09-14 13:00:00', 3),
('c3d4e5f6-a7b8-9012-3456-7890abcdef12', '21fedcba-0987-6543-2109-87654321fedc', 'Orleans Antique Fair', 'Estate sale featuring vintage items and antiques.', '2010 Trim Rd, Orleans, ON', 45.4712, -75.5018, '2024-09-15 10:00:00', '2024-09-15 16:00:00', 4),
('d4e5f6a7-b8c9-0123-4567-890abcdef123', '321fedcb-a098-7654-3210-987654321fed', 'Barrhaven Yard Sale', 'Kids clothes, tools, and garden equipment.', '500 Fallowfield Rd, Barrhaven, ON', 45.2815, -75.7613, '2024-09-14 08:30:00', '2024-09-14 14:00:00', 2),
('e5f6a7b8-c9d0-1234-5678-90abcdef1234', '4321fedc-ba09-8765-4321-0987654321fe', 'Glebe Neighbourhood Sale', 'Everything must go! Kitchenware, decor, and more.', '755 Bank St, Ottawa, ON', 45.4011, -75.6853, '2024-09-21 09:00:00', '2024-09-21 15:00:00', 1),
('f6a7b8c9-d0e1-2345-6789-0abcdef12345', '54321fed-cba0-9876-5432-10987654321f', 'Stittsville Family Garage Sale', 'Lots of baby gear and toys.', '1800 Stittsville Main St, Stittsville, ON', 45.2600, -75.9250, '2024-09-21 08:00:00', '2024-09-21 12:00:00', 1),
('a7b8c9d0-e1f2-3456-7890-bcdef1234567', '654321fe-dcba-0987-6543-210987654321', 'Centretown Moving Sale', 'Selling office furniture and electronics.', '412 Kent St, Ottawa, ON', 45.4123, -75.7012, '2024-09-22 11:00:00', '2024-09-22 16:00:00', 3),
('b8c9d0e1-f2a3-4567-8901-cdef12345678', '7654321f-edcb-a098-7654-321098765432', 'Riverside South Community Event', 'Community-wide sale with dozens of homes participating.', '889 Earl Armstrong Rd, Ottawa, ON', 45.2880, -75.6511, '2024-09-28 08:00:00', '2024-09-28 14:00:00', 1),
('c9d0e1f2-a3b4-5678-9012-def123456789', '87654321-fedc-ba09-8765-432109876543', 'Westboro Art & Collectibles', 'Unique finds and local art.', '344 Richmond Rd, Ottawa, ON', 45.3958, -75.7578, '2024-09-28 10:00:00', '2024-09-28 16:00:00', 2),
('d0e1f2a3-b4c5-6789-0123-ef1234567890', '98765432-1fed-cba0-9876-543210987654', 'Hintonburg Downsizing Sale', 'Furniture, books, and records.', '1053 Wellington St W, Ottawa, ON', 45.4055, -75.7315, '2024-09-29 09:00:00', '2024-09-29 13:00:00', 3),
('e1f2a3b4-c5d6-7890-1234-f12345678901', 'a9876543-21fe-dcba-0987-654321098765', 'Alta Vista Garage Sale', 'Tools, sporting goods, and more.', '1355 Bank St, Ottawa, ON', 45.3850, -75.6650, '2024-10-05 08:00:00', '2024-10-05 14:00:00', 1),
('f2a3b4c5-d6e7-8901-2345-123456789012', 'ba987654-321f-edcb-a098-765432109876', 'Nepean Multi-Family Sale', 'Something for everyone!', '101 Centrepointe Dr, Nepean, ON', 45.3430, -75.7600, '2024-10-05 09:00:00', '2024-10-05 15:00:00', 1),
('a3b4c5d6-e7f8-9012-3456-234567890123', 'cba98765-4321-fedc-ba09-876543210987', 'ByWard Market Pop-Up', 'Handmade goods and vintage clothing.', '55 Byward Market Square, Ottawa, ON', 45.4280, -75.6940, '2024-10-06 10:00:00', '2024-10-06 17:00:00', 2),
('b4c5d6e7-f8a9-0123-4567-345678901234', 'dcba9876-5432-1fed-cba0-987654321098', 'Findlay Creek Moving Sale', 'Entire contents of home for sale.', '4750 Bank St, Gloucester, ON', 45.3200, -75.6100, '2024-10-12 08:00:00', '2024-10-12 16:00:00', 3),
('c5d6e7f8-a9b0-1234-5678-456789012345', 'edcba987-6543-21fe-dcba-098765432109', 'Old Ottawa South Estate Sale', 'High-quality furniture and antiques.', '1123 Bank St, Ottawa, ON', 45.3900, -75.6800, '2024-10-12 09:00:00', '2024-10-12 15:00:00', 4),
('d6e7f8a9-b0c1-2345-6789-567890123456', 'fedcba98-7654-321f-edcb-a09876543210', 'Chapel Hill Yard Sale', 'Kids toys and clothing.', '1650 Orleans Blvd, Orleans, ON', 45.4500, -75.5300, '2024-10-13 09:00:00', '2024-10-13 13:00:00', 2),
('e7f8a9b0-c1d2-3456-7890-678901234567', '1fedcba9-8765-4321-fedc-ba0987654321', 'Rockcliffe Park Garage Sale', 'Designer clothing and home decor.', '380 Springfield Rd, Ottawa, ON', 45.4450, -75.6650, '2024-10-19 10:00:00', '2024-10-19 15:00:00', 1),
('f8a9b0c1-d2e3-4567-8901-789012345678', '21fedcba-9876-5432-1fed-cba098765432', 'Carlington Community Sale', 'Bikes, tools, and more.', '1390 Merivale Rd, Ottawa, ON', 45.3700, -75.7300, '2024-10-19 08:30:00', '2024-10-19 14:00:00', 1),
('a9b0c1d2-e3f4-5678-9012-890123456789', '321fedcb-a987-6543-21fe-dcba09876543', 'Vanier Moving Sale', 'Everything must go!', '290 Montreal Rd, Vanier, ON', 45.4380, -75.6600, '2024-10-20 09:00:00', '2024-10-20 12:00:00', 3),
('b0c1d2e3-f4a5-6789-0123-901234567890', '4321fedc-ba98-7654-321f-edcba0987654', 'South Keys Mega Sale', 'Electronics and video games.', '2210 Bank St, Ottawa, ON', 45.3550, -75.6500, '2024-10-26 09:00:00', '2024-10-26 15:00:00', 1),
('c1d2e3f4-a5b6-7890-1234-a12345678901', '54321fed-cba9-8765-4321-fedcba098765', 'Bells Corners Yard Sale', 'Gardening tools and outdoor furniture.', '2150 Robertson Rd, Nepean, ON', 45.3250, -75.8200, '2024-09-14 08:00:00', '2024-09-14 13:00:00', 2),
('d2e3f4a5-b6c7-8901-2345-b23456789012', '654321fe-dcba-9876-5432-1fedcba09876', 'Manotick Antique Sale', 'Collectibles and vintage furniture.', '5521 Manotick Main St, Manotick, ON', 45.2250, -75.6850, '2024-09-15 10:00:00', '2024-09-15 16:00:00', 4),
('e3f4a5b6-c7d8-9012-3456-c34567890123', '7654321f-edcb-a987-6543-21fedcba0987', 'Crystal Beach Community Sale', 'Water sports gear and beach toys.', '100 Corkstown Rd, Nepean, ON', 45.3450, -75.8100, '2024-09-21 09:00:00', '2024-09-21 14:00:00', 1),
('f4a5b6c7-d8e9-0123-4567-d45678901234', '87654321-fedc-ba98-7654-321fedcba098', 'Little Italy Moving Sale', 'Kitchen appliances and decor.', '301 Preston St, Ottawa, ON', 45.4050, -75.7150, '2024-09-22 10:00:00', '2024-09-22 15:00:00', 3),
('a5b6c7d8-e9f0-1234-5678-e56789012345', '98765432-1fed-cba9-8765-4321fedcba09', 'Hunt Club Park Yard Sale', 'Books, movies, and music.', '3320 Paul Anka Dr, Ottawa, ON', 45.3480, -75.6600, '2024-09-28 08:00:00', '2024-09-28 13:00:00', 2),
('b6c7d8e9-f0a1-2345-6789-f67890123456', 'a9876543-21fe-dcba-9876-54321fedcba0', 'Greenboro Community Sale', 'Lots of kids stuff and household items.', '260 Lorry Greenberg Dr, Ottawa, ON', 45.3600, -75.6400, '2024-09-29 09:00:00', '2024-09-29 14:00:00', 1),
('c7d8e9f0-a1b2-3456-7890-178901234567', 'ba987654-321f-edcb-a987-654321fedcba', 'Carlingwood Downsizing Sale', 'Furniture and home goods.', '2121 Carling Ave, Ottawa, ON', 45.3750, -75.7750, '2024-10-05 10:00:00', '2024-10-05 15:00:00', 3),
('d8e9f0a1-b2c3-4567-8901-289012345678', 'cba98765-4321-fedc-ba98-7654321fedcb', 'Blackburn Hamlet Estate Sale', 'Full house contents.', '2550 Innes Rd, Gloucester, ON', 45.4300, -75.5700, '2024-10-06 09:00:00', '2024-10-06 16:00:00', 4),
('e9f0a1b2-c3d4-5678-9012-390123456789', 'dcba9876-5432-1fed-cba9-87654321fedc', 'Bridlewood Community Garage Sale', 'Multi-family event.', '400 Huntmar Dr, Kanata, ON', 45.2800, -75.9000, '2024-10-12 08:00:00', '2024-10-12 14:00:00', 1),
('f0a1b2c3-d4e5-6789-0123-401234567890', 'edcba987-6543-21fe-dcba-987654321fed', 'Sandy Hill Student Moving Sale', 'Desks, chairs, and cheap furniture.', '200 Wilbrod St, Ottawa, ON', 45.4250, -75.6800, '2024-10-13 11:00:00', '2024-10-13 16:00:00', 3);

--
-- Insert Dummy Photos (for event_id = 1)
--
INSERT INTO `gapi_event_photos` (`event_id`, `file_path`)
VALUES
(1, 'uploads/sample_photo_1.jpg'),
(1, 'uploads/sample_photo_2.jpg'),
(2, 'uploads/sample_photo_3.jpg'),
(5, 'uploads/sample_photo_4.jpg');

-- Insert Dummy Item Categories (for both events)
--
INSERT INTO `gapi_event_item_categories` (`event_id`, `category_id`)
VALUES
(1, 4), (1, 8), -- Kanata Lakes: Toys, Home Goods
(2, 1), (2, 2), -- Downtown: Furniture, Electronics
(3, 6), (3, 1), -- Orleans: Antiques, Furniture
(4, 7), (4, 3), -- Barrhaven: Tools, Clothing
(5, 8), (5, 5), -- Glebe: Home Goods, Books
(6, 4), (6, 3), -- Stittsville: Toys, Clothing
(8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 6), (8, 7), (8, 8), -- Riverside South: All categories
(15, 1), (15, 6), -- Old Ottawa South: Furniture, Antiques
(20, 2); -- South Keys: Electronics

--
-- Insert Dummy Ratings (for event_id = 1)
--
INSERT INTO `gapi_event_ratings` (`event_id`, `rating_value`)
VALUES
(1, 5), (1, 4), (1, 5),
(2, 3),
(3, 5), (3, 5),
(5, 4);

--
-- Insert Dummy Comments (for event_id = 2)
--
INSERT INTO `gapi_event_comments` (`event_id`, `comment_text`)
VALUES
(2, 'Is the couch still available?'),
(4, 'Do you have any power tools?'),
(15, 'Beautiful collection! Well worth the visit.');