#!/bin/bash

echo "========================================"
echo "   Spolujízda - Spouštím aplikaci"
echo "========================================"
echo

# Kontrola Python
if ! command -v python3 &> /dev/null; then
    echo "CHYBA: Python3 není nainstalovaný"
    echo "Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "macOS: brew install python"
    exit 1
fi

# Kontrola Node.js
if ! command -v node &> /dev/null; then
    echo "CHYBA: Node.js není nainstalovaný"
    echo "Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "macOS: brew install node"
    exit 1
fi

echo "Kontrola závislostí..."
echo "Python: $(python3 --version)"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo

echo "========================================"
echo "         Nastavuji Backend"
echo "========================================"

cd backend

# Vytvoř virtuální prostředí pokud neexistuje
if [ ! -d "venv" ]; then
    echo "Vytvářím virtuální prostředí..."
    python3 -m venv venv
fi

# Aktivuj virtuální prostředí
echo "Aktivuji virtuální prostředí..."
source venv/bin/activate

# Nainstaluj závislosti
echo "Instaluji Python závislosti..."
pip install -r requirements.txt

# Vytvoř databázi pokud neexistuje
if [ ! -f "spolujizda.db" ]; then
    echo "Vytvářím databázi..."
    python -c "from app import db; db.create_all()"
fi

# Spusť backend na pozadí
echo "Spouštím backend server..."
python app.py &
BACKEND_PID=$!

cd ..

echo "========================================"
echo "         Nastavuji Frontend"
echo "========================================"

cd frontend

# Nainstaluj Node.js závislosti pokud není node_modules
if [ ! -d "node_modules" ]; then
    echo "Instaluji Node.js závislosti..."
    npm install
fi

# Spusť frontend na pozadí
echo "Spouštím frontend server..."
npm start &
FRONTEND_PID=$!

cd ..

echo
echo "========================================"
echo "       Aplikace se spouští!"
echo "========================================"
echo
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo
echo "Otevřete http://localhost:3000 v prohlížeči"
echo
echo "Pro zastavení serveru stiskněte Ctrl+C"
echo

# Čekej 3 sekundy a zkus otevřít prohlížeč
sleep 3

# Pokus o otevření prohlížeče
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
else
    echo "Automatické otevření prohlížeče není podporováno"
    echo "Ručně otevřete: http://localhost:3000"
fi

# Čekej na Ctrl+C
echo "Aplikace běží... Stiskněte Ctrl+C pro ukončení"

cleanup() {
    echo
    echo "Ukončuji servery..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Servery ukončeny."
    exit 0
}

trap cleanup INT

# Čekej nekonečně
wait
