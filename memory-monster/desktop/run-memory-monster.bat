@echo off
rem Starts Memory Monster for Windows. Double-click this file.
rem The first run installs what it needs and builds the site, which takes a few minutes.
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

if not exist site\overlay.html (
  echo Building the site ^(first run only^)...
  call npm run build:site
  if errorlevel 1 (
    echo The build did not finish. The messages above say why.
    pause
    exit /b 1
  )
)

echo.
echo Memory Monster is starting. Look for its icon in the system tray, bottom-right near the clock.
echo Close this window and he keeps running. Quit from the tray menu to stop him.
call npm start
