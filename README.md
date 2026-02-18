# Zwanzig ab - Kartenspiel

Eine Web-basierte Implementation des deutschen Kartenspiels "Zwanzig ab" für 2-4 Spieler mit **Online-Multiplayer-Unterstützung**.

## Spielregeln

**Zwanzig ab** ist ein traditionelles deutsches Kartenspiel. Jeder Spieler startet mit 20 Punkten und das Ziel ist es, als Erster auf 0 oder darunter zu kommen.

### Spielablauf

1. **Trumpfwahl**: Der Spieler links vom Geber wählt die Trumpffarbe nach Erhalt von 2 Karten
2. **Kartentausch**: Jeder Spieler kann bis zu 3 Karten tauschen
3. **Entscheidung**: Spieler entscheiden ob sie mitspielen oder aussteigen
4. **Stiche spielen**: Spieler spielen 5 Stiche nach klassischen Stichregeln

### Punktevergabe

- **-1 Punkt** pro gewonnenem Stich
- **-5 Punkte** bei allen 5 Stichen
- **+5 Punkte** wenn mitgespielt aber keinen Stich gewonnen
- **Doppelte Punkte** wenn Herz Trumpf ist

## Installation & Nutzung

### Online-Multiplayer (Empfohlen)

Spiele mit Freunden über das Internet!

1. **Server starten:**
   ```bash
   npm install
   npm start
   ```
   Der Server läuft auf Port 3000 (Standard).

2. **Im Browser öffnen:**
   ```
   http://localhost:3000
   ```

3. **Spielmodus wählen:**
   - Klicke auf "Online spielen"
   - **Raum erstellen:** Erstelle einen neuen Spielraum und teile den 6-stelligen Code mit Freunden
   - **Raum beitreten:** Gib den Code ein, den du von einem Freund erhalten hast

4. **Spiel starten:**
   - Warte bis alle Spieler beigetreten sind
   - Der Host startet das Spiel mit "Spiel starten"

### Lokal spielen

Spiele auf einem Gerät mit mehreren Spielern (wie vorher).

1. Repository klonen oder Dateien herunterladen
2. `index.html` in einem modernen Webbrowser öffnen
3. "Lokal spielen" wählen
4. Spielen!

### Alternative: Mit Python HTTP Server

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

**Hinweis:** Beim Python-Server ist nur der lokale Modus verfügbar. Für Online-Multiplayer nutze den Node.js Server.

## Spielanleitung

### Lokaler Modus
1. **Spieleranzahl wählen**: 2-4 Spieler
2. **Spielernamen eingeben** (optional)
3. **"Spiel starten"** klicken
4. **Trumpf wird gewählt** (automatisch für KI-Spieler)
5. **Karten tauschen**: Bis zu 3 Karten auswählen und "Tausch bestätigen"
6. **Entscheidung treffen**: "Mitspielen" oder "Aussteigen"
7. **Karten spielen**: Auf Karte klicken wenn Sie an der Reihe sind
8. **Gewinner**: Erster Spieler der 0 oder weniger Punkte erreicht

### Online-Modus
1. **Raum erstellen oder beitreten**
2. **Auf andere Spieler warten** (2-4 Spieler erforderlich)
3. **Host startet das Spiel**
4. **Jeder Spieler spielt auf seinem eigenen Gerät**
5. Spielablauf wie im lokalen Modus

## Technische Details

- **Frontend:** Reine HTML/CSS/JavaScript - Keine Frontend-Abhängigkeiten
- **Backend:** Node.js + Express + WebSocket (ws)
- **Mobile-optimiert:** Touch-freundliche Steuerung
- **Echtzeit-Multiplayer:** WebSocket-basierte Synchronisation
- **Responsive Design:** Funktioniert auf allen Geräten

## Dateien

- `index.html` - Hauptseite mit Spielstruktur
- `styles.css` - Styling und Layout
- `game.js` - Spiellogik und UI-Controller
- `online-client.js` - WebSocket-Client für Online-Multiplayer
- `server.js` - Node.js WebSocket-Server
- `package.json` - Node.js Abhängigkeiten

## Server-Konfiguration

Der Server kann über Umgebungsvariablen konfiguriert werden:

```bash
PORT=8080 npm start
```

Standard-Port ist 3000.

## Browser-Kompatibilität

Funktioniert mit allen modernen Browsern:
- Chrome/Edge (neueste Versionen)
- Firefox (neueste Versionen)
- Safari (neueste Versionen)
- Mobile Browser (iOS Safari, Chrome Mobile)

## Lizenz

Dieses Projekt ist open source und kann frei verwendet werden.

## Mitwirken

Beiträge sind willkommen! Bitte erstellen Sie einen Pull Request mit Ihren Änderungen.
