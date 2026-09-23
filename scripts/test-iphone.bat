@echo off
node "%~dp0gapi.mjs" test-iphone %*
exit /b %errorlevel%
