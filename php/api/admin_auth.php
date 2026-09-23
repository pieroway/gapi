<?php
/** Server-side bearer authorization for administrative operations. */
function requireAdmin(): void {
    $expected = getRuntimeSetting('ADMIN_TOKEN');
    if ($expected === '') {
        jsonResponse(['message' => 'Admin access is not configured on this server.'], 503);
    }

    // Apache rewrite forwarding supports CGI/FastCGI shared hosting as well as mod_php.
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer[ \t]+([^\s,]+)$/iD', $authorization, $matches) ||
        !hash_equals($expected, $matches[1])) {
        header('WWW-Authenticate: Bearer realm="gapi-admin"');
        jsonResponse(['message' => 'Unauthorized. Invalid or missing admin token.'], 401);
    }
}
