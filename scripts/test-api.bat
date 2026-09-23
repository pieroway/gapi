@echo off
node "%~dp0gapi.mjs" test-api %*
exit /b %errorlevel%
