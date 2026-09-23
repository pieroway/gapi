@echo off
node "%~dp0gapi.mjs" verify-deploy %*
exit /b %errorlevel%
