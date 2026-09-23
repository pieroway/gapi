@echo off
node "%~dp0gapi.mjs" setup %*
exit /b %errorlevel%
