@echo off
node "%~dp0gapi.mjs" test-tooling %*
exit /b %errorlevel%
