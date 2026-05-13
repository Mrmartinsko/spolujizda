# Spolujizda - PowerShell startup script s debugging
# Spousta backend a frontend servery s detailnim logovanim

# Nastaveni encoding na UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Spolujízda - Spouštím aplikaci" -ForegroundColor Yellow
Write-Host "   DEBUG REŽIM ZAPNUTÝ" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host

# Kontrola Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "OK Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "CHYBA: Python není nainstalovaný nebo není v PATH" -ForegroundColor Red
    Write-Host "   Stáhněte Python z https://python.org" -ForegroundColor Yellow
    Read-Host "Stiskněte Enter pro ukončení"
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
    Write-Host "CHYBA: Node.js není nainstalovaný nebo není v PATH" -ForegroundColor Red
    Write-Host "   Stáhněte Node.js z https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Stiskněte Enter pro ukončení"
    exit 1
}

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Nastavuji Backend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Set-Location backend

# Vytvor virtualni prostredi pokud neexistuje
if (!(Test-Path "venv")) {
    Write-Host "Vytvářím virtuální prostředí..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "OK Virtuální prostředí vytvořeno" -ForegroundColor Green
}

# Aktivuj virtualni prostredi
Write-Host "Aktivuji virtuální prostředí..." -ForegroundColor Yellow
try {
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "OK Virtualni prostredi aktivovano" -ForegroundColor Green
}
catch {
    Write-Host "VAROVÁNÍ Problém s aktivací PowerShell skriptu, zkouším CMD..." -ForegroundColor Yellow
    cmd /c "venv\Scripts\activate.bat"
}

# Nainstaluj zavislosti
Write-Host "Instaluji Python závislosti..." -ForegroundColor Yellow
$pipOutput = pip install -r requirements.txt 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Python závislosti nainstalovány" -ForegroundColor Green
} else {
    Write-Host "CHYBA při instalaci Python závislostí:" -ForegroundColor Red
    Write-Host $pipOutput -ForegroundColor Red
}

# Vytvor databazi pokud neexistuje
if (!(Test-Path "spolujizda.db")) {
    Write-Host "Vytvářím databázi..." -ForegroundColor Yellow
    $dbOutput = python -c "from app import app; app.app_context().push(); from models import db; db.create_all()" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Databáze vytvořena" -ForegroundColor Green
    } else {
        Write-Host "CHYBA při vytváření databáze:" -ForegroundColor Red
        Write-Host $dbOutput -ForegroundColor Red
    }
}

# Test importu aplikace
Write-Host "Testuji import aplikace..." -ForegroundColor Yellow
$testOutput = python -c "from app import app; print('Import OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Import aplikace v pořádku" -ForegroundColor Green
} else {
    Write-Host "CHYBA pri importu aplikace:" -ForegroundColor Red
    Write-Host $testOutput -ForegroundColor Red
    Write-Host "VAROVÁNÍ Backend se pravděpodobně nespustí správně!" -ForegroundColor Yellow
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
    Read-Host "Stiskněte Enter pro ukončení"
    exit 1
}

# Nainstaluj Node.js zavislosti pokud neni node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "Instaluji Node.js závislosti..." -ForegroundColor Yellow
    $npmOutput = npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Node.js závislosti nainstalovány" -ForegroundColor Green
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
Write-Host "Spouštím backend server..." -ForegroundColor Yellow
$backendPath = (Get-Location).Path + "\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; & '.\venv\Scripts\Activate.ps1'; Write-Host 'Backend startuje...' -ForegroundColor Green; python app.py"

# Cekej chvilku na start backendu
Start-Sleep 3

# Spust frontend v novem okne s logovanim
Write-Host "Spouštím frontend server..." -ForegroundColor Yellow
$frontendPath = (Get-Location).Path + "\frontend"
# Nastavit BROWSER=none zabranuje automatickemu otevreni prohlizece
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; `$env:BROWSER='none'; Write-Host 'Frontend startuje...' -ForegroundColor Green; npm start"

Write-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Aplikace se spouští!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host
Write-Host "Otevřela se dvě nová okna s logy serveru" -ForegroundColor Yellow
Write-Host "   - Jedno okno pro backend (Python/Flask)" -ForegroundColor Gray
Write-Host "   - Jedno okno pro frontend (React)" -ForegroundColor Gray
Write-Host
Write-Host "Pro debugging:" -ForegroundColor Magenta
Write-Host "   - Sledujte chybové hlášky v oknech serveru" -ForegroundColor Gray
Write-Host "   - Otevřete Developer Tools v prohlížeči (F12)" -ForegroundColor Gray
Write-Host "   - Zkontrolujte Console a Network taby" -ForegroundColor Gray
Write-Host

# Cekej 10 sekund na start serveru...
Write-Host "Čekám 10 sekund na start serveru..." -ForegroundColor Cyan
for ($i = 10; $i -gt 0; $i--) {
    Write-Host "   $i..." -ForegroundColor Gray
    Start-Sleep 1
}

Write-Host "Otevírám prohlížeč..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host
Write-Host "Aplikace spuštěna!" -ForegroundColor Green
Write-Host "Pro více informací viz README.md a SETUP.md" -ForegroundColor Gray
Write-Host
Write-Host "Pokud vidíte bílou obrazovku:" -ForegroundColor Yellow
Write-Host "   1. Otevřete Developer Tools (F12)" -ForegroundColor Gray
Write-Host "   2. Zkontrolujte Console tab pro chyby" -ForegroundColor Gray
Write-Host "   3. Zkontrolujte Network tab pro API volání" -ForegroundColor Gray
Write-Host "   4. Zkontrolujte okna serveru pro logy" -ForegroundColor Gray
Write-Host
Write-Host "Pro zastavení serveru zavřete okna serveru" -ForegroundColor Red
Write-Host "   nebo stiskněte Ctrl+C v příslušných oknech" -ForegroundColor Gray
Write-Host

Read-Host "Stiskněte Enter pro ukončení tohoto okna"
