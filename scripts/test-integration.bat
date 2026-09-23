@echo off
node "%~dp0gapi.mjs" test-integration %*
exit /b %errorlevel%
