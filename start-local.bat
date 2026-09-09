@echo off
setlocal enabledelayedexpansion
title INTEQC I/O Finder - Local Plant Server

echo ======================================================================
echo             INTEQC I/O FINDER - LOCAL PLANT SERVER
echo               Feed Mill Electrical & I/O System
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
    echo [1/3] Installing project dependencies (first run only)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies found.
)

:: 4. Check if production build exists
if not exist ".next" (
    echo [2/3] Building production bundle...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
) else (
    echo [2/3] Production build found.
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
echo     --^> http://localhost:3000
echo.
if defined LOCAL_IP (
    echo   * On Mobile / Tablet / Other PCs (Same Wi-Fi / Plant LAN):
    echo     --^> http://!LOCAL_IP!:3000
) else (
    echo   * To view on mobile, find your IPv4 with "ipconfig"
    echo     --^> http://^<YOUR-COMPUTER-IP^>:3000
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
