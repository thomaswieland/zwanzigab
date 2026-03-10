// P2P Networking Layer using PeerJS/WebRTC
class P2PManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> {conn, playerIndex, name}
        this.hostConnection = null;   // peer only
        this.isHost = false;
        this.myPeerId = null;
        this.roomCode = null;
        this.myPlayerIndex = null;
        this.players = [];            // host only: [{peerId, name, index}]

        // Callbacks
        this.onRoomUpdate = null;     // (roomState) => void
        this.onGameState = null;      // (stateSnapshot) => void
        this.onError = null;          // (message) => void
        this.onConnected = null;      // () => void
        this.onDisconnected = null;   // (reason) => void
    }

    // --- Host: Create Room ---
    createRoom(playerName) {
        return new Promise((resolve, reject) => {
            this.isHost = true;
            this.roomCode = this._generateRoomCode();
            const peerId = 'zwanzigab-' + this.roomCode;

            this.peer = new Peer(peerId);

            this.peer.on('open', (id) => {
                this.myPeerId = id;
                this.myPlayerIndex = 0;
                this.players = [{ peerId: id, name: playerName, index: 0 }];
                this._broadcastRoomState();
                resolve(this.roomCode);
            });

            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    // Room code collision, retry
                    this.peer.destroy();
                    this.roomCode = this._generateRoomCode();
                    const retryId = 'zwanzigab-' + this.roomCode;
                    this.peer = new Peer(retryId);
                    this.peer.on('open', (id) => {
                        this.myPeerId = id;
                        this.myPlayerIndex = 0;
                        this.players = [{ peerId: id, name: playerName, index: 0 }];
                        this._broadcastRoomState();
                        resolve(this.roomCode);
                    });
                    this.peer.on('error', (retryErr) => {
                        reject(retryErr);
                    });
                } else {
                    reject(err);
                }
            });

            this.peer.on('connection', (conn) => {
                this._handleNewConnection(conn);
            });

            this.peer.on('disconnected', () => {
                // Try to reconnect to signaling server
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            });
        });
    }

    // --- Peer: Join Room ---
    joinRoom(roomCode, playerName) {
        return new Promise((resolve, reject) => {
            this.isHost = false;
            this.roomCode = roomCode.toUpperCase();
            const hostPeerId = 'zwanzigab-' + this.roomCode;

            this.peer = new Peer();

            this.peer.on('open', (id) => {
                this.myPeerId = id;

                const conn = this.peer.connect(hostPeerId, { reliable: true });

                conn.on('open', () => {
                    this.hostConnection = conn;
                    conn.send({ type: 'join', name: playerName });
                    this._setupPeerMessageHandler(conn);
                    resolve();
                });

                conn.on('error', (err) => {
                    reject(new Error('Verbindung zum Host fehlgeschlagen'));
                });

                // Timeout for connection
                setTimeout(() => {
                    if (!this.hostConnection) {
                        reject(new Error('Verbindung zum Host fehlgeschlagen (Timeout)'));
                    }
                }, 10000);
            });

            this.peer.on('error', (err) => {
                if (err.type === 'peer-unavailable') {
                    reject(new Error('Raum nicht gefunden'));
                } else {
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            });
        });
    }

    // --- Host: Handle new peer connection ---
    _handleNewConnection(conn) {
        conn.on('open', () => {
            // Wait for join message
            const joinTimeout = setTimeout(() => {
                conn.close();
            }, 5000);

            const onFirstMessage = (data) => {
                clearTimeout(joinTimeout);
                conn.off('data', onFirstMessage);

                if (data.type !== 'join') {
                    conn.close();
                    return;
                }

                if (this.players.length >= 4) {
                    conn.send({ type: 'error', message: 'Raum ist voll' });
                    conn.close();
                    return;
                }

                const playerIndex = this.players.length;
                const playerName = String(data.name || 'Spieler').substring(0, 20);

                this.players.push({
                    peerId: conn.peer,
                    name: playerName,
                    index: playerIndex
                });
                this.connections.set(conn.peer, {
                    conn,
                    playerIndex,
                    name: playerName
                });

                conn.send({
                    type: 'joined',
                    playerIndex: playerIndex,
                    roomCode: this.roomCode
                });

                // Setup message handler for game actions
                conn.on('data', (msg) => {
                    this._handlePeerMessage(conn.peer, msg);
                });

                conn.on('close', () => {
                    this._handlePeerDisconnect(conn.peer);
                });

                this._broadcastRoomState();
            };

            conn.on('data', onFirstMessage);
        });
    }

    // --- Host: Handle messages from peers ---
    _handlePeerMessage(peerId, data) {
        if (!data || !data.type) return;

        const connInfo = this.connections.get(peerId);
        if (!connInfo) return;

        if (data.type.startsWith('action:')) {
            // Forward to game action handler
            if (this.onPeerAction) {
                this.onPeerAction(connInfo.playerIndex, data.type, data.payload);
            }
        }
    }

    // --- Host: Handle peer disconnect ---
    _handlePeerDisconnect(peerId) {
        const connInfo = this.connections.get(peerId);
        if (!connInfo) return;

        this.connections.delete(peerId);
        this.players = this.players.filter(p => p.peerId !== peerId);

        // Reassign indices
        this.players.forEach((p, i) => {
            p.index = i;
            if (p.peerId !== this.myPeerId) {
                const ci = this.connections.get(p.peerId);
                if (ci) ci.playerIndex = i;
            }
        });

        this._broadcastRoomState();

        if (this.onPeerDisconnected) {
            this.onPeerDisconnected(connInfo.playerIndex, connInfo.name);
        }
    }

    // --- Peer: Handle messages from host ---
    _setupPeerMessageHandler(conn) {
        conn.on('data', (data) => {
            if (!data || !data.type) return;

            switch (data.type) {
                case 'joined':
                    this.myPlayerIndex = data.playerIndex;
                    this.roomCode = data.roomCode;
                    break;
                case 'room_state':
                    if (this.onRoomUpdate) this.onRoomUpdate(data);
                    break;
                case 'game_state':
                    if (this.onGameState) this.onGameState(data);
                    break;
                case 'error':
                    if (this.onError) this.onError(data.message);
                    break;
            }
        });

        conn.on('close', () => {
            this.hostConnection = null;
            if (this.onDisconnected) {
                this.onDisconnected('Host hat die Verbindung verloren');
            }
        });
    }

    // --- Peer: Send action to host ---
    sendAction(actionType, payload) {
        if (this.isHost) {
            // Host handles locally via callback
            if (this.onPeerAction) {
                this.onPeerAction(this.myPlayerIndex, actionType, payload);
            }
        } else if (this.hostConnection) {
            this.hostConnection.send({ type: actionType, payload });
        }
    }

    // --- Host: Broadcast room state to all peers ---
    _broadcastRoomState() {
        const state = {
            type: 'room_state',
            roomCode: this.roomCode,
            players: this.players.map(p => ({ name: p.name, index: p.index })),
            playerCount: this.players.length
        };

        // Send to all connected peers
        this.connections.forEach(({ conn }) => {
            if (conn.open) {
                conn.send(state);
            }
        });

        // Also notify local (host) UI
        if (this.onRoomUpdate) {
            this.onRoomUpdate(state);
        }
    }

    // --- Host: Send personalized game state to each peer ---
    broadcastGameState(game) {
        // Send to each connected peer
        this.connections.forEach(({ conn, playerIndex }) => {
            if (conn.open) {
                const snapshot = this._buildPlayerState(game, playerIndex);
                conn.send(snapshot);
            }
        });

        // Also update host's own UI
        if (this.onGameState) {
            const hostSnapshot = this._buildPlayerState(game, 0);
            this.onGameState(hostSnapshot);
        }
    }

    // --- Host: Build per-player state snapshot ---
    _buildPlayerState(game, playerIndex) {
        return {
            type: 'game_state',
            phase: game.phase,
            roundNumber: game.roundNumber,
            trump: game.trump,
            dealerIndex: game.dealerIndex,
            currentPlayerIndex: game.currentPlayerIndex,
            myPlayerIndex: playerIndex,
            myHand: game.players[playerIndex] ? [...game.players[playerIndex].hand] : [],
            players: game.players.map((p, i) => ({
                name: p.name,
                score: p.score,
                isPlaying: p.isPlaying,
                isOut: p.isOut,
                tricksWon: game.tricksWon[i],
                handSize: p.hand.length
            })),
            currentTrick: game.currentTrick.map(t => ({
                playerIndex: t.playerIndex,
                card: { ...t.card }
            })),
            trickWinner: game.trickWinner,
            exchangesRemaining: game.exchangesRemaining
        };
    }

    // --- Host: Send error to specific peer ---
    sendErrorToPeer(playerIndex, message) {
        if (playerIndex === 0) {
            // Host is player 0
            if (this.onError) this.onError(message);
            return;
        }

        const player = this.players.find(p => p.index === playerIndex);
        if (!player) return;

        const connInfo = this.connections.get(player.peerId);
        if (connInfo && connInfo.conn.open) {
            connInfo.conn.send({ type: 'error', message });
        }
    }

    // --- Host: Start game (notify all) ---
    broadcastGameStarted(playerNames) {
        const msg = {
            type: 'game_started',
            players: playerNames.map((name, i) => ({ name, index: i }))
        };

        this.connections.forEach(({ conn }) => {
            if (conn.open) conn.send(msg);
        });
    }

    // --- Cleanup ---
    disconnect() {
        if (this.hostConnection) {
            this.hostConnection.close();
            this.hostConnection = null;
        }
        this.connections.forEach(({ conn }) => conn.close());
        this.connections.clear();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.players = [];
        this.roomCode = null;
        this.myPlayerIndex = null;
        this.isHost = false;
    }

    leaveRoom() {
        this.disconnect();
    }

    // --- Utility ---
    _generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}
