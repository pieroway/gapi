<?php
/**
 * =================================================================
 * Events API Endpoint
 * =================================================================
 * Handles all /api/events/* routes.
 * Replaces routes/events.js from the Node.js version.
 * =================================================================
 */

require_once __DIR__ . '/config.php';

// Parse the URL path segment after /api/events
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri    = $_SERVER['REQUEST_URI'];

// Strip query string
$path = parse_url($requestUri, PHP_URL_PATH);

// Normalize: remove leading /api/events, trim slashes
$path = preg_replace('#^/?api/events/?#', '', $path);
$path = trim($path, '/');

// Split remaining path into segments
$segments = $path !== '' ? explode('/', $path) : [];

// ---------------------------------------------------------------
// Route dispatcher
// ---------------------------------------------------------------

// GET /api/events  — list all active events
if ($requestMethod === 'GET' && count($segments) === 0) {
    handleGetAllEvents();
}

// POST /api/events  — create a new event
elseif ($requestMethod === 'POST' && count($segments) === 0) {
    handleCreateEvent();
}

// GET /api/events/edit/:guid
elseif ($requestMethod === 'GET' && count($segments) === 2 && $segments[0] === 'edit') {
    handleGetEventForEdit($segments[1]);
}

// PUT /api/events/edit/:guid
elseif ($requestMethod === 'PUT' && count($segments) === 2 && $segments[0] === 'edit') {
    handleUpdateEvent($segments[1]);
}

// DELETE /api/events/edit/:guid
elseif ($requestMethod === 'DELETE' && count($segments) === 2 && $segments[0] === 'edit') {
    handleDeleteEvent($segments[1]);
}

// POST /api/events/edit/:guid/undelete
elseif ($requestMethod === 'POST' && count($segments) === 3 && $segments[0] === 'edit' && $segments[2] === 'undelete') {
    handleUndeleteEvent($segments[1]);
}

// POST /api/events/edit/:guid/photos
elseif ($requestMethod === 'POST' && count($segments) === 3 && $segments[0] === 'edit' && $segments[2] === 'photos') {
    handleAddPhoto($segments[1]);
}

// GET /api/events/:id  — single event by public_id
elseif ($requestMethod === 'GET' && count($segments) === 1) {
    handleGetEvent($segments[0]);
}

// POST /api/events/:id/flag-ended
elseif ($requestMethod === 'POST' && count($segments) === 2 && $segments[1] === 'flag-ended') {
    handleFlagEnded($segments[0]);
}

// POST /api/events/:id/ratings
elseif ($requestMethod === 'POST' && count($segments) === 2 && $segments[1] === 'ratings') {
    handleAddRating($segments[0]);
}

// POST /api/events/:id/comments
elseif ($requestMethod === 'POST' && count($segments) === 2 && $segments[1] === 'comments') {
    handleAddComment($segments[0]);
}

else {
    jsonResponse(['message' => 'Not found.'], 404);
}

// ---------------------------------------------------------------
// Handler functions
// ---------------------------------------------------------------

/**
 * GET /api/events
 * Returns all active events with photos, categories, and ratings.
 */
