@echo off
echo =============================================================
echo 🚀 Launching CloudPulse Local Working Model (Port 3000)
echo =============================================================
echo.

if exist "C:\Users\muthu\AppData\Roaming\Antigravity\bin\agy-node.cmd" (
    start "" http://localhost:3000
    "C:\Users\muthu\AppData\Roaming\Antigravity\bin\agy-node.cmd" standalone-preview.js
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        start "" http://localhost:3000
        node standalone-preview.js
    ) else (
        echo [INFO] Opening index.html directly in browser...
        start "" index.html
    )
)
