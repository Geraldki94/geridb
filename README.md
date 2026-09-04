# GeriDB

Open-Source-Tabellendatenbank für Teams – mit flexiblen Feldtypen, Dashboards, REST API, Webhooks und Automationen. Einfach zu installieren und selbst zu hosten.

Der aktuelle MVP verbindet eine spreadsheet-ähnliche Arbeitsfläche mit einem persistenten Datenmodell und einer modernen deutschsprachigen Oberfläche.

## Enthalten

- Tabellenansicht mit Suche, Statusfiltern und Sortierung
- Feldmenü zum Ausblenden, Duplizieren, Einfügen und Löschen von Spalten
- Feldtypen für Text, Zahlen, Währung, Auswahl, Datum, Checkbox, Telefon, E-Mail, URL und Bewertung
- Dialog zum Anlegen neuer Datensätze
- Vertriebsdashboard mit Kennzahlen, Diagramm und Statusverteilung
- Automationsübersicht mit Triggern, Aktionen und aktivierbaren Abläufen
- REST-Endpunkte zum Lesen, Anlegen, Ändern und Löschen von Datensätzen
- persistentes, relationales Datenmodell für Cloudflare D1
- kleine WebMCP-Schnittstelle für KI-Agenten

## Lokal starten

Voraussetzungen: Node.js 22.13 oder neuer und pnpm.

```bash
pnpm install
pnpm dev
```

Danach läuft die Oberfläche standardmäßig unter `http://localhost:3016`. Ohne lokale D1-Datenbank bleibt die UI mit Beispieldaten vollständig erkundbar; neue Einträge werden dann als lokaler Entwurf markiert.

## Produktions-Build

```bash
pnpm build
```

Das Projekt ist für Cloudflare Workers und D1 vorbereitet. Die Datenbankmigration liegt in `drizzle/`. Die logische Bindung ist in `.openai/hosting.json` als `DB` definiert.

## REST API

| Methode  | Pfad                     | Zweck                                   |
| -------- | ------------------------ | --------------------------------------- |
| `GET`    | `/api/v1/records`        | Datensätze lesen; optional `?search=`   |
| `POST`   | `/api/v1/records`        | Datensatz anlegen                       |
| `PATCH`  | `/api/v1/records`        | Datensatz anhand von `id` ändern        |
| `DELETE` | `/api/v1/records?id=:id` | Datensatz löschen                       |
| `GET`    | `/api/v1/automations`    | Automationen lesen                      |
| `PATCH`  | `/api/v1/automations`    | Automation aktivieren oder deaktivieren |

Beispiel:

```bash
curl -X POST http://localhost:3016/api/v1/records \
  -H "Content-Type: application/json" \
  -d '{"company":"Beispiel GmbH","status":"Kontakt","value":5000}'
```

## Architektur

- React 19 + TypeScript
- Vinext/Vite für Next-kompatibles Routing
- Tailwind CSS und die mitgelieferten Shadcn-Komponenten
- Drizzle ORM für versionierte SQLite/D1-Migrationen
- Cloudflare Workers + D1 für das gehostete Backend

## Nächste sinnvolle Ausbaustufen

- Persistente benutzerdefinierte Felder und mehrere Tabellen/Bases
- Formeln, Relationen, Rollups und Datei-Anhänge
- Benutzerkonten, Rollen und Freigaben
- ausführbarer Automationsdienst mit Zeitplänen, Webhooks und Wiederholungen
- CSV/XLSX-Import und -Export
- Docker-/PostgreSQL-Variante für vollständig unabhängiges Self-Hosting

Beiträge und Issues sind willkommen. Bitte beachte: Dies ist ein früher MVP und noch kein vollständiger Ersatz für eine ausgereifte Produktionsinstallation von NocoDB.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
