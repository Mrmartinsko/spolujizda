# Debug script pro Spolujizda aplikaci
# Rychla diagnostika problemu

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "DIAGNOSTIKA SPOLUJIZDA APLIKACE" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host

# 1. Kontrola souboru
Write-Host "Kontrola souboru:" -ForegroundColor Yellow
$requiredFiles = @(
    "backend\app.py",
    "backend\requirements.txt", 
    "frontend\package.json",
    "frontend\src\index.js",
    "frontend\src\App.js"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   OK $file" -ForegroundColor Green
    } else {
        Write-Host "   CHYBI $file" -ForegroundColor Red
    }
}

Write-Host

# 2. Kontrola Python prostredi
Write-Host "Python prostredi:" -ForegroundColor Yellow
Set-Location backend
if (Test-Path "venv") {
    Write-Host "   OK Virtualni prostredi existuje" -ForegroundColor Green
    
    # Test aktivace
    try {
        & ".\venv\Scripts\Activate.ps1"
        $pythonPath = python -c "import sys; print(sys.executable)" 2>&1
        Write-Host "   OK Python cesta: $pythonPath" -ForegroundColor Green
        
        # Test importu Flask
        $flaskTest = python -c "import flask; print('Flask verze:', flask.__version__)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   OK $flaskTest" -ForegroundColor Green
        } else {
            Write-Host "   CHYBA Flask import chyba: $flaskTest" -ForegroundColor Red
        }
        
        # Test importu aplikace
        $appTest = python -c "from app import app; print('App import OK')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   OK Aplikace import OK" -ForegroundColor Green
        } else {
            Write-Host "   CHYBA Aplikace import chyba:" -ForegroundColor Red
            Write-Host "      $appTest" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "   CHYBA pri aktivaci prostredi: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   CHYBA Virtualni prostredi neexistuje" -ForegroundColor Red
}

Set-Location ..

Write-Host

# 3. Kontrola Node.js prostredi
Write-Host "Node.js prostredi:" -ForegroundColor Yellow
Set-Location frontend

if (Test-Path "node_modules") {
    Write-Host "   OK node_modules existuje" -ForegroundColor Green
    
    # Kontrola React
    $reactVersion = npm list react --depth=0 2>$null | Select-String "react@"
    if ($reactVersion) {
        Write-Host "   OK $reactVersion" -ForegroundColor Green
    } else {
        Write-Host "   CHYBA React neni nainstalovany" -ForegroundColor Red
    }
    
    # Test buildovani
    Write-Host "   Test build..." -ForegroundColor Cyan
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK Build uspesny" -ForegroundColor Green
    } else {
        Write-Host "   CHYBA Build chyba:" -ForegroundColor Red
        $buildOutput | Select-Object -First 10 | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
    }
    
} else {
    Write-Host "   CHYBA node_modules neexistuje - spustte 'npm install'" -ForegroundColor Red
}

Set-Location ..

Write-Host

# 4. Kontrola portu
Write-Host "Kontrola portu:" -ForegroundColor Yellow
$ports = @(3000, 5000)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "   OK Port $port je obsazeny (server bezi)" -ForegroundColor Green
    } else {
        Write-Host "   INFO Port $port je volny" -ForegroundColor Gray
    }
}

Write-Host

# 5. Doporuceni
Write-Host "DOPORUCENI PRO DEBUGGING:" -ForegroundColor Magenta
Write-Host "1. Spustte aplikaci pomoci start.ps1" -ForegroundColor White
Write-Host "2. Sledujte vystup v oknech serveru" -ForegroundColor White
Write-Host "3. V prohlizeci otevrete Developer Tools (F12)" -ForegroundColor White
Write-Host "4. Zkontrolujte Console pro JavaScript chyby" -ForegroundColor White
Write-Host "5. Zkontrolujte Network tab pro API volani" -ForegroundColor White
Write-Host

Write-Host "RUCNI SPUSTENI PRO DEBUGGING:" -ForegroundColor Magenta
Write-Host "Backend: cd backend && .\venv\Scripts\Activate.ps1 && python app.py" -ForegroundColor Gray
Write-Host "Frontend: cd frontend && npm start" -ForegroundColor Gray
Write-Host

Read-Host "Stisknete Enter pro ukonceni"
