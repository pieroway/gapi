@echo off
node "%~dp0gapi.mjs" test-docker %*
exit /b %errorlevel%
