@echo off
node "%~dp0gapi.mjs" test-audit %*
exit /b %errorlevel%