function handleGetAllEvents(): void {
    $db = getDb();

    $mainSql = "
        SELECT
            e.id, e.public_id, e.title, e.description, e.address, e.latitude, e.longitude,
            e.start_datetime, e.end_datetime,
            st.id AS sale_type_id, st.name AS sale_type_name,
            (SELECT AVG(er.rating_value) FROM gapi_event_ratings er WHERE er.event_id = e.id) AS average_rating
        FROM gapi_events e
        LEFT JOIN gapi_sale_types st ON e.sale_type_id = st.id
        WHERE e.is_deleted = FALSE
        ORDER BY e.start_datetime DESC
    ";
    $events = $db->query($mainSql)->fetchAll();

    if (empty($events)) {
        jsonResponse([]);
    }

    $eventIds = array_column($events, 'id');
    $placeholders = implode(',', array_fill(0, count($eventIds), '?'));

    $photoStmt = $db->prepare("SELECT event_id, file_path FROM gapi_event_photos WHERE event_id IN ($placeholders)");
    $photoStmt->execute($eventIds);
    $photos = $photoStmt->fetchAll();

    $catStmt = $db->prepare("
        SELECT eic.event_id, ic.id, ic.name
        FROM gapi_event_item_categories eic
        JOIN gapi_item_categories ic ON eic.category_id = ic.id
        WHERE eic.event_id IN ($placeholders)
    ");
    $catStmt->execute($eventIds);
    $categories = $catStmt->fetchAll();

    // Build a map keyed by internal ID
    $eventsById = [];
    foreach ($events as $event) {
        $eventsById[$event['id']] = [
            'public_id'           => $event['public_id'],
            'title'               => $event['title'],
            'description'         => $event['description'],
            'address'             => $event['address'],
            'latitude'            => (float)$event['latitude'],
            'longitude'           => (float)$event['longitude'],
            'start_datetime'      => $event['start_datetime'],
            'end_datetime'        => $event['end_datetime'],
            'sale_type_details'   => ['id' => $event['sale_type_id'], 'name' => $event['sale_type_name']],
            'average_rating'      => $event['average_rating'] !== null ? (float)$event['average_rating'] : 0,
            'photos'              => [],
            'item_category_details' => [],
        ];
    }

    foreach ($photos as $photo) {
        if (isset($eventsById[$photo['event_id']])) {
            $eventsById[$photo['event_id']]['photos'][] = $photo['file_path'];
        }
    }

    foreach ($categories as $cat) {
        if (isset($eventsById[$cat['event_id']])) {
            $eventsById[$cat['event_id']]['item_category_details'][] = [
                'id'   => $cat['id'],
                'name' => $cat['name'],
            ];
        }
    }

    jsonResponse(array_values($eventsById));
}

/**
 * GET /api/events/:id
 * Returns a single event by public_id, including comments.
 */
function handleGetEvent(string $publicId): void {
    $db = getDb();

    $mainSql = "
        SELECT
            e.id, e.public_id, e.title, e.description, e.address, e.latitude, e.longitude,
            e.start_datetime, e.end_datetime,
            st.id AS sale_type_id, st.name AS sale_type_name,
            (SELECT AVG(er.rating_value) FROM gapi_event_ratings er WHERE er.event_id = e.id) AS average_rating
        FROM gapi_events e
        LEFT JOIN gapi_sale_types st ON e.sale_type_id = st.id
        WHERE e.public_id = ? AND e.is_deleted = FALSE
    ";
    $stmt = $db->prepare($mainSql);
    $stmt->execute([$publicId]);
    $event = $stmt->fetch();

    if (!$event) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $eventId = $event['id'];

    $photoStmt = $db->prepare('SELECT file_path FROM gapi_event_photos WHERE event_id = ?');
    $photoStmt->execute([$eventId]);
    $photos = array_column($photoStmt->fetchAll(), 'file_path');

    $catStmt = $db->prepare('
        SELECT ic.id, ic.name
        FROM gapi_event_item_categories eic
        JOIN gapi_item_categories ic ON eic.category_id = ic.id
        WHERE eic.event_id = ?
    ');
    $catStmt->execute([$eventId]);
    $categories = $catStmt->fetchAll();

    $commentStmt = $db->prepare('SELECT comment_text, user_id, created_at FROM gapi_event_comments WHERE event_id = ? ORDER BY created_at DESC');
    $commentStmt->execute([$eventId]);
    $comments = $commentStmt->fetchAll();

    jsonResponse([
        'public_id'             => $event['public_id'],
        'title'                 => $event['title'],
        'description'           => $event['description'],
        'address'               => $event['address'],
        'latitude'              => (float)$event['latitude'],
        'longitude'             => (float)$event['longitude'],
        'start_datetime'        => $event['start_datetime'],
        'end_datetime'          => $event['end_datetime'],
        'sale_type_details'     => ['id' => $event['sale_type_id'], 'name' => $event['sale_type_name']],
        'average_rating'        => $event['average_rating'] !== null ? (float)$event['average_rating'] : 0,
        'photos'                => $photos,
        'item_category_details' => $categories,
        'comments'              => $comments,
    ]);
}

/**
 * POST /api/events
 * Creates a new event with optional photo uploads.
 */
function handleCreateEvent(): void {
    // Rate limiting: 20 write ops per 15 min, 10 uploads per hour
    checkRateLimit('write', 20, 900);
    if (!empty($_FILES['photos'])) {
        checkRateLimit('upload', 10, 3600);
    }

    // Parse the JSON event data sent as a form field
    $eventDataRaw = $_POST['eventData'] ?? '';
    if (empty($eventDataRaw)) {
        jsonResponse(['message' => 'Missing eventData field.'], 400);
    }
    $eventData = json_decode($eventDataRaw, true);
    if (!is_array($eventData)) {
        jsonResponse(['message' => 'Invalid eventData JSON.'], 400);
    }

    $title           = $eventData['title'] ?? null;
    $description     = $eventData['description'] ?? null;
    $address         = $eventData['address'] ?? null;
    $latitude        = $eventData['latitude'] ?? null;
    $longitude       = $eventData['longitude'] ?? null;
    $start_datetime  = $eventData['start_datetime'] ?? null;
    $end_datetime    = $eventData['end_datetime'] ?? null;
    $sale_type_id    = $eventData['sale_type_id'] ?? null;
    $item_categories = $eventData['item_categories'] ?? null;

    // Validation
    $missingFields = [];
    if (!$title)           $missingFields[] = 'title';
    if (!$description)     $missingFields[] = 'description';
    if (!$address)         $missingFields[] = 'address';
    if ($latitude === null)  $missingFields[] = 'latitude';
    if ($longitude === null) $missingFields[] = 'longitude';
    if (!$start_datetime)  $missingFields[] = 'start_datetime';
    if (!$end_datetime)    $missingFields[] = 'end_datetime';
    if (!$sale_type_id)    $missingFields[] = 'sale_type_id';
    if (empty($item_categories) || !is_array($item_categories)) $missingFields[] = 'item_categories';

    if (!empty($missingFields)) {
        jsonResponse(['message' => 'Missing or invalid required fields: ' . implode(', ', $missingFields) . '.', 'fields' => $missingFields], 400);
    }

    // Convert ISO 8601 to MySQL DATETIME
    $mysqlStart = date('Y-m-d H:i:s', strtotime($start_datetime));
    $mysqlEnd   = date('Y-m-d H:i:s', strtotime($end_datetime));

    $db = getDb();
    $db->beginTransaction();

    try {
        $publicId  = generateUuid();
        $editGuid  = generateUuid();

        $stmt = $db->prepare("
            INSERT INTO gapi_events (public_id, edit_guid, title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$publicId, $editGuid, $title, $description, $address, $latitude, $longitude, $mysqlStart, $mysqlEnd, $sale_type_id]);
        $newEventId = (int)$db->lastInsertId();

        // Insert categories
        $catStmt = $db->prepare('INSERT INTO gapi_event_item_categories (event_id, category_id) VALUES (?, ?)');
        foreach ($item_categories as $catId) {
            $catStmt->execute([$newEventId, (int)$catId]);
        }

        // Handle photo uploads
        $uploadedPhotoPaths = [];
        if (!empty($_FILES['photos'])) {
            $files = normalizeFilesArray($_FILES['photos']);
            $photoStmt = $db->prepare('INSERT INTO gapi_event_photos (event_id, file_path) VALUES (?, ?)');
            foreach ($files as $file) {
                $photoPath = saveUploadedPhoto($file);
                if ($photoPath) {
                    $photoStmt->execute([$newEventId, $photoPath]);
                    $uploadedPhotoPaths[] = $photoPath;
                }
            }
        }

        $db->commit();

        // Fetch sale type and category details for the response
        $stStmt = $db->prepare('SELECT id, name FROM gapi_sale_types WHERE id = ?');
        $stStmt->execute([$sale_type_id]);
        $saleType = $stStmt->fetch();

        $catIds = implode(',', array_fill(0, count($item_categories), '?'));
        $catDetailStmt = $db->prepare("SELECT id, name FROM gapi_item_categories WHERE id IN ($catIds)");
        $catDetailStmt->execute(array_map('intval', $item_categories));
        $categoryDetails = $catDetailStmt->fetchAll();

        jsonResponse([
            'public_id'             => $publicId,
            'edit_guid'             => $editGuid,
            'title'                 => $title,
            'description'           => $description,
            'address'               => $address,
            'latitude'              => (float)$latitude,
            'longitude'             => (float)$longitude,
            'start_datetime'        => $start_datetime,
            'end_datetime'          => $end_datetime,
            'sale_type_details'     => $saleType ?: null,
            'item_category_details' => $categoryDetails,
            'photos'                => $uploadedPhotoPaths,
            'average_rating'        => 0,
        ], 201);

    } catch (PDOException $e) {
        $db->rollBack();
        if (strpos($e->getMessage(), 'ER_NO_REFERENCED_ROW') !== false) {
            jsonResponse(['message' => 'Invalid data provided. One of the selected categories or the sale type does not exist.'], 400);
        }
        jsonResponse(['message' => 'An unexpected internal server error occurred while creating the event.'], 500);
    }
}

/**
 * GET /api/events/edit/:guid
 * Returns full event data for the edit form.
 */
function handleGetEventForEdit(string $guid): void {
    $db = getDb();

    $stmt = $db->prepare('SELECT * FROM gapi_events WHERE edit_guid = ?');
    $stmt->execute([$guid]);
    $event = $stmt->fetch();

    if (!$event) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $eventId = $event['id'];

    $photoStmt = $db->prepare('SELECT file_path FROM gapi_event_photos WHERE event_id = ?');
    $photoStmt->execute([$eventId]);
    $event['photos'] = array_column($photoStmt->fetchAll(), 'file_path');

    $catStmt = $db->prepare('SELECT category_id FROM gapi_event_item_categories WHERE event_id = ?');
    $catStmt->execute([$eventId]);
    $event['item_categories'] = array_column($catStmt->fetchAll(), 'category_id');

    jsonResponse($event);
}

/**
 * PUT /api/events/edit/:guid
 * Updates an existing event.
 */
function handleUpdateEvent(string $guid): void {
    checkRateLimit('write', 20, 900);

    // Support both multipart/form-data (with photos) and application/json
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (strpos($contentType, 'multipart/form-data') !== false) {
        $eventDataRaw = $_POST['eventData'] ?? '';
        $eventData = json_decode($eventDataRaw, true) ?: [];
    } else {
        $eventData = getJsonBody();
    }

    $title           = $eventData['title'] ?? null;
    $description     = $eventData['description'] ?? null;
    $address         = $eventData['address'] ?? null;
    $latitude        = $eventData['latitude'] ?? null;
    $longitude       = $eventData['longitude'] ?? null;
    $start_datetime  = $eventData['start_datetime'] ?? null;
    $end_datetime    = $eventData['end_datetime'] ?? null;
    $sale_type_id    = $eventData['sale_type_id'] ?? null;
    $item_categories = $eventData['item_categories'] ?? [];
    $existingPhotos  = $eventData['existingPhotos'] ?? [];

    if (!$title || !$description || !$address || $latitude === null || $longitude === null ||
        !$start_datetime || !$end_datetime || !$sale_type_id || empty($item_categories)) {
        jsonResponse(['message' => 'Missing required fields.'], 400);
    }

    $db = getDb();
    $db->beginTransaction();

    try {
        $eventStmt = $db->prepare('SELECT id FROM gapi_events WHERE edit_guid = ? AND is_deleted = FALSE');
        $eventStmt->execute([$guid]);
        $eventRow = $eventStmt->fetch();

        if (!$eventRow) {
            $db->rollBack();
            jsonResponse(['message' => 'Event not found or has been deleted.'], 404);
        }
        $eventId = (int)$eventRow['id'];

        $db->prepare("
            UPDATE gapi_events SET
                title = ?, description = ?, address = ?, latitude = ?, longitude = ?,
                start_datetime = ?, end_datetime = ?, sale_type_id = ?
            WHERE id = ?
        ")->execute([$title, $description, $address, $latitude, $longitude, $start_datetime, $end_datetime, $sale_type_id, $eventId]);

        // Replace categories
        $db->prepare('DELETE FROM gapi_event_item_categories WHERE event_id = ?')->execute([$eventId]);
        $catStmt = $db->prepare('INSERT INTO gapi_event_item_categories (event_id, category_id) VALUES (?, ?)');
        foreach ($item_categories as $catId) {
            $catStmt->execute([$eventId, (int)$catId]);
        }

        // Photos: delete removed ones
        $currentPhotoStmt = $db->prepare('SELECT file_path FROM gapi_event_photos WHERE event_id = ?');
        $currentPhotoStmt->execute([$eventId]);
        $currentPhotos = array_column($currentPhotoStmt->fetchAll(), 'file_path');

        $photosToDelete = array_diff($currentPhotos, $existingPhotos);
        if (!empty($photosToDelete)) {
            $delPlaceholders = implode(',', array_fill(0, count($photosToDelete), '?'));
            $delParams = array_merge([$eventId], array_values($photosToDelete));
            $db->prepare("DELETE FROM gapi_event_photos WHERE event_id = ? AND file_path IN ($delPlaceholders)")->execute($delParams);
            foreach ($photosToDelete as $photoPath) {
                $fullPath = __DIR__ . '/../../public/' . $photoPath;
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
            }
        }

        // Photos: add new uploads
        if (!empty($_FILES['photos'])) {
            checkRateLimit('upload', 10, 3600);
            $files = normalizeFilesArray($_FILES['photos']);
            $photoStmt = $db->prepare('INSERT INTO gapi_event_photos (event_id, file_path) VALUES (?, ?)');
            foreach ($files as $file) {
                $photoPath = saveUploadedPhoto($file);
                if ($photoPath) {
                    $photoStmt->execute([$eventId, $photoPath]);
                }
            }
        }

        $db->commit();
        jsonResponse(['message' => 'Event updated successfully.']);

    } catch (PDOException $e) {
        $db->rollBack();
        jsonResponse(['message' => 'Internal server error while updating event.'], 500);
    }
}

/**
 * DELETE /api/events/edit/:guid
 * Soft-deletes an event.
 */
function handleDeleteEvent(string $guid): void {
    checkRateLimit('write', 20, 900);
    $db = getDb();

    $stmt = $db->prepare('UPDATE gapi_events SET is_deleted = TRUE WHERE edit_guid = ?');
    $stmt->execute([$guid]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['message' => 'Event not found or no change needed.'], 404);
    }

    http_response_code(204);
    exit;
}

/**
 * POST /api/events/edit/:guid/undelete
 * Restores a soft-deleted event.
 */
function handleUndeleteEvent(string $guid): void {
    checkRateLimit('write', 20, 900);
    $db = getDb();

    $stmt = $db->prepare('UPDATE gapi_events SET is_deleted = FALSE WHERE edit_guid = ?');
    $stmt->execute([$guid]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['message' => 'Event not found or no change needed.'], 404);
    }

    jsonResponse(['message' => 'Event restored successfully.']);
}

/**
 * POST /api/events/edit/:guid/photos
 * Adds a single photo to an event.
 */
function handleAddPhoto(string $guid): void {
    checkRateLimit('write', 20, 900);
    checkRateLimit('upload', 10, 3600);

    if (empty($_FILES['photo'])) {
        jsonResponse(['message' => 'Error: No file selected or invalid file type.'], 400);
    }

    $db = getDb();
    $eventStmt = $db->prepare('SELECT id FROM gapi_events WHERE edit_guid = ?');
    $eventStmt->execute([$guid]);
    $eventRow = $eventStmt->fetch();

    if (!$eventRow) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $photoPath = saveUploadedPhoto($_FILES['photo']);
    if (!$photoPath) {
        jsonResponse(['message' => 'Error: jpeg|jpg|png|gif images only!'], 400);
    }

    $db->prepare('INSERT INTO gapi_event_photos (event_id, file_path) VALUES (?, ?)')->execute([$eventRow['id'], $photoPath]);
    jsonResponse(['message' => 'Photo added successfully.', 'filePath' => $photoPath], 201);
}

/**
 * POST /api/events/:id/flag-ended
 * Increments the ended_early_flags counter; soft-deletes at 3 flags.
 */
function handleFlagEnded(string $publicId): void {
    checkRateLimit('write', 20, 900);
    $db = getDb();

    $stmt = $db->prepare('UPDATE gapi_events SET ended_early_flags = ended_early_flags + 1 WHERE public_id = ?');
    $stmt->execute([$publicId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $flagStmt = $db->prepare('SELECT ended_early_flags FROM gapi_events WHERE public_id = ?');
    $flagStmt->execute([$publicId]);
    $row = $flagStmt->fetch();
    $flags = (int)$row['ended_early_flags'];

    if ($flags >= 3) {
        $db->prepare('UPDATE gapi_events SET is_deleted = TRUE WHERE public_id = ?')->execute([$publicId]);
        jsonResponse(['message' => 'Flag submitted. Event has been marked as ended.']);
    } else {
        jsonResponse(['message' => 'Flag submitted. ' . (3 - $flags) . ' more flag(s) needed to mark as ended.']);
    }
}

/**
 * POST /api/events/:id/ratings
 * Adds a rating (1–5) to an event.
 */
function handleAddRating(string $publicId): void {
    checkRateLimit('write', 20, 900);
    $body = getJsonBody();
    $rating = $body['rating'] ?? null;

    if (!is_numeric($rating) || (int)$rating < 1 || (int)$rating > 5) {
        jsonResponse(['message' => 'Rating must be a number between 1 and 5.'], 400);
    }

    $db = getDb();
    $eventStmt = $db->prepare('SELECT id FROM gapi_events WHERE public_id = ?');
    $eventStmt->execute([$publicId]);
    $eventRow = $eventStmt->fetch();

    if (!$eventRow) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $db->prepare('INSERT INTO gapi_event_ratings (event_id, rating_value) VALUES (?, ?)')->execute([$eventRow['id'], (int)$rating]);
    jsonResponse(['message' => 'Rating submitted successfully.'], 201);
}

/**
 * POST /api/events/:id/comments
 * Adds a comment to an event.
 */
function handleAddComment(string $publicId): void {
    checkRateLimit('write', 20, 900);
    $body = getJsonBody();
    $commentText = $body['comment_text'] ?? null;
    $userId      = $body['user_id'] ?? null;

    if (empty($commentText) || !is_string($commentText) || trim($commentText) === '') {
        jsonResponse(['message' => 'Comment must be a non-empty string.'], 400);
    }

    $db = getDb();
    $eventStmt = $db->prepare('SELECT id FROM gapi_events WHERE public_id = ?');
    $eventStmt->execute([$publicId]);
    $eventRow = $eventStmt->fetch();

    if (!$eventRow) {
        jsonResponse(['message' => 'Event not found.'], 404);
    }

    $stmt = $db->prepare('INSERT INTO gapi_event_comments (event_id, comment_text, user_id) VALUES (?, ?, ?)');
    $stmt->execute([$eventRow['id'], $commentText, $userId ?: null]);
    $insertId = (int)$db->lastInsertId();

    jsonResponse(['id' => $insertId, 'event_id' => $eventRow['id'], 'comment_text' => $commentText, 'user_id' => $userId], 201);
}

// ---------------------------------------------------------------
// File upload helpers
// ---------------------------------------------------------------

/**
 * Validates and saves an uploaded photo to public/uploads/.
 * Returns the relative path (e.g. "uploads/photos-12345.jpg") or null on failure.
 */
function saveUploadedPhoto(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    // Validate file type
    $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    $allowedExts  = ['jpg', 'jpeg', 'png', 'gif'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mime = mime_content_type($file['tmp_name']);

    if (!in_array($mime, $allowedMimes) || !in_array($ext, $allowedExts)) {
        return null;
    }

    // 10 MB limit
    if ($file['size'] > 10 * 1024 * 1024) {
        return null;
    }

    $uploadDir = __DIR__ . '/../../public/uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = 'photos-' . round(microtime(true) * 1000) . '.' . $ext;
    $dest = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        return null;
    }

    return 'uploads/' . $filename;
}

/**
 * Normalizes PHP's $_FILES array for multiple file uploads.
 * PHP structures multiple files differently from single files.
 *
 * @param array $filesField  e.g. $_FILES['photos']
 * @return array  Array of individual file arrays.
 */
function normalizeFilesArray(array $filesField): array {
    if (!is_array($filesField['name'])) {
        // Single file
        return [$filesField];
    }

    $files = [];
    foreach ($filesField['name'] as $i => $name) {
        $files[] = [
            'name'     => $name,
            'type'     => $filesField['type'][$i],
            'tmp_name' => $filesField['tmp_name'][$i],
            'error'    => $filesField['error'][$i],
            'size'     => $filesField['size'][$i],
        ];
    }
    return $files;
}
