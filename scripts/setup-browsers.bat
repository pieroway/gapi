@echo off
node "%~dp0gapi.mjs" setup-browsers %*
exit /b %errorlevel%
