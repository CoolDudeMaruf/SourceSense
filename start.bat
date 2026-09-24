@echo off
echo ========================================================
echo SourceSense - Starting All Services...
echo ========================================================

echo [1/3] Starting Backend Server...
start "Backend API" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Frontend Server...
start "Frontend UI" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Starting Mock Sensor (delayed by 5 seconds to wait for backend)...
start "Mock Sensor" cmd /k "cd /d "%~dp0backend" && timeout /t 5 /nobreak && python mock_sensor.py"

echo.
echo All services have been launched in separate command windows!
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:5173
echo.
echo TIP: For the 8-node city-wide simulation, run start_city_sim.bat instead!
echo.
pause
