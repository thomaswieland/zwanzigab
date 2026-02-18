// Game State
class ZwanzigAbGame {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.deck = [];
        this.trump = null;
        this.currentTrick = [];
        this.trickWinner = null;
        this.phase = 'setup'; // setup, trump, exchange, decide, play, roundEnd, gameOver
        this.roundNumber = 0;
        this.tricksWon = [];
        this.playersInRound = [];
        this.exchangesRemaining = 0;
        
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.rankValues = { '7': 0, '8': 1, '9': 2, '10': 3, 'J': 4, 'Q': 5, 'K': 6, 'A': 7 };
        
        this.suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };
        
        this.suitNames = {
            hearts: 'Herz',
            diamonds: 'Karo',
            clubs: 'Kreuz',
            spades: 'Pik'
        };
    }
    
    initializePlayers(count, names) {
        this.players = [];
        for (let i = 0; i < count; i++) {
            this.players.push({
                id: i,
                name: names[i] || `Spieler ${i + 1}`,
                score: 20,
                hand: [],
                tricksWon: 0,
                isPlaying: true,
                isOut: false
            });
        }
        this.dealerIndex = 0;
        this.roundNumber = 0;
    }
    
    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({ suit, rank });
            }
        }
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    startRound() {
        this.roundNumber++;
        this.createDeck();
        this.shuffleDeck();
        
        // Reset player states
        this.players.forEach(p => {
            p.hand = [];
            p.tricksWon = 0;
            p.isPlaying = null; // Will be set during decide phase
        });
        
        this.tricksWon = this.players.map(() => 0);
        this.currentTrick = [];
        this.trump = null;
        
        // Deal initial 2 cards
        for (let i = 0; i < 2; i++) {
            this.players.forEach(player => {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            });
        }
        
        // Trump chooser is left of dealer
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.phase = 'trump';
    }
    
    chooseTrump(suit) {
        this.trump = suit;
        
        // Deal remaining 3 cards to complete 5-card hands
        for (let i = 0; i < 3; i++) {
            this.players.forEach(player => {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            });
        }
        
        // Start exchange phase
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.phase = 'exchange';
        this.exchangesRemaining = this.players.length;
    }
    
    exchangeCards(playerIndex, cardsToExchange) {
        const player = this.players[playerIndex];
        
        // Remove cards from hand
        player.hand = player.hand.filter(card => 
            !cardsToExchange.some(c => c.suit === card.suit && c.rank === card.rank)
        );
        
        // Draw new cards
        const drawCount = Math.min(cardsToExchange.length, this.deck.length);
        for (let i = 0; i < drawCount; i++) {
            player.hand.push(this.deck.pop());
        }
        
        this.exchangesRemaining--;
        this.nextPlayer();
        
        if (this.exchangesRemaining === 0) {
            // Move to decide phase
            this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
            this.phase = 'decide';
            this.playersInRound = [...this.players];
        }
    }
    
    playerDecision(playerIndex, isPlaying) {
        const player = this.players[playerIndex];
        player.isPlaying = isPlaying;
        
        // Trump chooser must play
        const trumpChooserIndex = (this.dealerIndex + 1) % this.players.length;
        if (playerIndex === trumpChooserIndex) {
            player.isPlaying = true;
        }
        
        // If diamonds, everyone must play
        if (this.trump === 'diamonds') {
            player.isPlaying = true;
        }
        
        // Check if all players have decided
        const allDecided = this.players.every((p, i) => {
            const trumpChooser = i === trumpChooserIndex;
            const mustPlay = trumpChooser || this.trump === 'diamonds';
            return mustPlay || p.isPlaying !== null;
        });
        
        if (allDecided) {
            // Check if only trump chooser is playing
            const playingPlayers = this.players.filter(p => p.isPlaying);
            if (playingPlayers.length === 1) {
                // Trump chooser wins all tricks automatically
                const trumpChooser = this.players[trumpChooserIndex];
                this.tricksWon[trumpChooserIndex] = 5;
                this.endRound();
                return;
            }
            
            // Start playing tricks
            this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
            this.phase = 'play';
            this.currentTrick = [];
        } else {
            this.nextPlayer();
        }
    }
    
    playCard(playerIndex, card) {
        const player = this.players[playerIndex];
        
        // Remove card from hand
        player.hand = player.hand.filter(c => 
            !(c.suit === card.suit && c.rank === card.rank)
        );
        
        // Add to current trick
        this.currentTrick.push({
            playerIndex,
            card
        });
        
        // Check if trick is complete
        const playingPlayers = this.players.filter(p => p.isPlaying);
        if (this.currentTrick.length === playingPlayers.length) {
            this.evaluateTrick();
        } else {
            this.nextPlayingPlayer();
        }
    }
    
    evaluateTrick() {
        const leadCard = this.currentTrick[0].card;
        const leadSuit = leadCard.suit;
        
        let winningPlay = this.currentTrick[0];
        let winningValue = this.getCardValue(leadCard, leadSuit);
        
        for (let i = 1; i < this.currentTrick.length; i++) {
            const play = this.currentTrick[i];
            const value = this.getCardValue(play.card, leadSuit);
            
            if (value > winningValue) {
                winningPlay = play;
                winningValue = value;
            }
        }
        
        this.trickWinner = winningPlay.playerIndex;
        this.tricksWon[this.trickWinner]++;
        
        // Check if round is over
        if (this.players[0].hand.length === 0) {
            setTimeout(() => this.endRound(), 2000);
        } else {
            setTimeout(() => {
                this.currentTrick = [];
                this.currentPlayerIndex = this.trickWinner;
                this.trickWinner = null;
                ui.render();
            }, 2000);
        }
    }
    
    getCardValue(card, leadSuit) {
        const isTrump = card.suit === this.trump;
        const isLeadSuit = card.suit === leadSuit;
        
        if (isTrump) {
            return 1000 + this.rankValues[card.rank];
        } else if (isLeadSuit) {
            return 100 + this.rankValues[card.rank];
        } else {
            return this.rankValues[card.rank];
        }
    }
    
    endRound() {
        const isHearts = this.trump === 'hearts';
        const multiplier = isHearts ? 2 : 1;
        
        this.players.forEach((player, i) => {
            if (!player.isPlaying) {
                return; // No score change for players who sat out
            }
            
            const tricks = this.tricksWon[i];
            
            if (tricks === 0) {
                // No tricks: add 5 points (penalty)
                player.score += 5 * multiplier;
            } else if (tricks === 5) {
                // All 5 tricks: subtract 5 points (bonus)
                player.score -= 5 * multiplier;
            } else {
                // Regular tricks: subtract 1 per trick
                player.score -= tricks * multiplier;
            }
            
            // Check if player reached 0 or below
            if (player.score <= 0) {
                player.isOut = true;
            }
        });
        
        // Check for winners
        const winners = this.players.filter(p => p.score <= 0);
        if (winners.length > 0) {
            // Find the player(s) with the lowest score
            const lowestScore = Math.min(...winners.map(p => p.score));
            const gameWinners = winners.filter(p => p.score === lowestScore);
            
            if (gameWinners.length === 1) {
                this.phase = 'gameOver';
                return;
            }
            // If tie, game continues
        }
        
        // Move dealer position
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        
        this.phase = 'roundEnd';
    }
    
    nextRound() {
        this.startRound();
    }
    
    nextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (!this.playerExists(this.currentPlayerIndex));
    }
    
    nextPlayingPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (!this.players[this.currentPlayerIndex].isPlaying);
    }
    
    playerExists(index) {
        return this.players[index] !== undefined;
    }
    
    getValidCards(playerIndex) {
        const player = this.players[playerIndex];
        if (this.currentTrick.length === 0) {
            return player.hand; // Can lead with any card
        }
        
        const leadSuit = this.currentTrick[0].card.suit;
        const cardsInSuit = player.hand.filter(c => c.suit === leadSuit);
        
        if (cardsInSuit.length > 0) {
            return cardsInSuit; // Must follow suit
        }
        
        const trumpCards = player.hand.filter(c => c.suit === this.trump);
        if (trumpCards.length > 0) {
            return trumpCards; // Must play trump if can't follow
        }
        
        return player.hand; // Can play anything if can't follow or trump
    }
}

