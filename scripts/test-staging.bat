@echo off
node "%~dp0gapi.mjs" test-staging %*
exit /b %errorlevel%
