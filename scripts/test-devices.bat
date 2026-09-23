@echo off
node "%~dp0gapi.mjs" test-devices %*
exit /b %errorlevel%
