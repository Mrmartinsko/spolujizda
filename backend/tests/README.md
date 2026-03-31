# Testy backendu

Základní testy používají `pytest` a běží nad testovací SQLite databází v paměti.

## Instalace

1. Přepněte se do složky `backend`
2. Aktivujte virtuální prostředí
3. Nainstalujte závislosti:

```bash
pip install -r requirements.txt
```

## Spuštění

Doporučený způsob je spouštět testy přes aktivní interpreter ve `venv`:

```bash
python -m pytest
```

Pro detailnější výpis můžete použít:

```bash
python -m pytest -v
```