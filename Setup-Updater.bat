@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-updater-one-click.ps1"
set "SETUP_EXIT=%ERRORLEVEL%"
echo.
if not "%SETUP_EXIT%"=="0" (
  echo Updater setup did not finish. Read the error above.
) else (
  echo Updater signing setup completed.
)
echo.
pause
exit /b %SETUP_EXIT%
