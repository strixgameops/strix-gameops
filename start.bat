@echo off
echo Generating passwords and deploying with Docker...
echo.

echo.
echo Starting Docker deployment...
docker-compose up --build -d
if errorlevel 1 (
    echo Error: Docker deployment failed
    pause
    exit /b 1
)