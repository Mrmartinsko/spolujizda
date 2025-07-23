# Manualni spusteni pro debugging
# Spousta servery postupne s detailnim vystupem

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "MANUALNI SPUSTENI - DEBUG REZIM" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Tento skript spusti servery postupne s moznosti sledovat chyby" -ForegroundColor Gray
Write-Host

$choice = Read-Host "Co chcete spustit? (1=Backend, 2=Frontend, 3=Oba, 4=Diagnostika) [3]"
if ([string]::IsNullOrEmpty($choice)) { $choice = "3" }

switch ($choice) {
    "1" {
        Write-Host "Spoustim pouze Backend..." -ForegroundColor Yellow
        Set-Location backend
        
        Write-Host "Aktivuji virtualni prostredi..." -ForegroundColor Gray
        & ".\venv\Scripts\Activate.ps1"
        
        Write-Host "Spoustim Flask server..." -ForegroundColor Gray
        Write-Host "Sledujte chyby nize:" -ForegroundColor Magenta
        Write-Host "---" -ForegroundColor Gray
        
        python app.py
        
        Set-Location ..
    }
    
    "2" {
        Write-Host "Spoustim pouze Frontend..." -ForegroundColor Yellow
        Set-Location frontend
        
        Write-Host "Spoustim React development server..." -ForegroundColor Gray
        Write-Host "Sledujte chyby nize:" -ForegroundColor Magenta
        Write-Host "---" -ForegroundColor Gray
        
        npm start
        
        Set-Location ..
    }
    
    "3" {
        Write-Host "Spoustim Backend i Frontend..." -ForegroundColor Yellow
        
        # Spust backend v novem okne
        Write-Host "1. Spoustim Backend v novem okne..." -ForegroundColor Cyan
        $backendPath = (Get-Location).Path + "\backend"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; Write-Host 'BACKEND SERVER' -ForegroundColor Green; Write-Host '==============' -ForegroundColor Green; Write-Host 'Aktivuji virtualni prostredi...' -ForegroundColor Yellow; & '.\venv\Scripts\Activate.ps1'; Write-Host 'Spoustim Flask aplikaci...' -ForegroundColor Yellow; Write-Host 'URL: http://localhost:5000' -ForegroundColor Cyan; Write-Host '---' -ForegroundColor Gray; python app.py"

        Start-Sleep 2
        
        # Spust frontend v novem okne
        Write-Host "2. Spoustim Frontend v novem okne..." -ForegroundColor Cyan
        $frontendPath = (Get-Location).Path + "\frontend"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; Write-Host 'FRONTEND SERVER' -ForegroundColor Green; Write-Host '===============' -ForegroundColor Green; Write-Host 'Spoustim React development server...' -ForegroundColor Yellow; Write-Host 'URL: http://localhost:3000' -ForegroundColor Cyan; Write-Host '---' -ForegroundColor Gray; npm start"
        
        Write-Host
        Write-Host "OK Otevrely se 2 okna:" -ForegroundColor Green
        Write-Host "   - Backend (Flask) - http://localhost:5000" -ForegroundColor Cyan
        Write-Host "   - Frontend (React) - http://localhost:3000" -ForegroundColor Cyan
        Write-Host
        Write-Host "Sledujte chyby v prislusnych oknech" -ForegroundColor Magenta
        Write-Host "Cekam 10 sekund a otevru prohlizec..." -ForegroundColor Yellow
        
        Start-Sleep 10
        Start-Process "http://localhost:3000"
        
        Write-Host "Prohlizec otevren na http://localhost:3000" -ForegroundColor Green
    }
    
    "4" {
        Write-Host "Spoustim diagnostiku..." -ForegroundColor Yellow
        & ".\debug.ps1"
    }
    
    default {
        Write-Host "CHYBA Neplatna volba" -ForegroundColor Red
    }
}

Write-Host
Write-Host "INFO Pro zastaveni serveru zavrete prislusna okna nebo stisknete Ctrl+C" -ForegroundColor Gray
Read-Host "Stisknete Enter pro ukonceni"
