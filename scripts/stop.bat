@echo off
node "%~dp0gapi.mjs" stop %*
exit /b %errorlevel%
