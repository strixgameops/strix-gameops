@echo off
setlocal enabledelayedexpansion

REM Check if passwords.txt already exists
if exist "passwords.txt" (
    echo Error: passwords.txt already exists!
    exit /b 1
)

echo Strix Password Generator
echo ==================================

REM Function to generate random password
call :generate_password MONGO_PASSWORD 32
call :generate_password POSTGRES_PASSWORD 32
call :generate_password REDIS_PASSWORD 32
call :generate_password SECRET_KEY 64
call :generate_password JWT_SECRET 64

echo.
echo Generated passwords (store securely):
echo MONGO_PASSWORD: !MONGO_PASSWORD!
echo POSTGRES_PASSWORD: !POSTGRES_PASSWORD!
echo REDIS_PASSWORD: !REDIS_PASSWORD!
echo SECRET_KEY: !SECRET_KEY!
echo JWT_SECRET: !JWT_SECRET!
echo.

REM Update docker-compose.yaml
if exist "docker-compose.yaml" (
    echo Updating docker-compose.yaml...
    
    powershell -Command "(Get-Content 'docker-compose.yaml') -replace 'YOUR_MONGO_PASSWORD', '!MONGO_PASSWORD!' -replace 'YOUR_POSTGRES_PASSWORD', '!POSTGRES_PASSWORD!' -replace 'YOUR_REDIS_PASSWORD', '!REDIS_PASSWORD!' -replace 'YOUR_PASSWORD', '!REDIS_PASSWORD!' | Set-Content 'docker-compose.yaml'"
    echo   Updated successfully
) else (
    echo Warning: docker-compose.yaml not found
)

REM Update MongoDB init script
if exist "seed\mongo-init\init-user.js" (
    echo Updating seed\mongo-init\init-user.js...
    
    powershell -Command "(Get-Content 'seed\mongo-init\init-user.js') -replace 'YOUR_MONGO_PASSWORD', '!MONGO_PASSWORD!' | Set-Content 'seed\mongo-init\init-user.js'"
    echo   Updated successfully
) else (
    echo Warning: seed\mongo-init\init-user.js not found
)

REM Update .env files
set "env_files=env\.env-strix-game-backend-analytics env\.env-strix-game-backend-cacher env\.env-strix-game-backend-deployment env\.env-strix-game-backend-geocoder env\.env-strix-game-backend-ingester env\.env-strix-game-backend-liveservices env\.env-strix-web env\.env-strix-web-backend .env-strix-game-backend-analytics .env-strix-game-backend-cacher .env-strix-game-backend-deployment .env-strix-game-backend-geocoder .env-strix-game-backend-ingester .env-strix-game-backend-liveservices .env-strix-web .env-strix-web-backend"

for %%f in (!env_files!) do (
    call :update_env_file "%%f"
)

REM Save passwords to file
echo Saving passwords to passwords.txt...
(
echo Strix Environment Passwords - Generated %date% %time%
echo ================================================
echo.
echo MongoDB Password: !MONGO_PASSWORD!
echo PostgreSQL Password: !POSTGRES_PASSWORD!
echo Redis Password: !REDIS_PASSWORD!
echo Encryption Secret Key: !SECRET_KEY!
echo JWT Secret: !JWT_SECRET!
echo.
echo Password generator will run again if no passwords.txt is available.
echo Existence of this file is used to know if passwords were generated.
echo You can leave it empty though.
) > passwords.txt

echo.
echo Password generation and update completed!
echo Passwords saved to passwords.txt
goto :eof

REM Function to generate secure password
:generate_password
set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "password="
set "length=%2"

for /l %%i in (1,1,%length%) do (
    set /a "rand=!random! %% 75"
    for %%j in (!rand!) do (
        set "password=!password!!chars:~%%j,1!"
    )
)

set "%1=!password!"
goto :eof

REM Function to update env file
:update_env_file
set "file=%~1"
if not exist "%file%" (
    echo Warning: %file% not found, skipping...
    goto :eof
)

echo Updating %file%...

REM Create temporary PowerShell script to avoid variable expansion issues
set "temp_ps=%temp%\update_env_%random%.ps1"
(
echo $content = Get-Content '%file%'
echo $content = $content -replace 'YOUR_MONGO_PASSWORD', '!MONGO_PASSWORD!'
echo $content = $content -replace 'YOUR_POSTGRES_PASSWORD', '!POSTGRES_PASSWORD!'
echo $content = $content -replace 'YOUR_REDIS_PASSWORD', '!REDIS_PASSWORD!'
echo $content = $content -replace 'YOUR_SECRET_KEY', '!SECRET_KEY!'
echo $content = $content -replace 'YOUR_JWT_SECRET', '!JWT_SECRET!'
echo $content ^| Set-Content '%file%'
) > "!temp_ps!"

powershell -ExecutionPolicy Bypass -File "!temp_ps!"
if errorlevel 1 (
    echo   Error: Failed to update %file%
) else (
    echo   Updated successfully
)

del "!temp_ps!" 2>nul
goto :eof