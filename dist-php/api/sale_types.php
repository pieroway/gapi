<?php
/**
 * =================================================================
 * Sale Types API Endpoint
 * =================================================================
 * Handles GET /api/sale_types
 * Replaces routes/sale_types.js from the Node.js version.
 * =================================================================
 */

require_once __DIR__ . '/config.php';

$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod !== 'GET') {
    jsonResponse(['message' => 'Method not allowed.'], 405);
}

$db = getDb();
$stmt = $db->query('SELECT id, name FROM gapi_sale_types ORDER BY id');
$saleTypes = $stmt->fetchAll();

jsonResponse($saleTypes);
