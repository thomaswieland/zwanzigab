# Zwanzig ab - Kartenspiel

Eine Web-basierte Implementation des deutschen Kartenspiels "Zwanzig ab" für 2-4 Spieler.

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

### Lokal spielen

1. Repository klonen oder Dateien herunterladen
2. `index.html` in einem modernen Webbrowser öffnen
3. Spielen!

### Mit Python HTTP Server

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

### Mit Node.js HTTP Server

```bash
npx http-server
```

## Spielanleitung

1. **Spieleranzahl wählen**: 2-4 Spieler
2. **Spielernamen eingeben** (optional)
3. **"Spiel starten"** klicken
4. **Trumpf wird gewählt** (automatisch für KI-Spieler)
5. **Karten tauschen**: Bis zu 3 Karten auswählen und "Tausch bestätigen"
6. **Entscheidung treffen**: "Mitspielen" oder "Aussteigen"
7. **Karten spielen**: Auf Karte klicken wenn Sie an der Reihe sind
8. **Gewinner**: Erster Spieler der 0 oder weniger Punkte erreicht

## Technische Details

- **Reine HTML/CSS/JavaScript** - Keine Abhängigkeiten
- **Mobile-optimiert** - Touch-freundliche Steuerung
- **KI-Gegner** - 3 automatische Mitspieler
- **Responsive Design** - Funktioniert auf allen Geräten

## Dateien

- `index.html` - Hauptseite mit Spielstruktur
- `styles.css` - Styling und Layout
- `game.js` - Spiellogik und KI

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