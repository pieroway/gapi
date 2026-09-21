<?php
/**
 * =================================================================
 * Reports API Endpoint
 * =================================================================
 * Handles all /api/reports/* routes.
 * Replaces routes/reports.js from the Node.js version.
 *
 * IMPROVEMENT over Node.js version: Reports are now stored in the
 * MySQL database (gapi_reports table) instead of in-memory, so
 * they persist across server restarts.
 * =================================================================
 */

require_once __DIR__ . '/bootstrap.php';

$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri    = $_SERVER['REQUEST_URI'];

$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^/?api/reports/?#', '', $path);
$path = trim($path, '/');
$segments = $path !== '' ? explode('/', $path) : [];

// ---------------------------------------------------------------
// Route dispatcher
// ---------------------------------------------------------------

// GET /api/reports  — list all reports with event details
if ($requestMethod === 'GET' && count($segments) === 0) {
    handleGetAllReports();
}

// POST /api/reports  — submit a new report
elseif ($requestMethod === 'POST' && count($segments) === 0) {
    handleCreateReport();
}

// DELETE /api/reports/:id  — dismiss (delete) a report
elseif ($requestMethod === 'DELETE' && count($segments) === 1) {
    handleDeleteReport($segments[0]);
}

else {
    jsonResponse(['message' => 'Not found.'], 404);
}

// ---------------------------------------------------------------
// Handler functions
// ---------------------------------------------------------------

/**
 * GET /api/reports
 * Returns all reports joined with their associated event details.
 */
function handleGetAllReports(): void {
    $db = getDb();

    $sql = "
        SELECT
            r.id, r.reason, r.details, r.created_at,
            e.public_id  AS event_id,
            e.title      AS event_title,
            e.description AS event_description,
            e.address    AS event_address
        FROM gapi_reports r
        LEFT JOIN gapi_events e ON r.event_public_id = e.public_id
        ORDER BY r.created_at DESC
    ";

    $reports = $db->query($sql)->fetchAll();

    // Shape the response to match the Node.js format the admin UI expects:
    // { id, reason, details, created_at, event: { id, title, description, address } }
    $shaped = array_map(function ($row) {
        return [
            'id'         => $row['id'],
            'reason'     => $row['reason'],
            'details'    => $row['details'],
            'created_at' => $row['created_at'],
            'event'      => [
                'id'          => $row['event_id'],
                'title'       => $row['event_title'] ?? 'Event Not Found',
                'description' => $row['event_description'] ?? '',
                'address'     => $row['event_address'] ?? '',
            ],
        ];
    }, $reports);

    jsonResponse($shaped);
}

/**
 * POST /api/reports
 * Submits a new report for an event.
 */
function handleCreateReport(): void {
    // Strict rate limit: 5 reports per hour per IP
    checkRateLimit('report', 5, 3600);

    $body = getJsonBody();

    // The client sends public_id as the event identifier
    $eventPublicId = $body['public_id'] ?? $body['event_id'] ?? null;
    $reason        = $body['reason'] ?? null;
    $details       = $body['details'] ?? '';

    if (!$eventPublicId || !$reason) {
        jsonResponse(['message' => 'Event ID and reason are required.'], 400);
    }

    $db = getDb();

    // Verify the event exists
    $eventStmt = $db->prepare('SELECT public_id FROM gapi_events WHERE public_id = ?');
    $eventStmt->execute([$eventPublicId]);
    if (!$eventStmt->fetch()) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $reportId = generateUuid();
    $stmt = $db->prepare('INSERT INTO gapi_reports (id, event_public_id, reason, details) VALUES (?, ?, ?, ?)');
    $stmt->execute([$reportId, $eventPublicId, $reason, $details]);

    jsonResponse([
        'id'         => $reportId,
        'event_id'   => $eventPublicId,
        'reason'     => $reason,
        'details'    => $details,
        'created_at' => date('Y-m-d H:i:s'),
    ], 201);
}

/**
 * DELETE /api/reports/:id
 * Dismisses (deletes) a report by its UUID.
 */
function handleDeleteReport(string $id): void {
    checkRateLimit('write', 20, 900);

    $db = getDb();
    $stmt = $db->prepare('DELETE FROM gapi_reports WHERE id = ?');
    $stmt->execute([$id]);

    // Always return 204 even if not found, matching the Node.js behaviour
    http_response_code(204);
    exit;
}
