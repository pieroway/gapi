<?php
/**
 * =================================================================
 * Maps Configuration Endpoint
 * =================================================================
 * Serves the Google Maps API key to the client.
 * Keeps the key out of the HTML source by delivering it via JSON.
 *
 * Route: GET /api/config
 * Rewrite: api/maps_config.php (see .htaccess)
 *
 * The key is read from the GOOGLE_MAPS_API_KEY environment variable,
 * which should be set in docker-compose.yml (or your hosting panel).
 * =================================================================
 */

header('Content-Type: application/json');
header('Cache-Control: no-store');

$key = getenv('GOOGLE_MAPS_API_KEY') ?: '';

echo json_encode(['googleMapsApiKey' => $key]);
