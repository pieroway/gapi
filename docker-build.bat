@echo off
REM =================================================================
REM  docker-build.bat
REM  Rebuilds and restarts the PHP/Docker stack from the project root.
REM  Database data is preserved (volumes are NOT removed).
REM
REM  Usage:
REM    docker-build.bat          -- normal rebuild (keeps DB)
REM    docker-build.bat --reset  -- rebuild AND wipe the database
REM =================================================================

set COMPOSE_FILE=dist-php/docker-compose.yml
set ENV_FILE=dist-php/.env

if "%~1"=="--reset" (
    echo [docker-build] Stopping containers and removing volumes ^(DB will be reset^)...
    docker compose -f %COMPOSE_FILE% --env-file %ENV_FILE% down -v
) else (
    echo [docker-build] Stopping containers ^(DB data preserved^)...
    docker compose -f %COMPOSE_FILE% --env-file %ENV_FILE% down
)

echo [docker-build] Building and starting containers...
docker compose -f %COMPOSE_FILE% --env-file %ENV_FILE% up --build -d

echo [docker-build] Done. App running at http://localhost:8080
