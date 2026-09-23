@echo off
node "%~dp0gapi.mjs" test-e2e %*
exit /b %errorlevel%
