const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Game rooms storage
const rooms = new Map();

// Note: Error messages are in German to match the UI language of the game

// Generate random room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

function handleMessage(ws, data) {
    switch (data.type) {
        case 'create_room':
            createRoom(ws, data);
            break;
        case 'join_room':
            joinRoom(ws, data);
            break;
        case 'leave_room':
            leaveRoom(ws, data);
            break;
        case 'start_game':
            startGame(ws, data);
            break;
        case 'game_action':
            handleGameAction(ws, data);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

function createRoom(ws, data) {
    const roomCode = generateRoomCode();
    const room = {
        code: roomCode,
        host: ws,
        players: [{
            ws: ws,
            id: 0,
            name: data.playerName,
            ready: false
        }],
        maxPlayers: data.maxPlayers || 4,
        gameState: null,
        started: false
    };
    
    ws.roomCode = roomCode;
    ws.playerId = 0;
    rooms.set(roomCode, room);
    
    ws.send(JSON.stringify({
        type: 'room_created',
        roomCode: roomCode,
        playerId: 0
    }));
    
    broadcastRoomState(roomCode);
    console.log(`Room ${roomCode} created`);
}

function joinRoom(ws, data) {
    const room = rooms.get(data.roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Raum nicht gefunden'
        }));
        return;
    }
    
    if (room.started) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Spiel hat bereits begonnen'
        }));
        return;
    }
    
    if (room.players.length >= room.maxPlayers) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Raum ist voll'
        }));
        return;
    }
    
    const playerId = room.players.length;
    room.players.push({
        ws: ws,
        id: playerId,
        name: data.playerName,
        ready: false
    });
    
    ws.roomCode = data.roomCode;
    ws.playerId = playerId;
    
    ws.send(JSON.stringify({
        type: 'room_joined',
        roomCode: data.roomCode,
        playerId: playerId
    }));
    
    broadcastRoomState(data.roomCode);
    console.log(`Player ${data.playerName} joined room ${data.roomCode}`);
}

function leaveRoom(ws, data) {
    const room = rooms.get(data.roomCode);
    if (!room) return;
    
    room.players = room.players.filter(p => p.ws !== ws);
    
    if (room.players.length === 0) {
        rooms.delete(data.roomCode);
        console.log(`Room ${data.roomCode} deleted (empty)`);
    } else {
        // Reassign host if needed
        if (room.host === ws) {
            room.host = room.players[0].ws;
        }
        // Reassign player IDs
        room.players.forEach((player, index) => {
            player.id = index;
            player.ws.playerId = index;
        });
        broadcastRoomState(data.roomCode);
    }
    
    ws.roomCode = null;
    ws.playerId = null;
}

function handleDisconnect(ws) {
    if (ws.roomCode) {
        leaveRoom(ws, { roomCode: ws.roomCode });
    }
}

function startGame(ws, data) {
    const room = rooms.get(data.roomCode);
    if (!room) return;
    
    if (room.host !== ws) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Nur der Host kann das Spiel starten'
        }));
        return;
    }
    
    if (room.players.length < 2) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Mindestens 2 Spieler erforderlich'
        }));
        return;
    }
    
    room.started = true;
    
    broadcastToRoom(data.roomCode, {
        type: 'game_started',
        players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
    
    console.log(`Game started in room ${data.roomCode}`);
}

function handleGameAction(ws, data) {
    const room = rooms.get(ws.roomCode);
    if (!room || !room.started) return;
    
    // Broadcast game action to all players in the room
    broadcastToRoom(ws.roomCode, {
        type: 'game_action',
        action: data.action,
        playerId: ws.playerId,
        payload: data.payload
    });
}

function broadcastRoomState(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const state = {
        type: 'room_state',
        roomCode: roomCode,
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            ready: p.ready
        })),
        maxPlayers: room.maxPlayers,
        isHost: false,
        started: room.started
    };
    
    room.players.forEach(player => {
        const personalizedState = {
            ...state,
            isHost: player.ws === room.host
        };
        player.ws.send(JSON.stringify(personalizedState));
    });
}

function broadcastToRoom(roomCode, message) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const messageStr = JSON.stringify(message);
    room.players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(messageStr);
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Öffne http://localhost:${PORT} im Browser`);
});
