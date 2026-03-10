# Zwanzig ab - Kartenspiel

Eine Web-basierte Implementation des deutschen Kartenspiels "Zwanzig ab" fuer 2-4 Spieler mit **Online-Multiplayer ueber Peer-to-Peer (WebRTC)**.

## Spielregeln

**Zwanzig ab** ist ein traditionelles deutsches Kartenspiel. Jeder Spieler startet mit 20 Punkten und das Ziel ist es, als Erster auf 0 oder darunter zu kommen.

### Spielablauf

1. **Trumpfwahl**: Der Spieler links vom Geber waehlt die Trumpffarbe nach Erhalt von 2 Karten
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

Spiele mit Freunden ueber das Internet — kein Server noetig! Das Spiel laeuft komplett im Browser ueber Peer-to-Peer-Verbindungen (WebRTC/PeerJS).

1. **Statische Seite hosten** (eine der folgenden Optionen):

   **GitHub Pages / Netlify / Vercel:** Einfach das Repository deployen — keine Build-Schritte noetig.

   **Lokaler HTTP-Server:**
   ```bash
   python3 -m http.server 8080
   ```
   Dann im Browser oeffnen: `http://localhost:8080`

2. **Spielmodus waehlen:**
   - Klicke auf "Online spielen"
   - **Raum erstellen:** Erstelle einen neuen Spielraum und teile den 6-stelligen Code mit Freunden
   - **Raum beitreten:** Gib den Code ein, den du von einem Freund erhalten hast

3. **Spiel starten:**
   - Warte bis alle Spieler beigetreten sind (2-4 Spieler)
   - Der Host startet das Spiel mit "Spiel starten"

### Lokal spielen

Spiele auf einem Geraet mit KI-Gegnern.

1. Repository klonen oder Dateien herunterladen
2. `index.html` in einem modernen Webbrowser oeffnen
3. "Lokal spielen" waehlen
4. Spieleranzahl und Namen eingeben
5. Spielen!

## Spielanleitung

### Lokaler Modus
1. **Spieleranzahl waehlen**: 2-4 Spieler
2. **Spielernamen eingeben** (optional)
3. **"Spiel starten"** klicken
4. **Trumpf wird gewaehlt** (automatisch fuer KI-Spieler)
5. **Karten tauschen**: Bis zu 3 Karten auswaehlen und "Tausch bestaetigen"
6. **Entscheidung treffen**: "Mitspielen" oder "Aussteigen"
7. **Karten spielen**: Auf Karte klicken wenn Sie an der Reihe sind
8. **Gewinner**: Erster Spieler der 0 oder weniger Punkte erreicht

### Online-Modus
1. **Raum erstellen oder beitreten**
2. **Auf andere Spieler warten** (2-4 Spieler erforderlich)
3. **Host startet das Spiel**
4. **Jeder Spieler spielt auf seinem eigenen Geraet**
5. Spielablauf wie im lokalen Modus

## Technische Details

- **Frontend:** Reine HTML/CSS/JavaScript — keine Abhaengigkeiten, kein Build-Schritt
- **Multiplayer:** PeerJS/WebRTC Peer-to-Peer — kein eigener Server noetig
- **Architektur:** Host-autoritativ — der Host-Browser haelt den Game-State, validiert alle Aktionen und verteilt nur die jeweils eigenen Karten an jeden Spieler
- **Sicherheit:** Peers senden Karten-Indices statt Karten-Objekte (Cheating-Schutz), kein innerHTML mit User-Input (XSS-Schutz)
- **Mobile-optimiert:** Touch-freundliche Steuerung, responsive Design
- **Hosting:** Jeder statische Webserver (GitHub Pages, Netlify, etc.)

## Dateien

- `index.html` - Hauptseite mit Spielstruktur
- `styles.css` - Styling und Layout
- `game.js` - Spiellogik, UI-Controller und Online-Game-Manager
- `p2p-client.js` - PeerJS/WebRTC Networking-Layer

## Browser-Kompatibilitaet

Funktioniert mit allen modernen Browsern die WebRTC unterstuetzen:
- Chrome/Edge (neueste Versionen)
- Firefox (neueste Versionen)
- Safari (neueste Versionen)
- Mobile Browser (iOS Safari, Chrome Mobile)

## Lizenz

Dieses Projekt ist open source und kann frei verwendet werden.

## Mitwirken

Beitraege sind willkommen! Bitte erstelle einen Pull Request mit deinen Aenderungen.
