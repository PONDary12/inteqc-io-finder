@echo off
setlocal enabledelayedexpansion
title INTEQC I/O Finder - Local Plant Server

echo ======================================================================
echo             INTEQC I/O FINDER - LOCAL PLANT SERVER
echo              Feed Mill Electrical and I/O System
echo ======================================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18 or 20 from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Navigate to Next.js app directory
cd /d "%~dp0io-finder"
if not exist "package.json" (
    echo [ERROR] package.json not found in io-finder directory!
    pause
    exit /b 1
)

:: 3. Check node_modules
if not exist "node_modules" (
    echo [1/3] Installing project dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies found.
)

:: 4. Check if production build exists and is up-to-date
set "NEED_BUILD=0"
if not exist ".next" set "NEED_BUILD=1"

set "CURRENT_COMMIT=unknown"
for /f "tokens=*" %%c in ('git rev-parse --short HEAD 2^>nul') do set "CURRENT_COMMIT=%%c"

set "LOCAL_MODIFIED="
for /f "tokens=*" %%m in ('git status --porcelain src public 2^>nul') do set "LOCAL_MODIFIED=1"

if defined LOCAL_MODIFIED (
    echo [INFO] Detected local code edits in src/public. Rebuilding...
    set "NEED_BUILD=1"
) else (
    if exist ".next\BUILD_COMMIT" (
        set /p LAST_BUILD_COMMIT=<".next\BUILD_COMMIT"
        if not "!LAST_BUILD_COMMIT!"=="!CURRENT_COMMIT!" (
            echo [INFO] Detected new Git update [Last build: !LAST_BUILD_COMMIT! vs Current: !CURRENT_COMMIT!].
            set "NEED_BUILD=1"
        )
    ) else (
        if exist ".next" (
            echo [INFO] Build version marker missing. Rebuilding latest code...
            set "NEED_BUILD=1"
        )
    )
)

if "!NEED_BUILD!"=="1" (
    echo [2/3] Building latest production bundle...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
    if not "!CURRENT_COMMIT!"=="unknown" (
        echo !CURRENT_COMMIT!>".next\BUILD_COMMIT"
    )
) else (
    echo [2/3] Production build is up-to-date [commit: !CURRENT_COMMIT!].
)

:: 5. Detect Local IPv4 Address
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined LOCAL_IP (
        set "temp_ip=%%a"
        set "temp_ip=!temp_ip: =!"
        set "LOCAL_IP=!temp_ip!"
    )
)

echo [3/3] Server starting...
echo.
echo ======================================================================
echo   ONLINE! INTEQC I/O Finder is running successfully.
echo ======================================================================
echo.
echo   * On this computer:
echo     http://localhost:3000
echo.
if defined LOCAL_IP (
    echo   * On Mobile / Tablet / Other PCs [Same Wi-Fi or Plant LAN]:
    echo     http://!LOCAL_IP!:3000
) else (
    echo   * To view on mobile, find your IPv4 with "ipconfig":
    echo     http://YOUR-IP:3000
)
echo.
echo ======================================================================
echo   Tips:
echo   1. Keep this window OPEN while using the system.
echo   2. Technicians on factory Wi-Fi can open the URL directly on mobile.
echo   3. Press Ctrl+C in this window to stop the server.
echo ======================================================================
echo.

call npm run start

pause
