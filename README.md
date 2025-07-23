# 🚗 Spolujízda - Platforma pro sdílenou dopravu

> Moderní webová aplikace pro sdílené jízdy autem - vyvinutá pro studenty a další uživatele, kteří chtějí efektivně sdílet cestu a snížit náklady na dopravu.

## 📋 Obsah
- [Popis aplikace](#popis-aplikace)
- [Funkce](#funkce)
- [Technologie](#technologie)
- [Instalace](#instalace)
- [Spuštění](#spuštění)
- [API dokumentace](#api-dokumentace)
- [Struktura databáze](#struktura-databáze)

## 🎯 Popis aplikace

Spolujízda je full-stack webová aplikace umožňující uživatelům:
- **Nabídnout jízdu** - řidiči mohou nabídnout volná místa ve svém autě
- **Vyhledat jízdu** - pasažéři mohou najít vhodnou cestu
- **Komunikovat** - integrovaný chat pro domluvu detailů
- **Hodnotit** - systém hodnocení pro budování důvěry
- **Spravovat** - kompletní správa jízd, rezervací a vozového parku

## ✨ Funkce

### 👤 Uživatelský účet
- ✅ Registrace a přihlášení s JWT autentizací
- ✅ Správa profilu (jméno, bio, profilová fotka)
- ✅ Změna hesla
- ✅ Správa vozového parku
- ✅ Blokování uživatelů
- ✅ Historie jízd

### 🚗 Správa jízd
- ✅ Vytvoření nové jízdy s detaily (místo, čas, cena, počet míst)
- ✅ Výběr vozidla z osobního vozového parku
- ✅ Správa rezervací (přijetí/odmítnutí pasažérů)
- ✅ Zrušení jízdy
- ✅ Přehled mých jízd s filtrováním podle stavu

### 🔍 Vyhledávání
- ✅ Pokročilé vyhledávání podle místa, data a dalších kritérií
- ✅ Zobrazení detailů jízdy včetně informací o řidiči a vozidle
- ✅ Rezervace místa s možností přidat poznámku

### 💬 Komunikace
- ✅ Skupinový chat pro každou jízdu
- ✅ Přístup pouze pro účastníky jízdy (řidič + přijatí pasažéři)
- ✅ Real-time aktualizace zpráv (polling)
- ✅ Osobní chat mezi uživateli

### ⭐ Hodnocení
- ✅ Hodnocení ostatních účastníků po skončení jízdy
- ✅ Oddělené hodnocení pro role řidiče a pasažéra
- ✅ Zobrazení průměrného hodnocení na profilu

### 🚙 Správa vozidel
- ✅ Přidávání, úprava a mazání vozidel
- ✅ Nastavení primárního vozidla
- ✅ Validace SPZ podle českých standardů

## 🛠 Technologie

### Backend
- **Python 3.13** - programovací jazyk
- **Flask** - webový framework
- **SQLAlchemy** - ORM pro databáze
- **SQLite** - databáze (vývoj) / PostgreSQL (produkce)
- **Flask-JWT-Extended** - JWT autentizace
- **Flask-CORS** - podpora CORS
- **bcrypt** - hashování hesel

### Frontend
- **React 18.2.0** - UI framework
- **React Router** - routing
- **Axios** - HTTP klient
- **Context API** - state management
- **CSS3** - stylování s moderním designem

### Vývojové nástroje
- **Git** - verzování kódu
- **npm** - správa závislostí pro frontend
- **pip** - správa závislostí pro backend
- **Virtual Environment** - izolace Python prostředí

## 🚀 Instalace

### Předpoklady
- Python 3.9+
- Node.js 16+
- Git

### 1. Klonování repozitáře
```bash
git clone https://github.com/your-username/spolujizda-pt.git
cd spolujizda-pt
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

## ▶️ Spuštění

### Backend
```bash
cd backend
venv\Scripts\activate  # Windows
python app.py
```
Backend běží na: `http://localhost:5000`

### Frontend
```bash
cd frontend
npm start
```
Frontend běží na: `http://localhost:3000`

## 📡 API dokumentace

### Autentizace
```
POST /api/auth/register - Registrace nového uživatele
POST /api/auth/login - Přihlášení uživatele
GET /api/auth/me - Získání informací o aktuálním uživateli
PUT /api/auth/change-password - Změna hesla
```

### Jízdy
```
GET /api/jizdy/vyhledat - Vyhledání jízd s filtry
GET /api/jizdy/moje - Moje jízdy (jako řidič i pasažér)
POST /api/jizdy - Vytvoření nové jízdy
PUT /api/jizdy/{id} - Úprava jízdy
DELETE /api/jizdy/{id} - Zrušení jízdy
```

### Rezervace
```
GET /api/rezervace/moje - Moje rezervace (odeslané i přijaté)
POST /api/rezervace - Vytvoření rezervace
PUT /api/rezervace/{id}/prijmout - Přijetí rezervace
PUT /api/rezervace/{id}/odmitnout - Odmítnutí rezervace
DELETE /api/rezervace/{id} - Zrušení rezervace
```

### Vozidla
```
GET /api/auta/moje - Moje vozidla
POST /api/auta - Přidání vozidla
PUT /api/auta/{id} - Úprava vozidla
DELETE /api/auta/{id} - Smazání vozidla
```

### Chat
```
GET /api/chat/jizda/{id} - Získání zpráv chatu jízdy
POST /api/chat/jizda/{id}/zprava - Odeslání zprávy do chatu jízdy
```

## 🗄 Struktura databáze

Aplikace používá následující hlavní entity:

- **Uzivatel** - uživatelské účty s autentizací
- **Profil** - rozšířené informace o uživateli
- **Auto** - vozidla uživatelů
- **Jizda** - nabídnuté jízdy s detaily
- **Rezervace** - rezervace míst v jízdách
- **Chat** - chatové místnosti
- **Zprava** - zprávy v chatech
- **Hodnoceni** - hodnocení mezi uživateli
- **Blokace** - blokování uživatelů

Detailní diagramy najdete v složce `docs/`:
- [Class Diagram](docs/classDiagram.md)
- [Database Diagram](docs/databaseDiagram.md)

## 🔐 Bezpečnost

- JWT tokeny pro autentizaci
- Bcrypt hashování hesel
- Validace vstupních dat
- CORS konfigurace
- Autorizace na úrovni endpointů

## 🎨 Design

Aplikace využívá moderní design s:
- Responzivní layout pro všechna zařízení
- Gradientní pozadí a moderní UI komponenty
- Intuitivní navigace a UX
- Konzistentní barevná paleta
- Smooth animace a přechody

## 📱 Mobilní podpora

Frontend je plně responzivní a optimalizovaný pro:
- Mobilní telefony (320px+)
- Tablety (768px+)
- Desktop (1024px+)

## 🔄 Budoucí vylepšení

- 🔄 WebSocket pro real-time chat
- 📧 Email notifikace
- 🗺 Integrace s mapami
- 📊 Rozšířené analytics
- 🌍 Lokalizace do více jazyků
- 🔔 Push notifikace
- 💳 Platební systém

## 🤝 Přispívání

1. Forkněte repozitář
2. Vytvořte feature branch (`git checkout -b feature/amazing-feature`)
3. Commitněte změny (`git commit -m 'Add amazing feature'`)
4. Pushněte do branch (`git push origin feature/amazing-feature`)
5. Otevřete Pull Request

## 📄 Licence

Tento projekt je licencován pod MIT licencí - viz [LICENSE](LICENSE) soubor pro detaily.

## 👥 Tým

- **Vývojář**: [Vaše jméno]
- **Kontakt**: your.email@example.com

---

*Vytvořeno s ❤️ pro komunitu student a všechny, kdo chtějí sdílet cestu*
Platforma pro sdílenou dopravu autem pro studenty (řidiči a pasažéři) do školy, kteří si mohou vytvářet jízdy, rezervovat si místo, komunikovat v chatu a hodnotit se navzájem. 

## 🚀 Rychlé spuštění

### Automatické spuštění (doporučeno)

**Windows:**
```cmd
# Double-click na start.bat
# nebo v PowerShell:
.\start.ps1
```

**Linux/macOS:**
```bash
./start.sh
```

### Manuální spuštění

Podrobný návod najdete v [SETUP.md](SETUP.md)

### Backend (Flask)
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

Aplikace běží na http://localhost:3000

## 🏗️ Architektura

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - ORM pro databázi
- **JWT** - Autentizace
- **SQLite** - Databáze (vývoj)
- **Flask-SocketIO** - WebSocket pro chat

### Frontend
- **React** - JavaScript framework
- **React Router** - Routing
- **Axios** - HTTP klient
- **Context API** - State management

## 📊 Databázový model

Viz [docs/databaseDiagram.md](docs/databaseDiagram.md) pro PlantUML diagram

## Frontend návrh
### Sidebar (to, co je vidět na všech stránkách)
- vlevo nahoře logo, které uživatele dostane na domovskou stránku
- pod tím: Nabídnout jízdu, Vyhledat jízdu, Moje jízdy, Chat, JízdaChat
- vpravo nahoře: vyhledat profil (lupa), oznámení (zvoneček), profil (fotka)
    - profil rozbalí Můj profil, Nastavení, Odhlásit se

### Domovská stránka
- možnost vyhledat jízdu
- pod tím nějaké info / fotka / ať to vypadá dobře

### Nabídnout jízdu
- odkud, kam, datum, čas odjezdu, čas příjezdu, počet míst, cena, poznámka, auto, možnost zadat více jízd najednou

### Vyhledat jízdu
- možnost vyhledat jízdu (stejné jako na domovské stránce) - odkud, kam, datum, počet pasažérů
- pod tím v budoucnu např. navrhované jízdy nebo tak něco :D

### Chat
- nahoře najít profil (jako na ig)
- pod tím prostě historie zpráv (jako v každé aplikaci, nejnovější nahoře)
- kliknutí na chat -> chat se ukáže (vpravo, vlevo je stále bar všech chatů), je možnost psát, normální chat

### JízdaChat
- výběr aktuální jízdy / staré jízdy
- pak stejně jako normální chat
- vyhledat podle datumu / řidiče / spolucestujících

### Moje jízdy
- výběr aktuální / staré jízdy
- zobrazují se moje zarezervované jízdy pod sebou (i ukázaný status - přijato, čeká na potvrzení, zamítnuto)
- na každou jízdu se dá kliknout a ukážou se podrobnosti, odkaz na chat. Celé info je pouze rozbalené, není to jiná stránka

### Můj profil
- údaje o sobě, fotka, atd.
- hodnocení jako řidič, jako spolucestující (počet hvězdiček, po kliknutí odkaz na Hodnocení)
- možnost upravit profil, historie jízd

### Cizí profil
- stejný jako Můj profil, ale není vidět historie jízd a upravit profil
- možnost zablokovat, poslat zprávu 

### Hodnocení
- nahoře možnost vybrat hodnocení jako řidič / pasažér
- jsou vidět všechna hodnocení (počet hvězdiček i text). Zobrazuje se od nejnovějšího, nicméně nahoře jsou ta hodnocení, která mají text, hodnocení bez textu jsou až pod nimi
- jsou tam statistiky (počet hodnocení, průměr...)

### Nastavení
- prostě nastavení (dark mode atd.)

### Co když se někdo připojí bez loginu
- uvidí vše stejně, ale kliknout může jen na vyhledat jízdu, a Nastavení vše ostatní jej hodí na login
- po kliknutí na profil se zobrazí Přihlásit, Registrovat

### Login
- klasický login - email, heslo, zapomenuté heslo, Nemáš účet?, pokračovat jako host

### Regitrace
- klasická registrace - jméno, prijimeni, mail, datum narozeni, fotka, atd. Neco povinne, neco ne. Heslo.
- registrace pujde pres mail - nutnost overit
