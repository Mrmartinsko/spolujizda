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

## ✨ Implemented Features

### 👤 Uživatelský účet
- ✅ Registrace a přihlášení s JWT autentizací
- ✅ Email verifikace při registraci
- ✅ Resetování hesla přes email
- ✅ Správa profilu (jméno, příjmení, bio)
- ✅ Změna hesla
- ✅ Veřejné profily s hodnocením

### 🚗 Správa jízd
- ✅ Vytvoření nové jízdy s detaily (odkud, kam, čas, cena, počet míst)
- ✅ Podpora mezistanic na trase (waypoints s pořadím)
- ✅ Výběr vozidla z osobního vozového parku
- ✅ Editace a zrušení jízdy (jen vlastníka)
- ✅ Filtry: aktivní, všechny, ukončené, zrušené
- ✅ Import/export mezistanic

### 🔍 Vyhledávání
- ✅ Pokročilé vyhledávání podle trasy (odkud, kam), data a počtu míst
- ✅ Full/partial match vyhledávání přes geocoding
- ✅ Detaily jízdy včetně informací o řidiči a vozidle
- ✅ Rezervace místa s poznámkou a výběrem doprovodních pasažérů

### 💬 Komunikace
- ✅ Skupinový chat pro každou jízdu (přístup jen pro řidiče + přijaté pasažéry)
- ✅ Osobní chat mezi uživateli
- ✅ Aktualizace zpráv (polling každých 3 sekundy)
- ✅ Historie zpráv s paginací

### ⭐ Hodnocení
- ✅ Hodnocení ostatních účastníků (1-5 hvězdičky)
- ✅ Textový komentář k hodnocení
- ✅ Oddělené hodnocení pro role řidiče a pasažéra
- ✅ Pending ratings po ukončení jízdy
- ✅ Veřejné zobrazení průměrného hodnocení na profilu

### 🚙 Správa vozidel
- ✅ Přidávání, úprava a softmazání vozidel
- ✅ Nastavení primárního vozidla
- ✅ Validace SPZ podle českých standardů
- ✅ Nahrazení vozidla v aktivních jízdách

### 🚫 Blokování a bezpečnost
- ✅ Jednosměrné blokování uživatelů
- ✅ Kontrola blokace v komunikaci
- ✅ JWT autentizace
- ✅ Bcrypt hashování hesel
- ✅ CORS konfigurace

