@echo off
node "%~dp0gapi.mjs" build %*
exit /b %errorlevel%
