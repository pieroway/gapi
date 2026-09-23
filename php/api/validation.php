<?php
/** Bounded server-side validation shared by the active PHP endpoints. */
function validText($value, int $max, bool $required = true): bool {
    return is_string($value) && preg_match('//u', $value) === 1 && strlen($value) <= $max && (!$required || trim($value) !== '');
}
function requireUuid($value): void {
    if (!is_string($value) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iD', $value)) {
        jsonResponse(['message' => 'Invalid identifier.'], 400);
    }
}
function parseApiDate($value): ?string {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})?$/D', $value)) return null;
    try {
        $date = new DateTimeImmutable($value, new DateTimeZone('UTC'));
        $errors = DateTimeImmutable::getLastErrors();
        if ($errors && ($errors['warning_count'] || $errors['error_count'])) return null;
        if ((int)$date->format('Y') < 1000 || (int)$date->format('Y') > 9999) return null;
        return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $error) { return null; }
}
function validateEvent(array $data): array {
    $fields = [];
    foreach (['title'=>255, 'description'=>5000, 'address'=>255] as $key=>$max) {
        if (!validText($data[$key] ?? null, $max)) $fields[] = $key;
    }
    foreach (['latitude'=>90, 'longitude'=>180] as $key=>$max) {
        $v = $data[$key] ?? null;
        if ((!is_int($v) && !is_float($v)) || !is_finite((float)$v) || abs($v) > $max) $fields[] = $key;
    }
    $start = parseApiDate($data['start_datetime'] ?? null);
    $end = parseApiDate($data['end_datetime'] ?? null);
    if ($start === null) $fields[] = 'start_datetime';
    if ($end === null || ($start !== null && $end <= $start)) $fields[] = 'end_datetime';
    if (!is_int($data['sale_type_id'] ?? null) || $data['sale_type_id'] < 1) $fields[] = 'sale_type_id';
    $categories = $data['item_categories'] ?? null;
    if (!is_array($categories) || !array_is_list($categories) || count($categories) < 1 || count($categories) > 50 ||
        count(array_filter($categories, fn($id)=>is_int($id) && $id>0)) !== count($categories) || count(array_unique($categories, SORT_REGULAR)) !== count($categories)) $fields[] = 'item_categories';
    $photos = $data['existingPhotos'] ?? [];
    if (!is_array($photos) || !array_is_list($photos) || count($photos)>10 || count(array_filter($photos, fn($p)=>is_string($p) && preg_match('#^uploads/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif)$#D', $p))) !== count($photos)) $fields[] = 'existingPhotos';
    if ($fields) jsonResponse(['message'=>'Invalid event fields.', 'fields'=>$fields], 400);
    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM gapi_sale_types WHERE id=?');$stmt->execute([$data['sale_type_id']]);
    if (!$stmt->fetch()) jsonResponse(['message'=>'Unknown sale type.'],400);
    $stmt = $db->prepare('SELECT COUNT(*) FROM gapi_item_categories WHERE id IN ('.implode(',',array_fill(0,count($categories),'?')).')');$stmt->execute($categories);
    if ((int)$stmt->fetchColumn() !== count($categories)) jsonResponse(['message'=>'Unknown category.'],400);
    $data['start_datetime']=$start;$data['end_datetime']=$end;
    return $data;
}
