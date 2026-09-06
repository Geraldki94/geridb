# n8n-nodes-geridb

Community Node für die Open-Source-Tabellendatenbank GeriDB. Der Node kann als normales n8n-Element und als Werkzeug eines n8n-AI-Agenten verwendet werden.

## Unterstützte Aktionen

- Tabellen auflisten
- Datensätze auflisten und über alle Felder suchen
- Datensätze anlegen
- Datensätze aktualisieren
- Datensätze löschen
- eigene JSON-Felder an GeriDB übergeben

## Installation

Nach einer Veröffentlichung auf npm kann das Paket in einer selbst gehosteten n8n-Instanz unter **Settings → Community Nodes** als `n8n-nodes-geridb` installiert werden. Für lokale Entwicklung:

```bash
pnpm install
pnpm --filter n8n-nodes-geridb build
pnpm --filter n8n-nodes-geridb dev
```

Als Credentials werden die Basis-URL der GeriDB-Installation und optional der in `GERIDB_API_KEY` konfigurierte Schlüssel eingetragen.
