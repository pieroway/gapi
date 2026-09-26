@echo off
node "%~dp0gapi.mjs" test-visual-update %*
exit /b %errorlevel%
