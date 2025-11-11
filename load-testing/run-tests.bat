@echo off
REM Load testing execution script for Event Booking System (Windows)

echo ===========================================
echo Event Booking System - Load Testing Suite
echo ===========================================

REM Check if docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if k6 is installed
where k6 >nul 2>&1
if errorlevel 1 (
    echo Error: k6 is not installed. Please install k6 before running this script.
    echo Installation instructions are in load-testing/README.md
    pause
    exit /b 1
)

echo Starting load testing process...

REM Start the application stack in the background
echo Starting application stack...
docker-compose -f ..\infrastructure\docker-compose.dev.yml up --build -d

echo Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak

REM Check if services are running
echo Checking if services are running...
docker-compose -f ..\infrastructure\docker-compose.dev.yml ps

echo Running booking system load test...
echo ===========================================
k6 run booking-test.js

REM Capture the exit code
set exit_code=%errorlevel%

echo ===========================================
echo Load test completed with exit code: %exit_code%

REM Optional: Bring down the application stack
echo Shutting down application stack...
docker-compose -f ..\infrastructure\docker-compose.dev.yml down

echo Load testing process completed.
pause
exit /b %exit_code%