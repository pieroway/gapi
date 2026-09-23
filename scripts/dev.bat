@echo off
node "%~dp0gapi.mjs" dev %*
exit /b %errorlevel%
