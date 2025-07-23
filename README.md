# Prototyp spolujizdy

## Cíl aplikace
Platforma pro sdílenou dopravu autem pro studenty (řidiči a pasažéři) do školy, kteří si mohou vytvářet jízdy, rezervovat si místo, komunikovat v chatu a hodnotit se navzájem. 

## Role uživatelů
- Řidič – může vytvářet jízdy, potvrzovat rezervace, používat auto, hodnotit ostatní
- Pasažér – může vyhledávat jízdy, posílat rezervace, hodnotit ostatní
- (Technicky jsou všichni uživatelé stejný model, role se rozlišuje až v kontextu konkrétní jízdy)

## Funkce uživatelského účtu
- Registrace, přihlášení, změna hesla
- Úprava profilu (jméno, bio, fotka)
- Přidávání a úprava aut
- Možnost blokovat jiné uživatele
- Možnost hodnotit ostatní po jízdě (zvlášť jako řidiče a jako pasažéra)
- Možnost chatovat s ostatními
- Možnost prohlížet si cizí profily
- Možnost vidět historii svých jízd

## Jízdy
### Řidič může:
- Vytvořit jízdu (jednu nebo víc najednou)
- Vybrat auto (primární nebo jiné, včetně možnosti přidat nové auto při vytváření jízdy)
- Spravovat rezervace (přijmout, odmítnout)

### Každá jízda:
- Má místo odjezdu a příjezdu
- Datum a čas
- Počet volných míst, cenu
- Stav (aktivní, zrušená, proběhlá...)

## Vyhledávání jízd
- Podle data, odkud a kam
- Vidět detail jízdy, řidiče, auta i ostatních pasažérů
- Možnost odeslat rezervaci a připojit zprávu (poznámku)

## Chat
- Každá jízda má vlastní skupinový chat
- Chat je přístupný pouze přijatým účastníkům (řidič + schválení pasažéři)
- Po čase příjezdu je chat archivován jako součást historie
- Dále každý uživatel může chatovat s libovolným jiným uživatelem

## Hodnocení
- Po jízdě má každý účastník možnost ohodnotit ostatní (zvlášť jako řidiče a jako pasažéry)
- Hodnocení je přístupné na profilu každého uživatele

## Návrh databáze (PostgreSQL)
- TODO

##  Tech stack
Frontend: React (zatím návrh na papíře)
Backend: Flask
Databáze: SQLite pro vývoj, později PostgreSQL
ORM: SQLAlchemy (možná s Flask-SQLAlchemy) ???

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