// UI Controller
class GameUI {
    constructor(game) {
        this.game = game;
        this.selectedCards = [];
        this.isOnlineMode = false;
        this.myPlayerId = null;
        this.onlineClient = null;
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('player-count').addEventListener('change', (e) => {
            this.updatePlayerInputs(parseInt(e.target.value));
        });
        
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('menu-btn').addEventListener('click', () => {
            if (confirm('Zurück zum Hauptmenü? Das Spiel wird beendet.')) {
                this.showScreen(this.isOnlineMode ? 'online' : 'mode');
                this.game.phase = 'setup';
                if (this.isOnlineMode && this.onlineClient) {
                    this.onlineClient.leaveRoom();
                }
            }
        });
        
        // Trump selection
        document.querySelectorAll('.trump-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suit = e.target.dataset.suit;
                this.selectTrump(suit);
            });
        });
    }
    
    updatePlayerInputs(count) {
        const inputs = document.querySelectorAll('.player-name-input');
        inputs.forEach((input, i) => {
            input.style.display = i < count ? 'block' : 'none';
        });
    }
    
    startGame() {
        const count = parseInt(document.getElementById('player-count').value);
        const inputs = document.querySelectorAll('.player-name-input');
        const names = Array.from(inputs).slice(0, count).map(input => input.value || input.placeholder);
        
        this.game.initializePlayers(count, names);
        this.game.startRound();
        this.showScreen('game');
        this.render();
        
        // Auto-select trump if player 0 is not the trump chooser
        if (this.game.currentPlayerIndex !== 0) {
            setTimeout(() => this.autoSelectTrump(), 1000);
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenId}-screen`).classList.add('active');
    }
    
    render() {
        this.renderScoreboard();
        this.renderGameInfo();
        this.renderPlayerHand();
        this.renderActionArea();
        this.renderTrickArea();
    }
    
    renderScoreboard() {
        const scoreboard = document.getElementById('scoreboard');
        scoreboard.innerHTML = '';
        
        this.game.players.forEach((player, i) => {
            const div = document.createElement('div');
            div.className = 'player-score';
            if (i === this.game.currentPlayerIndex) {
                div.classList.add('active');
            }
            if (player.isOut) {
                div.classList.add('out');
            }
            
            div.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="score">${player.score}</div>
            `;
            scoreboard.appendChild(div);
        });
    }
    
    renderGameInfo() {
        const phaseInfo = document.getElementById('phase-info');
        const trumpInfo = document.getElementById('trump-info');
        
        const phaseTexts = {
            trump: 'Trumpf wird gewählt...',
            exchange: 'Kartentausch',
            decide: 'Mitspielen oder Aussteigen?',
            play: 'Spiel läuft',
            roundEnd: 'Runde beendet',
            gameOver: 'Spiel beendet!'
        };
        
        phaseInfo.textContent = phaseTexts[this.game.phase] || '';
        
        if (this.game.trump) {
            const symbol = this.game.suitSymbols[this.game.trump];
            const name = this.game.suitNames[this.game.trump];
            const color = (this.game.trump === 'hearts' || this.game.trump === 'diamonds') ? 'red' : 'black';
            trumpInfo.innerHTML = `Trumpf: <span style="color: ${color === 'red' ? '#dc3545' : '#333'}">${symbol} ${name}</span>`;
        } else {
            trumpInfo.textContent = '';
        }
    }
    
    renderPlayerHand() {
        const handDiv = document.getElementById('player-hand');
        const myPlayer = this.isOnlineMode ? this.myPlayerId : 0;
        const currentPlayer = this.game.players[myPlayer]; // Always show my player's hand
        
        handDiv.innerHTML = '<h3>Deine Karten</h3>';
        
        if (currentPlayer.hand.length === 0) {
            return;
        }
        
        const validCards = this.game.phase === 'play' && this.game.currentPlayerIndex === myPlayer
            ? this.game.getValidCards(myPlayer)
            : currentPlayer.hand;
        
        currentPlayer.hand.forEach(card => {
            const cardEl = this.createCardElement(card);
            
            if (this.game.phase === 'play' && this.game.currentPlayerIndex === myPlayer) {
                const isValid = validCards.some(c => c.suit === card.suit && c.rank === card.rank);
                if (!isValid) {
                    cardEl.classList.add('disabled');
                } else {
                    cardEl.addEventListener('click', () => this.onCardClick(card));
                }
            } else if (this.game.phase === 'exchange' && this.game.currentPlayerIndex === myPlayer) {
                cardEl.addEventListener('click', () => this.onCardSelectForExchange(card, cardEl));
            }
            
            handDiv.appendChild(cardEl);
        });
    }
    
    createCardElement(card) {
        const div = document.createElement('div');
        div.className = 'card';
        
        const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
        div.classList.add(color);
        
        div.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${this.game.suitSymbols[card.suit]}</div>
        `;
        
        return div;
    }
    
    onCardClick(card) {
        if (this.game.phase !== 'play') {
            return;
        }
        
        const currentPlayer = this.isOnlineMode ? this.myPlayerId : 0;
        if (this.game.currentPlayerIndex !== currentPlayer) {
            return;
        }
        
        this.game.playCard(currentPlayer, card);
        
        if (this.isOnlineMode) {
            // Send action to server
            this.onlineClient.sendGameAction('play_card', { card });
        } else {
            // Auto-play for other players
            setTimeout(() => this.autoPlayOtherPlayers(), 1000);
        }
    }
    
    onCardSelectForExchange(card, cardEl) {
        const index = this.selectedCards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        
        if (index >= 0) {
            this.selectedCards.splice(index, 1);
            cardEl.classList.remove('selected');
        } else {
            if (this.selectedCards.length < 3) {
                this.selectedCards.push(card);
                cardEl.classList.add('selected');
            }
        }
        
        this.renderActionArea();
    }
    
    selectTrump(suit) {
        this.game.chooseTrump(suit);
        document.getElementById('trump-modal').classList.remove('active');
        
        if (this.isOnlineMode) {
            // Send action to server
            this.onlineClient.sendGameAction('choose_trump', { suit });
        } else {
            // Auto-exchange for other players
            setTimeout(() => this.autoExchangeOtherPlayers(), 500);
        }
        
        this.render();
    }
    
    renderActionArea() {
        const actionArea = document.getElementById('action-area');
        actionArea.innerHTML = '';
        
        const currentPlayer = this.isOnlineMode ? this.myPlayerId : 0;
        
        if (this.game.phase === 'trump' && this.game.currentPlayerIndex === currentPlayer) {
            document.getElementById('trump-modal').classList.add('active');
        }
        
        if (this.game.phase === 'exchange' && this.game.currentPlayerIndex === currentPlayer) {
            const info = document.createElement('div');
            info.className = 'exchange-info';
            info.textContent = `Wähle bis zu 3 Karten zum Tauschen (${this.selectedCards.length} ausgewählt)`;
            actionArea.appendChild(info);
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';
            
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn btn-success';
            confirmBtn.textContent = 'Tausch bestätigen';
            confirmBtn.addEventListener('click', () => {
                this.game.exchangeCards(currentPlayer, this.selectedCards);
                
                if (this.isOnlineMode) {
                    // Send action to server
                    this.onlineClient.sendGameAction('exchange_cards', { cards: this.selectedCards });
                } else {
                    // Auto-exchange for other players
                    setTimeout(() => this.autoExchangeOtherPlayers(), 500);
                }
                
                this.selectedCards = [];
                this.render();
            });
            
            buttonsDiv.appendChild(confirmBtn);
            actionArea.appendChild(buttonsDiv);
        }
        
        if (this.game.phase === 'decide' && this.game.currentPlayerIndex === currentPlayer) {
            const trumpChooserIndex = (this.game.dealerIndex + 1) % this.game.players.length;
            const mustPlay = this.game.currentPlayerIndex === trumpChooserIndex || this.game.trump === 'diamonds';
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'btn btn-success';
            playBtn.textContent = mustPlay ? 'Weiter (Pflicht)' : 'Mitspielen';
            playBtn.addEventListener('click', () => {
                this.game.playerDecision(currentPlayer, true);
                
                if (this.isOnlineMode) {
                    // Send action to server
                    this.onlineClient.sendGameAction('player_decision', { isPlaying: true });
                } else {
                    // Auto-decide for other players
                    setTimeout(() => this.autoDecideOtherPlayers(), 500);
                }
                
                this.render();
            });
            
            buttonsDiv.appendChild(playBtn);
            
            if (!mustPlay) {
                const passBtn = document.createElement('button');
                passBtn.className = 'btn btn-secondary';
                passBtn.textContent = 'Aussteigen';
                passBtn.addEventListener('click', () => {
                    this.game.playerDecision(currentPlayer, false);
                    
                    if (this.isOnlineMode) {
                        // Send action to server
                        this.onlineClient.sendGameAction('player_decision', { isPlaying: false });
                    } else {
                        // Auto-decide for other players
                        setTimeout(() => this.autoDecideOtherPlayers(), 500);
                    }
                    
                    this.render();
                });
                
                buttonsDiv.appendChild(passBtn);
            }
            
            actionArea.appendChild(buttonsDiv);
        }
        
        if (this.game.phase === 'roundEnd') {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-primary';
            nextBtn.textContent = 'Nächste Runde';
            nextBtn.addEventListener('click', () => {
                this.game.nextRound();
                this.render();
            });
            
            buttonsDiv.appendChild(nextBtn);
            actionArea.appendChild(buttonsDiv);
        }
        
        if (this.game.phase === 'gameOver') {
            const winners = this.game.players.filter(p => p.score <= 0);
            const lowestScore = Math.min(...winners.map(p => p.score));
            const winner = winners.find(p => p.score === lowestScore);
            
            const info = document.createElement('div');
            info.className = 'exchange-info';
            info.innerHTML = `<strong>${winner.name} hat gewonnen!</strong><br>Punktestand: ${winner.score}`;
            actionArea.appendChild(info);
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';
            
            const menuBtn = document.createElement('button');
            menuBtn.className = 'btn btn-primary';
            menuBtn.textContent = 'Zurück zum Menü';
            menuBtn.addEventListener('click', () => {
                this.showScreen('setup');
                this.game.phase = 'setup';
            });
            
            buttonsDiv.appendChild(menuBtn);
            actionArea.appendChild(buttonsDiv);
        }
    }
    
    renderTrickArea() {
        const trickArea = document.getElementById('trick-area');
        trickArea.innerHTML = '';
        
        if (this.game.currentTrick.length > 0) {
            const title = document.createElement('h3');
            title.style.color = 'white';
            title.style.marginBottom = '15px';
            title.textContent = 'Aktueller Stich';
            trickArea.appendChild(title);
            
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'trick-cards';
            
            this.game.currentTrick.forEach(play => {
                const wrapper = document.createElement('div');
                wrapper.className = 'trick-card-wrapper';
                
                const label = document.createElement('div');
                label.className = 'player-label';
                label.textContent = this.game.players[play.playerIndex].name;
                wrapper.appendChild(label);
                
                const cardEl = this.createCardElement(play.card);
                wrapper.appendChild(cardEl);
                
                cardsDiv.appendChild(wrapper);
            });
            
            trickArea.appendChild(cardsDiv);
        }
        
        if (this.game.trickWinner !== null) {
            const winnerText = document.createElement('div');
            winnerText.className = 'exchange-info';
            winnerText.innerHTML = `<strong>${this.game.players[this.game.trickWinner].name} gewinnt den Stich!</strong>`;
            trickArea.appendChild(winnerText);
        }
    }
    
    autoPlayOtherPlayers() {
        if (this.game.phase !== 'play') {
            return;
        }
        
        const playingPlayers = this.game.players.filter(p => p.isPlaying);
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        
        if (this.game.currentPlayerIndex !== 0 && currentPlayer.isPlaying) {
            const validCards = this.game.getValidCards(this.game.currentPlayerIndex);
            const randomCard = validCards[Math.floor(Math.random() * validCards.length)];
            
            setTimeout(() => {
                this.game.playCard(this.game.currentPlayerIndex, randomCard);
                this.render();
                
                // Continue auto-playing
                setTimeout(() => this.autoPlayOtherPlayers(), 1000);
            }, 1000);
        } else {
            this.render();
        }
    }
    
    autoExchangeOtherPlayers() {
        if (this.game.phase === 'decide') {
            // Exchange phase is over, start auto-deciding
            setTimeout(() => this.autoDecideOtherPlayers(), 500);
            this.render();
            return;
        }
        
        if (this.game.phase !== 'exchange' || this.game.currentPlayerIndex === 0) {
            this.render();
            return;
        }
        
        const player = this.game.players[this.game.currentPlayerIndex];
        const exchangeCount = Math.floor(Math.random() * 4); // Random 0-3 cards
        const cardsToExchange = player.hand.slice(0, exchangeCount);
        
        setTimeout(() => {
            this.game.exchangeCards(this.game.currentPlayerIndex, cardsToExchange);
            
            // Continue auto-exchanging
            setTimeout(() => this.autoExchangeOtherPlayers(), 500);
        }, 500);
    }
    
    autoDecideOtherPlayers() {
        if (this.game.phase === 'play') {
            // Decide phase is over, start auto-playing
            setTimeout(() => this.autoPlayOtherPlayers(), 500);
            this.render();
            return;
        }
        
        if (this.game.phase !== 'decide') {
            this.render();
            return;
        }
        
        const trumpChooserIndex = (this.game.dealerIndex + 1) % this.game.players.length;
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        
        if (this.game.currentPlayerIndex !== 0) {
            const mustPlay = this.game.currentPlayerIndex === trumpChooserIndex || this.game.trump === 'diamonds';
            const decision = mustPlay ? true : Math.random() > 0.3; // 70% chance to play
            
            setTimeout(() => {
                this.game.playerDecision(this.game.currentPlayerIndex, decision);
                
                // Continue auto-deciding
                setTimeout(() => this.autoDecideOtherPlayers(), 500);
            }, 500);
        } else {
            this.render();
        }
    }
    
    autoSelectTrump() {
        if (this.game.phase !== 'trump') {
            return;
        }
        
        // Randomly select a trump suit for AI players
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        this.selectTrump(randomSuit);
    }
}

// Online Mode Management
class OnlineGameManager {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.client = null;
        this.isOnlineMode = false;
        this.myPlayerId = null;
        
        this.initializeOnlineEventListeners();
    }
    
    initializeOnlineEventListeners() {
        // Mode selection
        document.getElementById('local-mode-btn').addEventListener('click', () => {
            this.showScreen('setup');
        });
        
        document.getElementById('online-mode-btn').addEventListener('click', () => {
            this.startOnlineMode();
        });
        
        // Back buttons
        document.getElementById('back-to-mode').addEventListener('click', () => {
            this.showScreen('mode');
        });
        
        document.getElementById('back-to-mode-online').addEventListener('click', () => {
            if (this.client) {
                this.client.leaveRoom();
                this.client.disconnect();
                this.client = null;
            }
            this.showScreen('mode');
        });
        
        // Room management
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.createRoom();
        });
        
        document.getElementById('join-room-btn').addEventListener('click', () => {
            document.getElementById('join-room-form').style.display = 'block';
        });
        
        document.getElementById('cancel-join-btn').addEventListener('click', () => {
            document.getElementById('join-room-form').style.display = 'none';
        });
        
        document.getElementById('join-submit-btn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        document.getElementById('start-online-game-btn').addEventListener('click', () => {
            this.client.startGame();
        });
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenId}-screen`).classList.add('active');
    }
    
    async startOnlineMode() {
        this.isOnlineMode = true;
        this.showScreen('online');
        
        const statusEl = document.getElementById('connection-status');
        statusEl.textContent = 'Verbinde mit Server...';
        
        try {
            this.client = new OnlineClient();
            await this.client.connect();
            
            statusEl.textContent = 'Verbunden!';
            document.getElementById('online-menu').style.display = 'block';
            document.getElementById('connection-status').style.display = 'none';
            
            this.setupClientCallbacks();
        } catch (error) {
            statusEl.textContent = 'Verbindung fehlgeschlagen. Bitte später erneut versuchen.';
            console.error('Connection failed:', error);
        }
    }
    
    setupClientCallbacks() {
        this.client.onRoomStateUpdate = (data) => {
            this.updateRoomView(data);
        };
        
        this.client.onGameStarted = (data) => {
            this.startOnlineGame(data);
        };
        
        this.client.onGameAction = (data) => {
            this.handleGameAction(data);
        };
        
        this.client.onError = (message) => {
            alert(message);
        };
    }
    
    createRoom() {
        const playerName = document.getElementById('player-name').value || 'Spieler';
        this.client.createRoom(playerName, 4);
        
        document.getElementById('online-menu').style.display = 'none';
        document.getElementById('room-view').style.display = 'block';
    }
    
    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();
        const playerName = document.getElementById('player-name').value || 'Spieler';
        
        if (roomCode.length !== 6) {
            alert('Bitte gib einen 6-stelligen Raum-Code ein');
            return;
        }
        
        this.client.joinRoom(roomCode, playerName);
        
        document.getElementById('online-menu').style.display = 'none';
        document.getElementById('room-view').style.display = 'block';
    }
    
    leaveRoom() {
        this.client.leaveRoom();
        document.getElementById('room-view').style.display = 'none';
        document.getElementById('online-menu').style.display = 'block';
    }
    
    updateRoomView(data) {
        document.getElementById('room-code-display').textContent = data.roomCode;
        
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '<h3>Spieler:</h3>';
        
        data.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;
            playerDiv.appendChild(nameSpan);
            
            if (player.id === this.client.playerId) {
                const badge = document.createElement('span');
                badge.className = 'player-badge';
                badge.textContent = 'Du';
                playerDiv.appendChild(badge);
            }
            
            if (index === 0) {
                const hostBadge = document.createElement('span');
                hostBadge.className = 'player-badge';
                hostBadge.style.background = '#28a745';
                hostBadge.textContent = 'Host';
                playerDiv.appendChild(hostBadge);
            }
            
            playersList.appendChild(playerDiv);
        });
        
        // Show start button only for host
        const startBtn = document.getElementById('start-online-game-btn');
        startBtn.style.display = data.isHost ? 'block' : 'none';
    }
    
    startOnlineGame(data) {
        this.myPlayerId = this.client.playerId;
        
        // Initialize game with online players
        const names = data.players.map(p => p.name);
        this.game.initializePlayers(names.length, names);
        this.game.startRound();
        
        this.showScreen('game');
        this.ui.isOnlineMode = true;
        this.ui.myPlayerId = this.myPlayerId;
        this.ui.onlineClient = this.client;
        this.ui.render();
    }
    
    handleGameAction(data) {
        // Apply game action from other players
        switch (data.action) {
            case 'choose_trump':
                this.game.chooseTrump(data.payload.suit);
                this.ui.render();
                break;
            case 'exchange_cards':
                this.game.exchangeCards(data.playerId, data.payload.cards);
                this.ui.render();
                break;
            case 'player_decision':
                this.game.playerDecision(data.playerId, data.payload.isPlaying);
                this.ui.render();
                break;
            case 'play_card':
                this.game.playCard(data.playerId, data.payload.card);
                this.ui.render();
                break;
        }
    }
}

// Initialize game
const game = new ZwanzigAbGame();
const ui = new GameUI(game);
const onlineManager = new OnlineGameManager(game, ui);

// Initialize player inputs
ui.updatePlayerInputs(4);
