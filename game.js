// Zwanzig Ab - Game Logic

// Constants
const TRICK_COMPLETION_DELAY = 1000; // milliseconds

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    getValue() {
        const values = {
            '7': 0, '8': 1, '9': 2, '10': 3,
            'Bube': 4, 'Dame': 5, 'König': 6, 'Ass': 7
        };
        return values[this.rank];
    }

    getSuitSymbol() {
        const symbols = {
            'Herz': '♥',
            'Karo': '♦',
            'Pik': '♠',
            'Kreuz': '♣'
        };
        return symbols[this.suit];
    }

    getSuitClass() {
        return this.suit.toLowerCase();
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        const suits = ['Herz', 'Karo', 'Pik', 'Kreuz'];
        const ranks = ['7', '8', '9', '10', 'Bube', 'Dame', 'König', 'Ass'];
        
        this.cards = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(count) {
        return this.cards.splice(0, count);
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.score = 20;
        this.hand = [];
        this.tricks = 0;
        this.eliminated = false;
    }

    addCards(cards) {
        this.hand.push(...cards);
    }

    playCard(index) {
        return this.hand.splice(index, 1)[0];
    }

    clearHand() {
        this.hand = [];
        this.tricks = 0;
    }

    updateScore(tricks) {
        const pointChanges = {
            0: 5,   // Kein Stich: +5
            1: 0,   // 1 Stich: 0
            2: -1,  // 2 Stiche: -1
            3: -2,  // 3 Stiche: -2
            4: -3,  // 4 Stiche: -3
            5: -4   // 5 Stiche: -4
        };
        
        this.score += pointChanges[tricks] || 0;
        
        if (this.score <= 0) {
            this.eliminated = true;
        }
    }
}

class Game {
    constructor(playerNames) {
        this.players = playerNames.map(name => new Player(name));
        this.deck = new Deck();
        this.currentPlayerIndex = 0;
        this.round = 0;
        this.trumpSuit = null;
        this.currentTrick = [];
        this.leadingSuit = null;
        this.roundStartPlayer = 0;
        this.trickStartPlayer = 0;
    }

    startNewRound() {
        this.round++;
        
        // Reset deck and shuffle
        this.deck.reset();
        this.deck.shuffle();
        
        // Clear hands and tricks
        this.players.forEach(player => player.clearHand());
        
        // Deal 5 cards to each active player
        const activePlayers = this.players.filter(p => !p.eliminated);
        activePlayers.forEach(player => {
            player.addCards(this.deck.deal(5));
        });
        
        // Set trump suit
        if (this.deck.cards.length > 0) {
            this.trumpSuit = this.deck.cards[0].suit;
        } else {
            this.trumpSuit = ['Herz', 'Karo', 'Pik', 'Kreuz'][Math.floor(Math.random() * 4)];
        }
        
        // Set starting player
        this.currentPlayerIndex = this.roundStartPlayer;
        this.trickStartPlayer = this.roundStartPlayer;
        this.currentTrick = [];
        this.leadingSuit = null;
    }

    canPlayCard(player, card) {
        // If leading, can play any card
        if (this.currentTrick.length === 0) {
            return true;
        }
        
        // Must follow suit if possible
        const hasSuit = player.hand.some(c => c.suit === this.leadingSuit);
        if (hasSuit) {
            return card.suit === this.leadingSuit;
        }
        
        // If can't follow suit, can play any card
        return true;
    }

    playCard(playerIndex, cardIndex) {
        const player = this.players[playerIndex];
        const card = player.hand[cardIndex];
        
        if (!this.canPlayCard(player, card)) {
            return false;
        }
        
        // Set leading suit for this trick
        if (this.currentTrick.length === 0) {
            this.leadingSuit = card.suit;
        }
        
        // Play the card
        const playedCard = player.playCard(cardIndex);
        this.currentTrick.push({
            player: player,
            card: playedCard
        });
        
        return true;
    }

