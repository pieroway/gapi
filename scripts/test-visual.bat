@echo off
node "%~dp0gapi.mjs" test-visual %*
exit /b %errorlevel%
