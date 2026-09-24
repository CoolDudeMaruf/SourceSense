@echo off
echo ================================================================
echo  SourceSense — City Simulator (8 Nodes, Real-time AI Actions)
echo ================================================================
echo.
echo  This will start:
echo    [1] Backend API       (http://localhost:8000)
echo    [2] Frontend UI       (http://localhost:5173)
echo    [3] 8-Node City Sim   (continuous readings, 5s interval)
echo.
echo  Each node has a unique pollution scenario that triggers different
echo  AI actions (SPRAY, Traffic Advisory, Fire Control, Safety Block...)
echo.

echo [1/3] Starting Backend Server...
start "SourceSense Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Frontend UI...
start "SourceSense Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Starting 8-Node City Sensor Simulator (waits 8s for backend)...
start "City Sensor Sim" cmd /k "cd /d "%~dp0backend" && timeout /t 8 /nobreak && python city_sensors.py --loop --interval 5"

echo.
echo  ================================================================
echo   All services launched!
echo   Dashboard: http://localhost:5173
echo   API Docs:  http://localhost:8000/docs
echo  ================================================================
echo.
pause