    evaluateTrick() {
        let winningPlay = this.currentTrick[0];
        
        for (let i = 1; i < this.currentTrick.length; i++) {
            const currentPlay = this.currentTrick[i];
            
            // Trump beats non-trump
            if (currentPlay.card.suit === this.trumpSuit && 
                winningPlay.card.suit !== this.trumpSuit) {
                winningPlay = currentPlay;
            }
            // Both trump or both same suit - higher value wins
            else if ((currentPlay.card.suit === this.trumpSuit && 
                      winningPlay.card.suit === this.trumpSuit) ||
                     (currentPlay.card.suit === winningPlay.card.suit)) {
                if (currentPlay.card.getValue() > winningPlay.card.getValue()) {
                    winningPlay = currentPlay;
                }
            }
        }
        
        // Award trick to winner
        winningPlay.player.tricks++;
        
        // Set next trick starter
        const winnerIndex = this.players.indexOf(winningPlay.player);
        this.trickStartPlayer = winnerIndex;
        this.currentPlayerIndex = winnerIndex;
        
        // Clear trick
        this.currentTrick = [];
        this.leadingSuit = null;
        
        return winningPlay.player;
    }

    isRoundOver() {
        const activePlayers = this.players.filter(p => !p.eliminated);
        return activePlayers.every(p => p.hand.length === 0);
    }

    finishRound() {
        // Update scores based on tricks
        this.players.forEach(player => {
            if (!player.eliminated) {
                player.updateScore(player.tricks);
            }
        });
        
        // Move to next round starter
        this.roundStartPlayer = (this.roundStartPlayer + 1) % this.players.length;
        
        // Skip eliminated players
        while (this.players[this.roundStartPlayer].eliminated) {
            this.roundStartPlayer = (this.roundStartPlayer + 1) % this.players.length;
        }
    }

    isGameOver() {
        const activePlayers = this.players.filter(p => !p.eliminated);
        return activePlayers.length <= 1;
    }

    getWinner() {
        const activePlayers = this.players.filter(p => !p.eliminated);
        if (activePlayers.length === 1) {
            return activePlayers[0];
        }
        return null;
    }

    getNextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].eliminated);
        
        return this.players[this.currentPlayerIndex];
    }
}

// UI Controller
class GameUI {
    constructor() {
        this.game = null;
        this.currentScreen = 'start';
        this.playerCount = 2;
        this.initializeEventListeners();
        this.showScreen('start-screen');
    }

