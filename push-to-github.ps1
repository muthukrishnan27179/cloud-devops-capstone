# ==============================================================================
# CloudPulse - PowerShell Git Deployment Script
# ==============================================================================

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "🚀 CloudPulse - Push Capstone Project to GitHub" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git was not found on your system." -ForegroundColor Red
    Write-Host "Please install Git or run: winget install --id Git.Git -e --source winget" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Checking Git Repository status..." -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
}

Write-Host "[2/4] Staging all files..." -ForegroundColor Cyan
git add .

Write-Host "[3/4] Creating commit..." -ForegroundColor Cyan
git commit -m "feat: complete Cloud & DevOps Capstone Project (CloudPulse Platform)"

Write-Host ""
$RepoUrl = Read-Host "Enter your GitHub Repository URL (e.g. https://github.com/username/cloud-devops-capstone.git)"

if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
    Write-Host "[WARNING] No URL provided. Commits saved locally on branch main." -ForegroundColor Yellow
    exit 0
}

Write-Host "[4/4] Configuring remote and pushing..." -ForegroundColor Cyan
git branch -M main
git remote remove origin 2>$null
git remote add origin $RepoUrl
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Green
    Write-Host "✅ SUCCESS! Capstone Project successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "URL: $RepoUrl" -ForegroundColor White
    Write-Host "See DEPLOYMENT_GUIDE.md to deploy live to Render in 2 minutes!" -ForegroundColor Cyan
    Write-Host "==============================================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to push to remote. Please verify repo URL and GitHub credentials." -ForegroundColor Red
}
