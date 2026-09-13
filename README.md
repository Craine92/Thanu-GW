# Müller Haustechnik · ERP-Demo

Eine moderne, vollständig lokale Betriebssoftware-Demo für Gas-, Wasser-, Sanitär- und Haustechnikbetriebe. Die Anwendung bildet den Arbeitsalltag der fiktiven **Müller Haustechnik AG** in Zürich mit realistisch verknüpften Kunden, Belegen, Aufträgen, Arbeitszeiten und Lagerdaten ab.

Die Demo benötigt kein Backend, keinen Login und keine externe Datenbank. Änderungen werden über eine gekapselte Repository-/Service-Schicht in IndexedDB gespeichert und bleiben nach einem Browser-Reload erhalten.

## Funktionsumfang

- professionelles, responsives App-Shell-Layout mit einklappbarer Navigation
- gefülltes Dashboard mit KPIs, Umsatzentwicklung, Statusdiagrammen und Aktivitäten
- globale Suche über Kunden, Mitarbeitende, Rechnungen, Kostenvoranschläge und Aufträge
- sortierbare, filterbare und paginierte Tabellen mit Schnellansicht
- vollständiger Kostenvoranschlags- und Rechnungseditor mit Arbeitszeit-, Material-, Pauschal- und freien Positionen
- direkte Positionsbearbeitung, Sortierung und Live-Summen inklusive Rabatten sowie getrennten Mehrwertsteuersätzen
- Beleg-CRUD, Duplikation, Statuswechsel, Zahlungserfassung und stornierbare Rechnungen
- sichere Umwandlung eines Kostenvoranschlags in eine unabhängig gespeicherte Rechnung mit beidseitiger Verknüpfung
- professionelle, mehrseitige A4-PDFs mit Logo, wiederholtem Tabellenkopf, Seitenfuß und echten Text-/Tabelleninhalten
- persistente Kundenerstellung und Zeiterfassung
- Unternehmens-, Finanz- und Nummernkreis-Einstellungen
- Dokumentwährungen CHF, EUR, USD und GBP; neue Belege übernehmen die Unternehmenswährung als Vorgabe
- zentralisierte Geld-, Rabatt-, Steuer- und Summenberechnung
- Berichtsseite mit CSV-Export
- bestätigter Reset auf den ursprünglichen Demo-Datenbestand
- Loading-, Empty-, Dialog-, Toast-, Hover- und mobile Zustände

## Technischer Stack

- React und TypeScript
- Vite
- React Router
- Lucide Icons
- Recharts
- IndexedDB über `idb`
- PDF-Erzeugung im Browser über `jsPDF` und `jspdf-autotable`
- eigenes, kompaktes CSS-Designsystem ohne externe Laufzeitressourcen
- ESLint

## Lokale Installation

Voraussetzung ist eine aktuelle Node.js-Version (empfohlen: Node.js 20 oder neuer).

```bash
npm install
npm run dev
```

Vite zeigt anschließend die lokale Adresse im Terminal an, standardmäßig `http://localhost:5173`.

Produktions-Build erstellen und lokal prüfen:

```bash
npm run build
npm run preview
```

Codequalität prüfen:

```bash
npm run lint
```

## Demo-Daten

Beim ersten Start werden automatisch folgende, untereinander verknüpfte Datensätze erzeugt:

- 25 Kunden
- 8 Mitarbeitende
- 40 Materialien
- 20 Standardpositionen
- 15 Kostenvoranschläge
- 12 Aufträge
- 20 Rechnungen
- 88 Zeiteinträge
- 28 Lagerbewegungen
- aktuelle Aktivitäten

Die Daten bilden Beziehungen wie `Kunde → Kostenvoranschlag → Auftrag → Zeiteintrag → Rechnung` ab. In den Einstellungen kann der Browser-Datenbestand über **Demo zurücksetzen** jederzeit auf diesen Ausgangszustand zurückgeführt werden.

## Belegworkflow

Unter **Kostenvoranschläge** und **Rechnungen** stehen jeweils Listen, Detailansichten und ein gemeinsamer responsiver Editor bereit. Positionen können aus dem Material- und Standardpositionsstamm übernommen oder frei als Arbeitszeit, Material, Pauschale beziehungsweise individuelle Position erfasst werden. Menge, Einheit, Einzelpreis, Rabatt und Mehrwertsteuer bleiben anschließend direkt editierbar; alle Ansichten und PDFs verwenden dieselbe zentrale Berechnungslogik.

Ein Kostenvoranschlag lässt sich nach Bestätigung mit einem Klick in eine Rechnung umwandeln. Positionen und Empfängerdaten werden dabei als unabhängige Kopie gespeichert, eine neue Rechnungsnummer vergeben und beide Dokumente miteinander verknüpft. Rechnungen unterstützen Entwurf, Versand, Teilzahlung, vollständige Zahlung, Überfälligkeit und Stornierung.

PDFs werden vollständig lokal mit `jsPDF` und `jspdf-autotable` erzeugt. Sie verwenden die hinterlegten Unternehmensdaten und das optionale PNG-/JPEG-Logo, unterstützen lange Positionslisten über mehrere Seiten und können heruntergeladen oder im Browser als Vorschau geöffnet werden.

Dokumentnummern folgen dem konfigurierbaren Schema `PREFIX-JAHR-0000`. Das Jahr stammt aus dem Ausstellungsdatum; der Zähler wird nur beim Erstellen, Duplizieren oder Konvertieren erhöht und vergebene Nummern werden nicht wieder freigegeben.

## Lokale Speicherung und spätere Backend-Anbindung

UI-Komponenten greifen nicht direkt auf IndexedDB zu. Die Datenzugriffe liegen in `src/data`, fachliche Aktionen in `src/services` und die zentralen Modelle in `src/types`. Belege speichern neben ihrer eigenen Währung auch einen Snapshot der Empfängerdaten, damit spätere Änderungen am Kundenstamm historische Dokumente nicht verändern. Eine versionierte Normalisierung migriert bestehende lokale Daten ohne ungefragtes Löschen. Dadurch kann ein späterer Adapter für Supabase, PostgreSQL oder eine eigene REST-/GraphQL-API die lokale Repository-Implementierung ersetzen, ohne die Oberfläche grundlegend umzubauen.

IndexedDB-Daten sind an Browser und Ursprung gebunden. Das Leeren der Website-Daten entfernt auch den lokalen Demo-Stand; beim nächsten Start wird er automatisch neu angelegt.
