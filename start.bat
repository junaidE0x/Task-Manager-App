@echo off
echo Starting Task Manager...

:: Start the server in a new window
start "Task Manager Server" cmd /k "cd /d %~dp0backend && server.exe"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak > nul

:: Open the frontend in default browser
start "" "%~dp0frontend\index.html"

echo Server is running! Close the server window to stop it.