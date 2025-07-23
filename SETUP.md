# 🛠 Návod k instalaci a spuštění aplikace Spolujízda

Tento dokument obsahuje detailní pokyny pro nastavení a spuštění aplikace Spolujízda na lokálním počítači.

## 📋 Systémové požadavky

### Minimální požadavky
- **Operační systém**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Python**: 3.9 nebo novější
- **Node.js**: 16.0 nebo novější
- **RAM**: 4 GB
- **Volné místo**: 2 GB

### Doporučené požadavky
- **Python**: 3.11+
- **Node.js**: 18.0+
- **RAM**: 8 GB
- **SSD**: pro rychlejší vývoj

## 🔧 Příprava vývojového prostředí

### 1. Instalace Python

#### Windows
1. Stáhněte Python z [python.org](https://python.org)
2. Při instalaci zaškrtněte "Add Python to PATH"
3. Ověřte instalaci:
   ```cmd
   python --version
   python -m pip --version
   ```

#### macOS
```bash
# Pomocí Homebrew (doporučeno)
brew install python

# Nebo stáhněte z python.org
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

### 2. Instalace Node.js

#### Windows/macOS
- Stáhněte z [nodejs.org](https://nodejs.org)
- Nainstalujte LTS verzi

#### Ubuntu/Debian
```bash
# Pomocí NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Ověřte instalaci:
```bash
node --version
npm --version
```

### 3. Instalace Git
- **Windows**: [git-scm.com](https://git-scm.com)
- **macOS**: `brew install git`
- **Ubuntu**: `sudo apt install git`

## 📥 Stažení a nastavení projektu

### 1. Klonování repozitáře
```bash
git clone https://github.com/your-username/spolujizda-pt.git
cd spolujizda-pt
```

### 2. Nastavení projektu

#### Vytvoření konfiguračních souborů (volitelné)
```bash
# Backend konfigurace
cd backend
echo SECRET_KEY=your-super-secret-key-here > .env
echo DATABASE_URL=sqlite:///spolujizda.db >> .env
echo JWT_SECRET_KEY=your-jwt-secret-key >> .env
echo DEBUG=True >> .env
```

## 🚀 Spuštění aplikace

### Metoda 1: Rychlé spuštění (Windows PowerShell)

```powershell
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py &

# Frontend (nový terminál)
cd ..\frontend
npm install
npm start
```

### Metoda 2: Krok za krokem

#### Backend (Flask)

1. **Přejděte do backend složky**
   ```bash
   cd backend
   ```

2. **Vytvořte virtuální prostředí**
   ```bash
   python -m venv venv
   ```

3. **Aktivujte virtuální prostředí**
   **Windows PowerShell:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   
   **Windows CMD:**
   ```cmd
   venv\Scripts\activate.bat
   ```
   
   **Linux/macOS:**
   ```bash
   source venv/bin/activate
   ```

4. **Nainstalujte závislosti**
   ```bash
   pip install -r requirements.txt
   ```

5. **Inicializujte databázi (automaticky při prvním spuštění)**
   ```bash
   python -c "from app import db; db.create_all()"
   ```

6. **Spusťte server**
   ```bash
   python app.py
   ```

Backend bude dostupný na: http://localhost:5000

#### Frontend (React)

1. **Otevřete nový terminál a přejděte do frontend složky**
   ```bash
   cd frontend
   ```

2. **Nainstalujte závislosti**
   ```bash
   npm install
   ```

3. **Spusťte development server**
   ```bash
   npm start
   ```

Frontend bude dostupný na: http://localhost:3000

## 🔍 Testování instalace

### 1. Kontrola backendu
```bash
# Test API endpoint
curl http://localhost:5000/api/auth/me

# Nebo v prohlížeči navštivte:
# http://localhost:5000/api/auth/me
```

### 2. Kontrola frontendu
Otevřete http://localhost:3000 v prohlížeči a ověřte:
- ✅ Stránka se načte bez chyb
- ✅ Formulář registrace funguje
- ✅ Přihlášení funguje
- ✅ Navigace mezi stránkami funguje

### 3. Test kompletní funkcionality
1. Zaregistrujte nový účet
2. Přihlaste se
3. Vytvořte novou jízdu
4. Vyhledejte jízdy
5. Proveďte rezervaci

## 🐛 Řešení problémů

### Běžné problémy a řešení

#### Backend nefunguje

**Problém**: `ModuleNotFoundError: No module named 'flask'`
```bash
# Řešení: Ujistěte se, že je aktivované virtuální prostředí
cd backend
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

**Problém**: `sqlite3.OperationalError: no such table`
```bash
# Řešení: Inicializujte databázi
python -c "from app import db; db.create_all()"
```

**Problém**: Port 5000 je obsazený
```bash
# Najděte proces používající port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Linux/macOS

# V app.py změňte port:
app.run(debug=True, port=5001)
```

#### Frontend nefunguje

**Problém**: `npm ERR! code ENOENT`
```bash
# Řešení: Ujistěte se, že Node.js je nainstalován
node --version
npm --version

# Pokud není, nainstalujte z nodejs.org
```

**Problém**: `Module not found` chyby
```bash
# Řešení: Smažte node_modules a reinstalujte
Remove-Item -Recurse -Force node_modules, package-lock.json  # PowerShell
rm -rf node_modules package-lock.json  # Linux/macOS

npm install
```

**Problém**: Bílá stránka nebo JavaScript chyby
1. Otevřete Developer Tools (F12)
2. Zkontrolujte Console a Network taby
3. Ujistěte se, že backend běží na portu 5000

## 📞 Podpora

Pokud máte problémy s instalací nebo spuštěním:

1. **Zkontrolujte FAQ** v tomto dokumentu
2. **Prohledejte Issues** na GitHubu
3. **Vytvořte nový Issue** s detailním popisem problému

### Template pro hlášení chyb
```
**Popis problému:**
Krátký popis toho, co se děje...

**Kroky k reprodukci:**
1. Spustil jsem backend
2. Spustil jsem frontend
3. Pokusil jsem se zaregistrovat

**Očekávané chování:**
Registrace by měla fungovat...

**Skutečné chování:**
Zobrazuje se chyba...

**Systémové informace:**
- OS: Windows 11
- Python: 3.11.0
- Node.js: 18.17.0
- Prohlížeč: Chrome 119

**Logy a chybová hlášení:**
```
[Zde vložte kompletní chybové hlášení]
```
```

---

✨ **Gratulujeme! Aplikace Spolujízda je nyní připravena k použití!** ✨

**Důležité odkazy:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API dokumentace: viz README.md

**První kroky:**
1. Otevřete http://localhost:3000
2. Klikněte na "Registrovat se"
3. Vytvořte si účet
4. Začněte používat aplikaci!
