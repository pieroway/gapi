@echo off
node "%~dp0gapi.mjs" test-static %*
exit /b %errorlevel%
