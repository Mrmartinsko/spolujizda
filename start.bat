@echo off
echo ========================================
echo    Spolujizda - Spoustim aplikaci
echo ========================================
echo.

REM Kontrola Python
python --version >nul 2>&1
if errorlevel 1 (
    echo CHYBA: Python neni nainstalovany nebo neni v PATH
    echo Navstivte https://python.org a stahněte Python
    pause
    exit /b 1
)

REM Kontrola Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo CHYBA: Node.js neni nainstalovany nebo neni v PATH
    echo Navstivte https://nodejs.org a stahněte Node.js
    pause
    exit /b 1
)

echo Kontrola zavislosy...
echo Python: 
python --version
echo Node.js: 
node --version
echo NPM: 
npm --version
echo.

echo ========================================
echo         Nastavuji Backend
echo ========================================

cd backend

REM Vytvor virtualní prostředí pokud neexistuje
if not exist "venv" (
    echo Vytvarim virtualni prostredi...
    python -m venv venv
)

REM Aktivuj virtuální prostředí
echo Aktivuji virtualni prostredi...
call venv\Scripts\activate.bat

REM Nainstaluj závislosti
echo Instaluji Python zavislosti...
pip install -r requirements.txt

REM Vytvoř databázi pokud neexistuje
if not exist "spolujizda.db" (
    echo Vytvarim databazi...
    python -c "from app import db; db.create_all()"
)

REM Spusť backend v novém okně
echo Spoustim backend server...
start "Spolujizda Backend" python app.py

cd ..

echo ========================================
echo         Nastavuji Frontend  
echo ========================================

cd frontend

REM Nainstaluj Node.js závislosti pokud není node_modules
if not exist "node_modules" (
    echo Instaluji Node.js zavislosti...
    npm install
)

REM Spusť frontend v novém okně
echo Spoustim frontend server...
start "Spolujizda Frontend" npm start

cd ..

echo.
echo ========================================
echo       Aplikace se spoustí!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Otevřete http://localhost:3000 v prohlížeči
echo.
echo Pro zastavení serveru zavřete okna
echo nebo stiskněte Ctrl+C v příslušných oknech
echo.

REM Čekej 3 sekundy a otevři prohlížeč
timeout /t 3 >nul
start http://localhost:3000

echo Aplikace spuštěna! Stiskněte libovolnou klávesu pro ukončení...
pause >nul
