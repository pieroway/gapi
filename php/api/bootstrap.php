<?php
/**
 * Shared API diagnostics and error handling.
 * Responses and logs omit exception messages that may contain credentials.
 */

ini_set('display_errors', '0');
header('Cache-Control: private, no-store');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');

$requestId = bin2hex(random_bytes(8));
require_once __DIR__ . '/runtime_settings.php';

function apiLog(string $message, ?Throwable $error = null): void {
    global $requestId;
    $detail = $error ? ' ' . get_class($error) . ' code=' . $error->getCode() : '';
    error_log(sprintf('[gapi-api][%s] %s%s', $requestId, $message, $detail));
}

function apiErrorResponse(string $message, int $status = 500, ?Throwable $error = null): void {
    global $requestId;
    http_response_code($status);
    header('Content-Type: application/json');

    $response = [
        'message' => $message,
        'request_id' => $requestId,
    ];


    echo json_encode($response);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    apiLog('Unhandled API exception.', $error);
    apiErrorResponse('The server could not complete the request.', 500, $error);
});

register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        apiLog('Fatal PHP error.');
        if (!headers_sent()) {
            apiErrorResponse('The server could not complete the request.', 500);
        }
    }
});

require_once __DIR__ . '/config.php';

require_once __DIR__ . '/validation.php';
