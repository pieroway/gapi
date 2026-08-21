<?php
/**
 * Reads runtime settings from the hosting environment or document-root .user.ini.
 */

function getRuntimeSetting(string $name): string {
    $value = getenv($name);
    if ($value !== false && $value !== '') {
        return trim($value);
    }

    $value = ini_get($name);
    if ($value !== false && $value !== '') {
        return trim($value);
    }

    $userIniPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.user.ini';
    if (!is_readable($userIniPath)) {
        return '';
    }

    $userIni = parse_ini_file($userIniPath, false, INI_SCANNER_RAW);
    return is_array($userIni) ? trim((string) ($userIni[$name] ?? '')) : '';
}