### 🔔 Oznámení
- ✅ Kategorizované oznámení: zprávy, rezervace, jízdy, hodnocení
- ✅ Označení přečteno/nepřečteno
- ✅ Backend připravený pro email notifikace

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
POST   /api/auth/register                - Registrace s email verifikací
POST   /api/auth/login                   - Přihlášení (vrátí JWT token)
GET    /api/auth/verify-email/<token>    - Ověření emailu
POST   /api/auth/resend-verification     - Znovu poslat verification email
POST   /api/auth/forgot-password         - Zaslat reset token
GET    /api/auth/reset-password/<token>  - Ověřit reset token
POST   /api/auth/reset-password          - Nastavit nové heslo
GET    /api/auth/me                      - Aktuální uživatel (vyžaduje JWT)
POST   /api/auth/change-password         - Změna hesla
```

### Jízdy
```
GET    /api/jizdy                        - Listing jízd s filtrováním
GET    /api/jizdy/vyhledat               - Pokročilé vyhledávání (odkud, kam, datum)
GET    /api/jizdy/<id>                   - Detail konkrétní jízdy
POST   /api/jizdy                        - Vytvoření nové jízdy
PUT    /api/jizdy/<id>                   - Úprava jízdy (jen vlastník)
DELETE /api/jizdy/<id>                   - Zrušení jízdy (jen vlastník)
```

### Rezervace
```
POST   /api/rezervace                    - Vytvoření rezervace
GET    /api/rezervace/moje               - Moje rezervace
POST   /api/rezervace/<id>/prijmout      - Přijetí rezervace (řidič)
POST   /api/rezervace/<id>/odmitnout     - Odmítnutí rezervace (řidič)
PUT    /api/rezervace/<id>/zrusit        - Zrušení rezervace (pasažér)
DELETE /api/rezervace/<id>               - Smazání rezervace
```

### Hodnocení
```
POST   /api/hodnoceni                    - Vytvoření hodnocení
GET    /api/hodnoceni/pending            - Čekající hodnocení
GET    /api/hodnoceni/uzivatel/<id>      - Hodnocení konkrétního uživatele
GET    /api/hodnoceni/moje               - Daná a přijatá hodnocení
PUT    /api/hodnoceni/<id>               - Editace hodnocení
DELETE /api/hodnoceni/<id>               - Smazání hodnocení
```

### Chat
```
GET    /api/chat/jizda/<id>              - Zprávy v chatu jízdy
GET    /api/chat/osobni/<id>             - Zprávy v osobním chatu
GET    /api/chat/moje                    - Seznam mých osobních chatů
POST   /api/chat/<id>/zpravy             - Poslání zprávy
GET    /api/chat/<id>/zpravy             - Načtení zpráv (s paginací)
```

### Vozidla
```
GET    /api/auta/moje                    - Moje vozidla
POST   /api/auta/moje-nove               - Přidání vozidla
PUT    /api/auta/<id>                    - Úprava vozidla
DELETE /api/auta/<id>                    - Smazání vozidla (soft-delete)
POST   /api/auta/replace/<id>            - Nahrazení vozidla v jízdách
```

### Ostatní
```
GET    /api/uzivatele/profil             - Můj profil
PUT    /api/uzivatele/profil             - Úprava profilu
GET    /api/uzivatele/<id>               - Veřejný profil uživatele
GET    /api/uzivatele/hledat             - Hledání uživatelů
GET    /api/blokace                      - Seznam blokovaných uživatelů
POST   /api/blokace/<id>                 - Blokování uživatele
DELETE /api/blokace/<id>                 - Odblokování uživatele
GET    /api/oznameni                     - Moje oznámení
POST   /api/oznameni/<id>/precist        - Označit oznámení jako přečtené
GET    /api/mesta                        - Vyhledávání měst (geocoding)
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

- ✅ JWT tokeny pro autentizaci
- ✅ Bcrypt hashování hesel
- ✅ Validace vstupních dat
- ✅ CORS konfigurace
- ✅ Autorizace na úrovni endpointů
- ✅ Email verifikace

## ❌ Nezdůchodené/Chybějící funkce

- ⚠️ **Real-time chat** - Jen polling (3 sek), WebSocket není implementován
- ❌ **Platby/Monetizace** - Žádný payment gateway (Stripe, PayPal)
- ❌ **Admin panel** - Žádný inspekční/správcovský interface
- ❌ **Interaktivní mapy** - Jen textové vyhledávání, bez vizuální mapy tras
- ❌ **SMS notifikace** - Jen email (a to není vidět v UI)
- ❌ **Dva faktor ověřování** - Jen email verifikace
- ❌ **Sociální přihlášení** - Jen Email/heslo
- ❌ **Video/Voice chat** - Jen text chat
- ❌ **Mobilní app** - Jen web
- ❌ **Upload profilové fotky** - UI chybí (backend je připravený)
- ❌ **Opakující se jízdy** - Jen one-time jízdy
- ❌ **Recenze vozidla** - Jen hodnocení uživatelů

## 📱 Mobilní podpora

Frontend je plně responzivní a optimalizovaný pro:
- Mobilní telefony (320px+)
- Tablety (768px+)
- Desktop (1024px+)

## 🤝 Přispívání

1. Forkněte repozitář
2. Vytvořte feature branch (`git checkout -b feature/amazing-feature`)
3. Commitněte změny (`git commit -m 'Add amazing feature'`)
4. Pushněte do branch (`git push origin feature/amazing-feature`)
5. Otevřete Pull Request

## 📄 Licence

Tento projekt je licencován pod MIT licencí - viz [LICENSE](LICENSE) soubor pro detaily.

## 👥 Tým

- **Vývojář**: Martin Svoboda

---

*Vytvořeno s ❤️ pro všechny, kdo chtějí sdílet cestu*
