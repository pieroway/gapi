@echo off
node "%~dp0gapi.mjs" test-unit %*
exit /b %errorlevel%
