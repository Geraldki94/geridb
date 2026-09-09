# GeriDB mit n8n und einem Voicebot-Agenten verwenden

GeriDB stellt jede Tabelle über dieselbe REST-API bereit. Ein Voicebot kann dadurch während eines Gesprächs Kontakte suchen, neue Anfragen speichern oder vorhandene Einträge aktualisieren. n8n eignet sich dabei als Verbindung zwischen Telefonie/Voice-Agent und GeriDB.

## 1. Tabellen-ID kopieren

Öffne in GeriDB die gewünschte Tabelle und wechsle zu **API**. Dort steht die Tabellen-ID, zum Beispiel `tbl_customers`.

## 2. API-Schlüssel erstellen

Öffne **API → API-Schlüssel**, vergib beispielsweise den Namen `n8n Voicebot` und klicke auf **Schlüssel erstellen**. Kopiere den angezeigten Schlüssel sofort: Er wird aus Sicherheitsgründen nur einmal vollständig angezeigt und nur gehasht gespeichert.

## 3. Datensätze aus n8n suchen

Verwende einen **HTTP Request**-Node:

- Methode: `GET`
- URL: `https://deine-domain.example/api/v1/records`
- Query-Parameter `table`: `tbl_customers`
- Query-Parameter `search`: die vom Voicebot erkannte Telefonnummer oder E-Mail-Adresse
- Header `Authorization`: `Bearer DEIN_GERIDB_API_KEY`

Die Antwort enthält `records` und `meta.total`. Mit einem IF-Node kann n8n unterscheiden, ob der Kontakt bereits existiert.

## 4. Kontakt oder Gesprächsergebnis anlegen

HTTP Request-Node:

- Methode: `POST`
- URL: `https://deine-domain.example/api/v1/records?table=tbl_customers`
- Body Content Type: JSON
- JSON-Body:

```json
{
  "company": "Max Mustermann",
  "contact": "Voicebot Lead",
  "email": "max@example.com",
  "phone": "+43 660 1234567",
  "status": "Kontakt",
  "value": 0,
  "date": "2026-09-07",
  "notes": "Interessiert sich für einen Rückruf am Nachmittag"
}
```

Zusätzliche benutzerdefinierte Felder werden ebenfalls als JSON-Werte gespeichert. Lege das sichtbare Feld zuvor in GeriDB an und verwende anschließend dessen Feldschlüssel aus dem Feldmenü. Auswahlfelder können eigene Werte besitzen; n8n sendet den gewünschten Wert als normalen String.

## 5. Vorhandenen Datensatz aktualisieren

Nimm die `id` aus dem Suchergebnis und sende einen `PATCH`-Request:

```json
{
  "id": "rec_...",
  "company": "Max Mustermann",
  "status": "Aktiv",
  "notes": "Termin für Montag bestätigt"
}
```

Die URL bleibt `https://deine-domain.example/api/v1/records?table=tbl_customers`.

## 6. API absichern

API-Schlüssel aus der Oberfläche werden nur als SHA-256-Hash gespeichert und können dort einzeln widerrufen werden. Alternativ lässt sich in der Hosting-Umgebung `GERIDB_API_KEY` als zentraler Hauptschlüssel setzen. Externe Aufrufe senden den jeweiligen Wert als Bearer-Token. Die GeriDB-Oberfläche auf derselben Domain bleibt weiterhin nutzbar. Mit `GERIDB_ALLOWED_ORIGIN` kann zusätzlich genau eine Browser-Origin erlaubt werden. Server-zu-Server-Aufrufe aus n8n benötigen CORS nicht.

Die API ist immer geschützt. Externe Aufrufe benötigen einen gültigen Bearer-Token – auch bei einer frischen lokalen Installation. Erstelle ihn als Admin unter **API & Webhooks → API-Schlüssel**. Der vollständige Wert wird nur einmal angezeigt und sollte als n8n-Credential oder Secret gespeichert werden.

## Empfohlener Voicebot-Ablauf

1. Telefonnummer aus dem eingehenden Anruf übernehmen.
2. GeriDB über `search` abfragen.
3. Gefundene CRM-Daten als Kontext an den Voice-Agenten geben.
4. Nach dem Gespräch Zusammenfassung, Status und Rückrufdatum per `PATCH` oder `POST` speichern.
5. Optional einen n8n-Webhook für E-Mail, Kalender oder CRM-Folgeprozesse auslösen.
