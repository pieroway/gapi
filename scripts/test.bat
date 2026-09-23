@echo off
node "%~dp0gapi.mjs" test %*
exit /b %errorlevel%
