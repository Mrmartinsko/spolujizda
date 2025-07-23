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

#### Problémy s CORS

**Problém**: `CORS policy: No 'Access-Control-Allow-Origin' header`
- Tento problém je již vyřešen v kódu
- Backend má nakonfigurován CORS pro localhost:3000

#### Problémy s databází

**Problém**: Database je zamčená
```bash
# Řešení: Ukončete všechny procesy používající databázi
# Smažte spolujizda.db a vytvořte novou
Remove-Item backend/spolujizda.db  # PowerShell
rm backend/spolujizda.db  # Linux/macOS

python -c "from app import db; db.create_all()"
```

### Pokročilé ladění

#### Zapnutí debug režimu
Debug režim je standardně zapnutý v `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5000)
```

#### Kontrola logů
```bash
# Backend logy jsou zobrazeny v terminálu
# Frontend logy - otevřete Developer Tools v prohlížeči (F12)
```

## 🚀 Produkční nasazení

### Příprava na produkci
1. **Změňte tajné klíče**:
   ```env
   SECRET_KEY=super-secure-production-key
   JWT_SECRET_KEY=jwt-production-secret
   DEBUG=False
   ```

2. **Použijte PostgreSQL místo SQLite**:
   ```env
   DATABASE_URL=postgresql://user:password@localhost/spolujizda
   ```

3. **Nastavte HTTPS**
4. **Použijte produkční web server** (Gunicorn + Nginx)

### Docker nasazení
```dockerfile
# Dockerfile pro backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```dockerfile
# Dockerfile pro frontend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 📊 Funkcionality aplikace

### ✅ Implementované funkce
- **Autentizace**: Registrace, přihlášení, JWT tokeny
- **Správa jízd**: Vytváření, editace, mazání, vyhledávání
- **Rezervace**: Žádosti o jízdu, přijímání/odmítání
- **Správa vozidel**: Přidávání a editace aut
- **Chat**: Komunikace mezi uživateli
- **Profily**: Zobrazení a editace uživatelských profilů
- **Hodnocení**: Systém hodnocení uživatelů

### 🎯 Hlavní komponenty
- **RideForm**: Formulář pro vytváření jízd
- **RideSearch**: Vyhledávání a filtrování jízd
- **RideList**: Zobrazení seznamu jízd
- **CarManager**: Správa vozidel
- **ReservationManager**: Správa rezervací
- **Chat**: Chatovací rozhraní
- **UserProfile**: Uživatelské profily

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
