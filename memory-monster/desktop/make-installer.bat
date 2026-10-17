@echo off
rem Builds the Windows installer. Double-click this file. Needs Node.js.
rem The installer is made in the dist folder: "Memory Monster Setup 0.1.0.exe".
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org ^(the LTS version^), then double-click this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing ^(first run only^)...
  call npm install
  if errorlevel 1 (
    echo The install did not finish. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

call npm run dist
if errorlevel 1 (
  echo The installer did not build. If the messages above mention a symbolic link, turn on Developer Mode in Windows Settings ^(Privacy and security, For developers^) and try again.
  pause
  exit /b 1
)

echo.
echo Done. The installer is in the dist folder.
pause
