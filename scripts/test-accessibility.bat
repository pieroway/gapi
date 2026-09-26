@echo off
node "%~dp0gapi.mjs" test-accessibility %*
exit /b %errorlevel%
