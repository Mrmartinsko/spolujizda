# Spolujízda - PowerShell startup script
# Spouští backend a frontend servery

# Nastavení encoding na UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Spolujizda - Spoustim aplikaci" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host

# Kontrola Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "CHYBA: Python neni nainstalovany nebo neni v PATH" -ForegroundColor Red
    Write-Host "Stahnete Python z https://python.org" -ForegroundColor Yellow
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

# Kontrola Node.js
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "NPM: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "CHYBA: Node.js neni nainstalovany nebo neni v PATH" -ForegroundColor Red
    Write-Host "Stahnete Node.js z https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Nastavuji Backend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Set-Location backend

# Vytvoř virtuální prostředí pokud neexistuje
if (!(Test-Path "venv")) {
    Write-Host "Vytvarim virtualni prostredi..." -ForegroundColor Yellow
    python -m venv venv
}

# Aktivuj virtuální prostředí
Write-Host "Aktivuji virtualni prostredi..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Nainstaluj závislosti
Write-Host "Instaluji Python zavislosti..." -ForegroundColor Yellow
pip install -r requirements.txt

# Vytvoř databázi pokud neexistuje
if (!(Test-Path "spolujizda.db")) {
    Write-Host "Vytvarim databazi..." -ForegroundColor Yellow
    python -c "from app import db; db.create_all()"
}

# Spusť backend v novém okně
Write-Host "Spoustim backend server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    & ".\venv\Scripts\Activate.ps1"
    python app.py
} -ArgumentList (Get-Location).Path

Set-Location ..

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Nastavuji Frontend" -ForegroundColor Yellow  
Write-Host "========================================" -ForegroundColor Cyan

Set-Location frontend

# Nainstaluj Node.js závislosti pokud není node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "Instaluji Node.js zavislosti..." -ForegroundColor Yellow
    npm install
}

# Spusť frontend v novém okně
Write-Host "Spoustim frontend server..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    npm start
} -ArgumentList (Get-Location).Path

Set-Location ..

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Aplikace se spousta!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host
Write-Host "Otevrete http://localhost:3000 v prohlizeci" -ForegroundColor Yellow
Write-Host
Write-Host "Pro zastaveni serveru stisknete Ctrl+C" -ForegroundColor Yellow
Write-Host

# Čekej 5 sekund a otevři prohlížeč
Start-Sleep 5
Start-Process "http://localhost:3000"

Write-Host "Aplikace spustena! Stisknete Ctrl+C pro ukonceni..." -ForegroundColor Green

# Čekej na Ctrl+C
try {
    while ($true) {
        Start-Sleep 1
        
        # Zkontroluj stav jobů
        if ($backendJob.State -eq "Failed") {
            Write-Host "Backend se nepodarilo spustit!" -ForegroundColor Red
            Receive-Job $backendJob
            break
        }
        
        if ($frontendJob.State -eq "Failed") {
            Write-Host "Frontend se nepodarilo spustit!" -ForegroundColor Red
            Receive-Job $frontendJob
            break
        }
    }
}
finally {
    Write-Host "Ukoncuji servery..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Servery ukonceny." -ForegroundColor Green
}
