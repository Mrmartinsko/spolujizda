# Spolujizda - PowerShell startup script s debugging
# Spousta backend a frontend servery s detailnim logovanim

# Nastaveni encoding na UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Spolujizda - Spoustim aplikaci" -ForegroundColor Yellow
Write-Host "   DEBUG REZIM ZAPNUTY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host

# Kontrola Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "OK Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "CHYBA: Python neni nainstalovany nebo neni v PATH" -ForegroundColor Red
    Write-Host "   Stahnete Python z https://python.org" -ForegroundColor Yellow
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

# Kontrola Node.js
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "OK NPM: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "CHYBA: Node.js neni nainstalovany nebo neni v PATH" -ForegroundColor Red
    Write-Host "   Stahnete Node.js z https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Nastavuji Backend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Set-Location backend

# Vytvor virtualni prostredi pokud neexistuje
if (!(Test-Path "venv")) {
    Write-Host "Vytvarim virtualni prostredi..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "OK Virtualni prostredi vytvoreno" -ForegroundColor Green
}

# Aktivuj virtualni prostredi
Write-Host "Aktivuji virtualni prostredi..." -ForegroundColor Yellow
try {
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "OK Virtualni prostredi aktivovano" -ForegroundColor Green
}
catch {
    Write-Host "VAROVANI Problem z aktivaci PowerShell scriptu, zkousim CMD..." -ForegroundColor Yellow
    cmd /c "venv\Scripts\activate.bat"
}

# Nainstaluj zavislosti
Write-Host "Instaluji Python zavislosti..." -ForegroundColor Yellow
$pipOutput = pip install -r requirements.txt 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Python zavislosti nainstalovany" -ForegroundColor Green
} else {
    Write-Host "CHYBA pri instalaci Python zavislosti:" -ForegroundColor Red
    Write-Host $pipOutput -ForegroundColor Red
}

# Vytvor databazi pokud neexistuje
if (!(Test-Path "spolujizda.db")) {
    Write-Host "Vytvarim databazi..." -ForegroundColor Yellow
    $dbOutput = python -c "from app import db; db.create_all()" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Databaze vytvorena" -ForegroundColor Green
    } else {
        Write-Host "CHYBA pri vytvareni databaze:" -ForegroundColor Red
        Write-Host $dbOutput -ForegroundColor Red
    }
}

# Test importu aplikace
Write-Host "Testuji import aplikace..." -ForegroundColor Yellow
$testOutput = python -c "from app import app; print('Import OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Import aplikace v poradku" -ForegroundColor Green
} else {
    Write-Host "CHYBA pri importu aplikace:" -ForegroundColor Red
    Write-Host $testOutput -ForegroundColor Red
    Write-Host "VAROVANI Backend se pravdepodobne nespusti spravne!" -ForegroundColor Yellow
}

Set-Location ..

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Nastavuji Frontend" -ForegroundColor Yellow  
Write-Host "========================================" -ForegroundColor Cyan

Set-Location frontend

# Kontrola package.json
if (!(Test-Path "package.json")) {
    Write-Host "CHYBA: package.json nenalezen!" -ForegroundColor Red
    Set-Location ..
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

# Nainstaluj Node.js zavislosti pokud neni node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "Instaluji Node.js zavislosti..." -ForegroundColor Yellow
    $npmOutput = npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Node.js zavislosti nainstalovany" -ForegroundColor Green
    } else {
        Write-Host "CHYBA pri instalaci Node.js zavislosti:" -ForegroundColor Red
        Write-Host $npmOutput -ForegroundColor Red
    }
}

# Test kompilace React aplikace
Write-Host "Testuji kompilaci React aplikace..." -ForegroundColor Yellow
$buildTest = npm run build --silent 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK React aplikace se kompiluje bez chyb" -ForegroundColor Green
} else {
    Write-Host "VAROVANI pri kompilaci React aplikace:" -ForegroundColor Yellow
    Write-Host $buildTest -ForegroundColor Yellow
}

Set-Location ..

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Spoustim servery" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Spust backend v novem okne s logovanim
Write-Host "Spoustim backend server..." -ForegroundColor Yellow
$backendPath = (Get-Location).Path + "\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; & '.\venv\Scripts\Activate.ps1'; Write-Host 'Backend startuje...' -ForegroundColor Green; python app.py"

# Cekej chvilku na start backendu
Start-Sleep 3

# Spust frontend v novem okne s logovanim
Write-Host "Spoustim frontend server..." -ForegroundColor Yellow
$frontendPath = (Get-Location).Path + "\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; Write-Host 'Frontend startuje...' -ForegroundColor Green; npm start"

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Aplikace se spousta!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host
Write-Host "Otevrely se dva nova okna s logy serveru" -ForegroundColor Yellow
Write-Host "   - Jedno okno pro backend (Python/Flask)" -ForegroundColor Gray
Write-Host "   - Jedno okno pro frontend (React)" -ForegroundColor Gray
Write-Host
Write-Host "Pro debugging:" -ForegroundColor Magenta
Write-Host "   - Sledujte chybove hlasky v okenech serveru" -ForegroundColor Gray
Write-Host "   - Otevrete Developer Tools v prohlizeci (F12)" -ForegroundColor Gray
Write-Host "   - Zkontrolujte Console a Network taby" -ForegroundColor Gray
Write-Host

# Cekej 10 sekund a otevri prohlizec
Write-Host "Cekam 10 sekund na start serveru..." -ForegroundColor Cyan
for ($i = 10; $i -gt 0; $i--) {
    Write-Host "   $i..." -ForegroundColor Gray
    Start-Sleep 1
}

Write-Host "Otviram prohlizec..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host
Write-Host "Aplikace spustena!" -ForegroundColor Green
Write-Host "Pro vice informaci viz README.md a SETUP.md" -ForegroundColor Gray
Write-Host
Write-Host "Pokud vidite bilou obrazovku:" -ForegroundColor Yellow
Write-Host "   1. Otevrete Developer Tools (F12)" -ForegroundColor Gray
Write-Host "   2. Zkontrolujte Console tab pro chyby" -ForegroundColor Gray
Write-Host "   3. Zkontrolujte Network tab pro API volani" -ForegroundColor Gray
Write-Host "   4. Zkontrolujte okna serveru pro logy" -ForegroundColor Gray
Write-Host
Write-Host "Pro zastaveni serveru zavrete okna serveru" -ForegroundColor Red
Write-Host "   nebo stisknete Ctrl+C v prislusnych oknech" -ForegroundColor Gray
Write-Host

Read-Host "Stisknete Enter pro ukonceni tohoto okna"
