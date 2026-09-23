@echo off
node "%~dp0gapi.mjs" test-load %*
exit /b %errorlevel%
