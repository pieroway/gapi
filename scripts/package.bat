@echo off
node "%~dp0gapi.mjs" package %*
exit /b %errorlevel%
