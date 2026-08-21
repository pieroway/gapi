<?php
/**
 * Shared API diagnostics and error handling.
 * Detailed messages are logged server-side and are only returned when APP_DEBUG=1.
 */

$requestId = bin2hex(random_bytes(8));

function apiDebugEnabled(): bool {
    return getenv('APP_DEBUG') === '1' || ini_get('APP_DEBUG') === '1';
}

function apiLog(string $message, ?Throwable $error = null): void {
    global $requestId;
    $detail = $error ? ' ' . get_class($error) . ': ' . $error->getMessage() : '';
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
    if ($error && apiDebugEnabled()) {
        $response['debug'] = $error->getMessage();
    }

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
        apiLog(sprintf('Fatal PHP error at %s:%d: %s', $error['file'], $error['line'], $error['message']));
        if (!headers_sent()) {
            apiErrorResponse('The server could not complete the request.', 500);
        }
    }
});

require_once __DIR__ . '/config.php';
