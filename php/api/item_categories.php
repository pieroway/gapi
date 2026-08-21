<?php
/**
 * =================================================================
 * Item Categories API Endpoint
 * =================================================================
 * Handles GET /api/item_categories
 * Replaces routes/item_categories.js from the Node.js version.
 * =================================================================
 */

require_once __DIR__ . '/bootstrap.php';

$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod !== 'GET') {
    jsonResponse(['message' => 'Method not allowed.'], 405);
}

$db = getDb();
$stmt = $db->query('SELECT id, name FROM gapi_item_categories ORDER BY id');
$categories = $stmt->fetchAll();

jsonResponse($categories);
