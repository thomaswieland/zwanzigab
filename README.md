# Zwanzig Ab - Kartenspiel Web App

Eine mobile-optimierte Web-Anwendung für das klassische deutsche Kartenspiel "Zwanzig Ab" für 2-4 Spieler.

## Spielregeln

**Ziel des Spiels:** Jeder Spieler startet mit 20 Punkten. Das Ziel ist es, nicht auf 0 oder darunter zu kommen.

### Spielablauf
- Das Spiel wird mit einem deutschen Blatt (32 Karten) gespielt
- Jeder Spieler erhält 5 Karten pro Runde
- Eine Karte wird als Trumpf aufgedeckt
- Der Spieler links vom Geber beginnt
- Farbe muss bedient werden, wenn möglich
- Trumpf sticht Fehlfarben, höhere Karte sticht niedrigere

### Punktevergabe
- Kein Stich: +5 Punkte
- 1 Stich: 0 Punkte
- 2 Stiche: -1 Punkt
- 3 Stiche: -2 Punkte
- 4 Stiche: -3 Punkte
- 5 Stiche: -4 Punkte

### Spielende
Wer auf 0 oder darunter kommt, scheidet aus. Der letzte verbleibende Spieler gewinnt.

## Installation & Nutzung

Die App ist eine reine Client-Side-Anwendung und benötigt keinen Server. Es gibt mehrere Möglichkeiten, sie zu nutzen:

### Option 1: Lokaler Web Server
```bash
# Python 3
python3 -m http.server 8000

# oder mit Python 2
python -m SimpleHTTPServer 8000

# oder mit Node.js
npx serve
```

Dann öffne `http://localhost:8000` im Browser.

### Option 2: Direkt im Browser öffnen
Öffne die `index.html` Datei direkt in deinem Browser (funktioniert bei den meisten modernen Browsern).

### Option 3: Hosting
Lade die Dateien auf einen beliebigen Webserver oder Hosting-Service hoch:
- GitHub Pages
- Netlify
- Vercel
- Oder jeden anderen statischen Hosting-Service

## Features

✅ **Vollständige Spielmechanik**
- Deutsches Kartenblatt (32 Karten)
- Stichlogik mit Trumpf
- Automatische Punkteberechnung
- Spieler-Eliminierung

✅ **Mobile-First Design**
- Vollständig responsive
- Touch-optimiert
- Funktioniert auf iOS Safari, Chrome, Firefox etc.
- Unterstützt Hoch- und Querformat

✅ **Benutzerfreundlichkeit**
- Klare Anzeige des aktiven Spielers
- Visuelles Feedback für spielbare Karten
- Vollständige deutsche Benutzeroberfläche
- Spielregeln jederzeit abrufbar

## Technologie

- **HTML5** - Struktur
- **CSS3** - Styling und Responsive Design
- **Vanilla JavaScript** - Spiellogik (keine Frameworks benötigt)

## Browser-Kompatibilität

Die App funktioniert in allen modernen Browsern:
- Chrome/Edge (Desktop & Mobile)
- Firefox (Desktop & Mobile)
- Safari (Desktop & Mobile)
- Opera

## Multiplayer

Die aktuelle Version ist für lokales Spielen (Hot-Seat-Modus) konzipiert - alle Spieler verwenden dasselbe Gerät abwechselnd. 

Für echtes Online-Multiplayer über das Internet wäre eine Server-Komponente mit WebSockets erforderlich (nicht in dieser Version enthalten).

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Zwecke.