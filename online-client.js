// WebSocket client for online multiplayer
class OnlineClient {
    constructor() {
        this.ws = null;
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        this.onRoomStateUpdate = null;
        this.onGameStarted = null;
        this.onGameAction = null;
        this.onError = null;
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to server');
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from server');
                if (this.onError) {
                    this.onError('Verbindung zum Server verloren');
                }
            };
        });
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'room_created':
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                break;
            case 'room_joined':
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                break;
            case 'room_state':
                this.isHost = data.isHost;
                if (this.onRoomStateUpdate) {
                    this.onRoomStateUpdate(data);
                }
                break;
            case 'game_started':
                if (this.onGameStarted) {
                    this.onGameStarted(data);
                }
                break;
            case 'game_action':
                if (this.onGameAction) {
                    this.onGameAction(data);
                }
                break;
            case 'error':
                if (this.onError) {
                    this.onError(data.message);
                }
                break;
        }
    }
    
    createRoom(playerName, maxPlayers = 4) {
        this.send({
            type: 'create_room',
            playerName: playerName,
            maxPlayers: maxPlayers
        });
    }
    
    joinRoom(roomCode, playerName) {
        this.send({
            type: 'join_room',
            roomCode: roomCode.toUpperCase(),
            playerName: playerName
        });
    }
    
    leaveRoom() {
        if (this.roomCode) {
            this.send({
                type: 'leave_room',
                roomCode: this.roomCode
            });
        }
    }
    
    startGame() {
        this.send({
            type: 'start_game',
            roomCode: this.roomCode
        });
    }
    
    sendGameAction(action, payload) {
        this.send({
            type: 'game_action',
            action: action,
            payload: payload
        });
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
