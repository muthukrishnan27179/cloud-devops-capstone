@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo 🚀 CloudPulse - Push Capstone Project to GitHub
echo ==============================================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git from https://git-scm.com/download/win or via winget:
    echo     winget install --id Git.Git -e --source winget
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking Git Repository status...
if not exist ".git" (
    echo Initializing fresh Git repository...
    git init
)

echo [2/4] Staging all capstone files...
git add .

echo [3/4] Creating commit...
git commit -m "feat: complete Cloud & DevOps Capstone Project (CloudPulse Platform)"

echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/muthukrishnan27179/cloud-devops-capstone.git): "

if "%REPO_URL%"=="" (
    echo.
    echo [WARNING] No URL entered! Files committed locally to git.
    echo When ready to push, run:
    echo     git remote add origin ^<YOUR_GITHUB_URL^>
    echo     git branch -M main
    echo     git push -u origin main
    echo.
    pause
    exit /b 0
)

echo [4/4] Setting main branch and pushing to GitHub...
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==============================================================================
    echo ✅ SUCCESS! Your Capstone project has been pushed to GitHub!
    echo Repository: %REPO_URL%
    echo Next step: Deploy to Render / Railway using DEPLOYMENT_GUIDE.md!
    echo ==============================================================================
) else (
    echo.
    echo [NOTICE] Push encountered an issue. Ensure your GitHub repo is created and you have authentication set up.
)

echo.
pause