    initializeEventListeners() {
        // Start screen
        document.getElementById('add-player-btn').addEventListener('click', () => this.addPlayerInput());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('show-rules-btn').addEventListener('click', () => this.showRules());
        
        // Rules modal
        document.querySelector('.close').addEventListener('click', () => this.hideRules());
        
        // Game screen
        document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('next-round-btn').addEventListener('click', () => this.nextRound());
        
        // Game over screen
        document.getElementById('new-game-btn').addEventListener('click', () => this.resetToStart());
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('rules-modal');
            if (e.target === modal) {
                this.hideRules();
            }
        });
    }

    addPlayerInput() {
        if (this.playerCount >= 4) {
            alert('Maximal 4 Spieler möglich!');
            return;
        }
        
        this.playerCount++;
        const playerList = document.getElementById('player-list');
        const input = document.createElement('div');
        input.className = 'player-input';
        input.innerHTML = `<input type="text" placeholder="Spieler ${this.playerCount} Name" 
                           id="player${this.playerCount}" value="Spieler ${this.playerCount}">`;
        playerList.appendChild(input);
        
        if (this.playerCount >= 4) {
            document.getElementById('add-player-btn').style.display = 'none';
        }
    }

    startGame() {
        const playerNames = [];
        for (let i = 1; i <= this.playerCount; i++) {
            const input = document.getElementById(`player${i}`);
            const name = input.value.trim() || `Spieler ${i}`;
            playerNames.push(name);
        }
        
        this.game = new Game(playerNames);
        this.game.startNewRound();
        this.showScreen('game-screen');
        this.updateGameUI();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    showRules() {
        document.getElementById('rules-modal').classList.add('active');
    }

    hideRules() {
        document.getElementById('rules-modal').classList.remove('active');
    }

    showMenu() {
        if (confirm('Zurück zum Hauptmenü? Das aktuelle Spiel geht verloren.')) {
            this.resetToStart();
        }
    }

    resetToStart() {
        this.game = null;
        this.showScreen('start-screen');
    }

    updateGameUI() {
        this.updateScoreboard();
        this.updateGameInfo();
        this.updateTable();
        this.updateHand();
    }

    updateScoreboard() {
        const scoresDiv = document.getElementById('scores');
        scoresDiv.innerHTML = '';
        
        this.game.players.forEach((player, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            if (index === this.game.currentPlayerIndex) {
                scoreItem.classList.add('active');
            }
            if (player.eliminated) {
                scoreItem.classList.add('eliminated');
            }
            
            scoreItem.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-score">${player.score}</div>
                <div class="player-tricks">Stiche: ${player.tricks}</div>
            `;
            scoresDiv.appendChild(scoreItem);
        });
    }

    updateGameInfo() {
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        document.getElementById('current-player').textContent = 
            `Am Zug: ${currentPlayer.name}`;
        document.getElementById('round-info').textContent = 
            `Runde ${this.game.round}`;
        document.getElementById('trump-suit').textContent = 
            `Trumpf: ${this.game.trumpSuit} ${new Card(this.game.trumpSuit, 'Ass').getSuitSymbol()}`;
    }

    updateTable() {
        const playedCardsDiv = document.getElementById('played-cards');
        playedCardsDiv.innerHTML = '';
        
        this.game.currentTrick.forEach(play => {
            const cardDiv = this.createCardElement(play.card, -1, true);
            playedCardsDiv.appendChild(cardDiv);
        });
    }

    updateHand() {
        const handDiv = document.getElementById('hand-cards');
        handDiv.innerHTML = '';
        
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        
        currentPlayer.hand.forEach((card, index) => {
            const cardDiv = this.createCardElement(card, index, false);
            
            // Check if card can be played
            if (!this.game.canPlayCard(currentPlayer, card)) {
                cardDiv.classList.add('disabled');
            } else {
                cardDiv.addEventListener('click', () => this.handleCardClick(index));
            }
            
            handDiv.appendChild(cardDiv);
        });
    }

    createCardElement(card, index, isPlayed) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.getSuitClass()}`;
        if (isPlayed) {
            cardDiv.classList.add('played');
        }
        
        cardDiv.innerHTML = `
            <div class="rank">${card.rank}</div>
            <div class="suit">${card.getSuitSymbol()}</div>
        `;
        
        return cardDiv;
    }

    handleCardClick(cardIndex) {
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        
        if (this.game.playCard(this.game.currentPlayerIndex, cardIndex)) {
            this.updateGameUI();
            
            // Check if trick is complete
            const activePlayers = this.game.players.filter(p => !p.eliminated);
            if (this.game.currentTrick.length === activePlayers.length) {
                setTimeout(() => this.completeTrick(), TRICK_COMPLETION_DELAY);
            } else {
                // Move to next player
                this.game.getNextPlayer();
                this.updateGameUI();
            }
        }
    }

    completeTrick() {
        const winner = this.game.evaluateTrick();
        
        this.updateGameUI();
        
        // Check if round is over
        if (this.game.isRoundOver()) {
            this.finishRound();
        }
    }

    finishRound() {
        this.game.finishRound();
        
        // Check if game is over
        if (this.game.isGameOver()) {
            this.showGameOver();
        } else {
            // Show next round button
            document.getElementById('next-round-btn').style.display = 'block';
        }
        
        this.updateGameUI();
    }

    nextRound() {
        document.getElementById('next-round-btn').style.display = 'none';
        this.game.startNewRound();
        this.updateGameUI();
    }

    showGameOver() {
        const winner = this.game.getWinner();
        
        document.getElementById('winner-announcement').innerHTML = 
            winner ? `<h2>🎉 ${winner.name} hat gewonnen! 🎉</h2>` : 
                    `<h2>Unentschieden!</h2>`;
        
        const finalScoresDiv = document.getElementById('final-scores');
        finalScoresDiv.innerHTML = '<h3>Endstand:</h3>';
        
        // Sort players by score
        const sortedPlayers = [...this.game.players].sort((a, b) => b.score - a.score);
        sortedPlayers.forEach(player => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'final-score-item';
            scoreItem.textContent = `${player.name}: ${player.score} Punkte`;
            finalScoresDiv.appendChild(scoreItem);
        });
        
        this.showScreen('gameover-screen');
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const gameUI = new GameUI();
});
