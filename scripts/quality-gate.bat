@echo off
node "%~dp0gapi.mjs" quality-gate %*
exit /b %errorlevel%
