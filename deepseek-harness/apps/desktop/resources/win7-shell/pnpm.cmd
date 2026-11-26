@echo off
setlocal
set "npm_config_offline=true"
set "npm_config_update_notifier=false"
"%~dp0..\primary-runtime\dependencies\node\bin\node.exe" --expose-internals "%~dp0..\primary-runtime\dependencies\pnpm\bin\pnpm.mjs" %*
exit /b %errorlevel%
