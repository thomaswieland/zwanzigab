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
        this.onStateChange = null; // callback for state changes

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

    exchangeCardsByIndices(playerIndex, cardIndices) {
        const player = this.players[playerIndex];
        const cardsToExchange = cardIndices
            .filter(i => i >= 0 && i < player.hand.length)
            .map(i => player.hand[i]);
        this.exchangeCards(playerIndex, cardsToExchange);
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
                this.tricksWon[trumpChooserIndex] = 5;
                this.endRound();
                return;
            }

            // Start playing tricks
            this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
            // Skip non-playing players
            while (!this.players[this.currentPlayerIndex].isPlaying) {
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            }
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
            return 'trick_complete';
        } else {
            this.nextPlayingPlayer();
            return 'next_player';
        }
    }

    playCardByIndex(playerIndex, cardIndex) {
        const player = this.players[playerIndex];
        if (cardIndex < 0 || cardIndex >= player.hand.length) return null;
        const card = player.hand[cardIndex];
        return this.playCard(playerIndex, card);
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

        // Check if round is over (any playing player has no cards left)
        const playingPlayers = this.players.filter(p => p.isPlaying);
        const roundOver = playingPlayers.some(p => p.hand.length === 0);
        return roundOver;
    }

    clearTrick() {
        this.currentTrick = [];
        this.currentPlayerIndex = this.trickWinner;
        this.trickWinner = null;
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
            const lowestScore = Math.min(...winners.map(p => p.score));
            const gameWinners = winners.filter(p => p.score === lowestScore);

            if (gameWinners.length === 1) {
                this.phase = 'gameOver';
                return;
            }
        }

        // Move dealer position
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

        this.phase = 'roundEnd';
    }

    nextRound() {
        this.startRound();
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }

    nextPlayingPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (!this.players[this.currentPlayerIndex].isPlaying);
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

    // Apply a state snapshot received from host (used by peers in online mode)
    applySnapshot(state) {
        this.phase = state.phase;
        this.trump = state.trump;
        this.currentPlayerIndex = state.currentPlayerIndex;
        this.dealerIndex = state.dealerIndex;
        this.roundNumber = state.roundNumber;
        this.currentTrick = state.currentTrick || [];
        this.trickWinner = state.trickWinner;
        this.exchangesRemaining = state.exchangesRemaining;
        this.players = state.players.map((p, i) => ({
            id: i,
            name: p.name,
            score: p.score,
            hand: i === state.myPlayerIndex ? (state.myHand || []) : [],
            tricksWon: p.tricksWon,
            isPlaying: p.isPlaying,
            isOut: p.isOut
        }));
        this.tricksWon = state.players.map(p => p.tricksWon);
    }
}

// UI Controller
class GameUI {
    constructor(game) {
        this.game = game;
        this.selectedCards = [];
        this.isOnlineMode = false;
        this.myPlayerIndex = 0;
        this.onlineManager = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('player-count').addEventListener('change', (e) => {
            this.updatePlayerInputs(parseInt(e.target.value));
        });

        document.getElementById('start-game').addEventListener('click', () => {
            this.startLocalGame();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            if (confirm('Zurueck zum Hauptmenue? Das Spiel wird beendet.')) {
                if (this.isOnlineMode && this.onlineManager) {
                    this.onlineManager.disconnect();
                }
                this.showScreen(this.isOnlineMode ? 'online' : 'mode');
                this.game.phase = 'setup';
                this.isOnlineMode = false;
            }
        });

        // Trump selection
        document.querySelectorAll('.trump-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suit = e.target.dataset.suit;
                this.handleTrumpSelection(suit);
            });
        });
    }

    updatePlayerInputs(count) {
        const inputs = document.querySelectorAll('.player-name-input');
        inputs.forEach((input, i) => {
            input.style.display = i < count ? 'block' : 'none';
        });
    }

    startLocalGame() {
        const count = parseInt(document.getElementById('player-count').value);
        const inputs = document.querySelectorAll('.player-name-input');
        const names = Array.from(inputs).slice(0, count).map(input => input.value || input.placeholder);

        this.isOnlineMode = false;
        this.myPlayerIndex = 0;
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

    handleTrumpSelection(suit) {
        document.getElementById('trump-modal').classList.remove('active');
        if (this.isOnlineMode) {
            this.onlineManager.sendAction('action:choose_trump', { suit });
        } else {
            this.game.chooseTrump(suit);
            // Auto-exchange for other players
            setTimeout(() => this.autoExchangeOtherPlayers(), 500);
            this.render();
        }
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

            const nameDiv = document.createElement('div');
            nameDiv.className = 'player-name';
            if (i === this.game.currentPlayerIndex) {
                const indicator = document.createElement('span');
                indicator.className = 'turn-indicator';
                indicator.textContent = '\u25B6';
                nameDiv.appendChild(indicator);
                nameDiv.appendChild(document.createTextNode(' '));
            }
            nameDiv.appendChild(document.createTextNode(player.name));

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score';
            scoreDiv.textContent = player.score;

            div.appendChild(nameDiv);
            div.appendChild(scoreDiv);
            scoreboard.appendChild(div);
        });
    }

    renderGameInfo() {
        const phaseInfo = document.getElementById('phase-info');
        const trumpInfo = document.getElementById('trump-info');

        const phaseTexts = {
            trump: 'Trumpf wird gewaehlt...',
            exchange: 'Kartentausch',
            decide: 'Mitspielen oder Aussteigen?',
            play: 'Spiel laeuft',
            roundEnd: 'Runde beendet',
            gameOver: 'Spiel beendet!'
        };

        phaseInfo.textContent = phaseTexts[this.game.phase] || '';

        if (this.game.trump) {
            const symbol = this.game.suitSymbols[this.game.trump];
            const name = this.game.suitNames[this.game.trump];
            trumpInfo.textContent = '';
            const label = document.createTextNode('Trumpf: ');
            const span = document.createElement('span');
            span.style.color = (this.game.trump === 'hearts' || this.game.trump === 'diamonds') ? '#dc3545' : '#333';
            span.textContent = symbol + ' ' + name;
            trumpInfo.appendChild(label);
            trumpInfo.appendChild(span);
        } else {
            trumpInfo.textContent = '';
        }
    }

    renderPlayerHand() {
        const handDiv = document.getElementById('player-hand');
        const myIndex = this.myPlayerIndex;
        const currentPlayer = this.game.players[myIndex];

        handDiv.innerHTML = '';
        const title = document.createElement('h3');
        title.textContent = 'Deine Karten';
        handDiv.appendChild(title);

        if (!currentPlayer || currentPlayer.hand.length === 0) {
            return;
        }

        const isMyTurn = this.game.currentPlayerIndex === myIndex;
        const validCards = this.game.phase === 'play' && isMyTurn
            ? this.game.getValidCards(myIndex)
            : currentPlayer.hand;

        currentPlayer.hand.forEach((card, cardIndex) => {
            const cardEl = this.createCardElement(card);

            if (this.game.phase === 'play' && isMyTurn) {
                const isValid = validCards.some(c => c.suit === card.suit && c.rank === card.rank);
                if (!isValid) {
                    cardEl.classList.add('disabled');
                } else {
                    cardEl.addEventListener('click', () => this.onCardClick(card, cardIndex));
                }
            } else if (this.game.phase === 'exchange' && isMyTurn) {
                cardEl.addEventListener('click', () => this.onCardSelectForExchange(card, cardIndex, cardEl));
            }

            handDiv.appendChild(cardEl);
        });
    }

    createCardElement(card) {
        const div = document.createElement('div');
        div.className = 'card';

        const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
        div.classList.add(color);

        const rankDiv = document.createElement('div');
        rankDiv.className = 'card-rank';
        rankDiv.textContent = card.rank;

        const suitDiv = document.createElement('div');
        suitDiv.className = 'card-suit';
        suitDiv.textContent = this.game.suitSymbols[card.suit];

        div.appendChild(rankDiv);
        div.appendChild(suitDiv);

        return div;
    }

    onCardClick(card, cardIndex) {
        if (this.game.phase !== 'play') return;

        const myIndex = this.myPlayerIndex;
        if (this.game.currentPlayerIndex !== myIndex) return;

        if (this.isOnlineMode) {
            this.onlineManager.sendAction('action:play_card', { cardIndex });
        } else {
            const result = this.game.playCard(myIndex, card);
            this.render();
            if (result === 'trick_complete') {
                const roundOver = this.game.evaluateTrick();
                this.render();
                if (roundOver) {
                    setTimeout(() => {
                        this.game.endRound();
                        this.render();
                    }, 2000);
                } else {
                    setTimeout(() => {
                        this.game.clearTrick();
                        this.render();
                        setTimeout(() => this.autoPlayOtherPlayers(), 1000);
                    }, 2000);
                }
            } else {
                setTimeout(() => this.autoPlayOtherPlayers(), 1000);
            }
        }
    }

    onCardSelectForExchange(card, cardIndex, cardEl) {
        const existingIdx = this.selectedCards.findIndex(c => c.cardIndex === cardIndex);

        if (existingIdx >= 0) {
            this.selectedCards.splice(existingIdx, 1);
            cardEl.classList.remove('selected');
        } else {
            if (this.selectedCards.length < 3) {
                this.selectedCards.push({ card, cardIndex });
                cardEl.classList.add('selected');
            }
        }

        this.renderActionArea();
    }

    renderActionArea() {
        const actionArea = document.getElementById('action-area');
        actionArea.innerHTML = '';

        const myIndex = this.myPlayerIndex;
        const isMyTurn = this.game.currentPlayerIndex === myIndex;

        if (this.game.phase === 'trump' && isMyTurn) {
            // Show player's cards inside the trump modal
            const modalCards = document.getElementById('trump-modal-cards');
            modalCards.innerHTML = '';
            const label = document.createElement('p');
            label.style.marginBottom = '10px';
            label.style.color = '#555';
            label.textContent = 'Deine Karten:';
            modalCards.appendChild(label);
            const cardsRow = document.createElement('div');
            cardsRow.style.display = 'flex';
            cardsRow.style.justifyContent = 'center';
            cardsRow.style.gap = '8px';
            cardsRow.style.marginBottom = '20px';
            const myPlayer = this.game.players[myIndex];
            if (myPlayer && myPlayer.hand) {
                myPlayer.hand.forEach(card => {
                    const cardEl = this.createCardElement(card);
                    cardEl.style.cursor = 'default';
                    cardsRow.appendChild(cardEl);
                });
            }
            modalCards.appendChild(cardsRow);
            document.getElementById('trump-modal').classList.add('active');
        }

        if (this.game.phase === 'exchange' && isMyTurn) {
            const info = document.createElement('div');
            info.className = 'exchange-info';
            info.textContent = 'Waehle bis zu 3 Karten zum Tauschen (' + this.selectedCards.length + ' ausgewaehlt)';
            actionArea.appendChild(info);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn btn-success';
            confirmBtn.textContent = 'Tausch bestaetigen';
            confirmBtn.addEventListener('click', () => {
                if (this.isOnlineMode) {
                    const indices = this.selectedCards.map(c => c.cardIndex);
                    this.onlineManager.sendAction('action:exchange_cards', { cardIndices: indices });
                } else {
                    const cards = this.selectedCards.map(c => c.card);
                    this.game.exchangeCards(myIndex, cards);
                    setTimeout(() => this.autoExchangeOtherPlayers(), 500);
                    this.render();
                }
                this.selectedCards = [];
            });

            buttonsDiv.appendChild(confirmBtn);
            actionArea.appendChild(buttonsDiv);
        }

        if (this.game.phase === 'decide' && isMyTurn) {
            const trumpChooserIndex = (this.game.dealerIndex + 1) % this.game.players.length;
            const mustPlay = myIndex === trumpChooserIndex || this.game.trump === 'diamonds';

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';

            const playBtn = document.createElement('button');
            playBtn.className = 'btn btn-success';
            playBtn.textContent = mustPlay ? 'Weiter (Pflicht)' : 'Mitspielen';
            playBtn.addEventListener('click', () => {
                if (this.isOnlineMode) {
                    this.onlineManager.sendAction('action:player_decision', { isPlaying: true });
                } else {
                    this.game.playerDecision(myIndex, true);
                    setTimeout(() => this.autoDecideOtherPlayers(), 500);
                    this.render();
                }
            });
            buttonsDiv.appendChild(playBtn);

            if (!mustPlay) {
                const passBtn = document.createElement('button');
                passBtn.className = 'btn btn-secondary';
                passBtn.textContent = 'Aussteigen';
                passBtn.addEventListener('click', () => {
                    if (this.isOnlineMode) {
                        this.onlineManager.sendAction('action:player_decision', { isPlaying: false });
                    } else {
                        this.game.playerDecision(myIndex, false);
                        setTimeout(() => this.autoDecideOtherPlayers(), 500);
                        this.render();
                    }
                });
                buttonsDiv.appendChild(passBtn);
            }

            actionArea.appendChild(buttonsDiv);
        }

        if (this.game.phase === 'play' && !isMyTurn && this.isOnlineMode) {
            const waitInfo = document.createElement('div');
            waitInfo.className = 'exchange-info';
            const currentName = this.game.players[this.game.currentPlayerIndex]
                ? this.game.players[this.game.currentPlayerIndex].name
                : '...';
            waitInfo.textContent = currentName + ' ist am Zug...';
            actionArea.appendChild(waitInfo);
        }

        if (this.game.phase === 'roundEnd') {
            // Show round summary
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'exchange-info';
            let summaryText = 'Runde ' + this.game.roundNumber + ' beendet!';
            summaryDiv.textContent = summaryText;
            actionArea.appendChild(summaryDiv);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';

            if (!this.isOnlineMode || this.myPlayerIndex === 0) {
                const nextBtn = document.createElement('button');
                nextBtn.className = 'btn btn-primary';
                nextBtn.textContent = 'Naechste Runde';
                nextBtn.addEventListener('click', () => {
                    if (this.isOnlineMode) {
                        this.onlineManager.sendAction('action:next_round', {});
                    } else {
                        this.game.nextRound();
                        this.render();
                        if (this.game.currentPlayerIndex !== 0) {
                            setTimeout(() => this.autoSelectTrump(), 1000);
                        }
                    }
                });
                buttonsDiv.appendChild(nextBtn);
            } else {
                const waitInfo = document.createElement('div');
                waitInfo.className = 'exchange-info';
                waitInfo.textContent = 'Warte auf Host...';
                actionArea.appendChild(waitInfo);
            }

            actionArea.appendChild(buttonsDiv);
        }

        if (this.game.phase === 'gameOver') {
            const winners = this.game.players.filter(p => p.score <= 0);
            const lowestScore = Math.min(...winners.map(p => p.score));
            const winner = winners.find(p => p.score === lowestScore);

            const info = document.createElement('div');
            info.className = 'exchange-info';
            const strong = document.createElement('strong');
            strong.textContent = winner.name + ' hat gewonnen!';
            info.appendChild(strong);
            info.appendChild(document.createElement('br'));
            info.appendChild(document.createTextNode('Punktestand: ' + winner.score));
            actionArea.appendChild(info);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'action-buttons';

            const menuBtn = document.createElement('button');
            menuBtn.className = 'btn btn-primary';
            menuBtn.textContent = 'Zurueck zum Menue';
            menuBtn.addEventListener('click', () => {
                if (this.isOnlineMode && this.onlineManager) {
                    this.onlineManager.disconnect();
                }
                this.showScreen('mode');
                this.game.phase = 'setup';
                this.isOnlineMode = false;
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
                label.textContent = this.game.players[play.playerIndex]
                    ? this.game.players[play.playerIndex].name
                    : 'Spieler ' + play.playerIndex;
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
            const strong = document.createElement('strong');
            const winnerName = this.game.players[this.game.trickWinner]
                ? this.game.players[this.game.trickWinner].name
                : 'Spieler ' + this.game.trickWinner;
            strong.textContent = winnerName + ' gewinnt den Stich!';
            winnerText.appendChild(strong);
            trickArea.appendChild(winnerText);
        }
    }

    // --- Local AI auto-play ---

    autoPlayOtherPlayers() {
        if (this.game.phase !== 'play' || this.isOnlineMode) return;

        if (this.game.currentPlayerIndex !== 0 && this.game.players[this.game.currentPlayerIndex].isPlaying) {
            const validCards = this.game.getValidCards(this.game.currentPlayerIndex);
            const randomCard = validCards[Math.floor(Math.random() * validCards.length)];

            setTimeout(() => {
                const result = this.game.playCard(this.game.currentPlayerIndex, randomCard);
                this.render();

                if (result === 'trick_complete') {
                    const roundOver = this.game.evaluateTrick();
                    this.render();
                    if (roundOver) {
                        setTimeout(() => {
                            this.game.endRound();
                            this.render();
                        }, 2000);
                    } else {
                        setTimeout(() => {
                            this.game.clearTrick();
                            this.render();
                            setTimeout(() => this.autoPlayOtherPlayers(), 1000);
                        }, 2000);
                    }
                } else {
                    setTimeout(() => this.autoPlayOtherPlayers(), 1000);
                }
            }, 1000);
        } else {
            this.render();
        }
    }

    autoExchangeOtherPlayers() {
        if (this.isOnlineMode) return;

        if (this.game.phase === 'decide') {
            setTimeout(() => this.autoDecideOtherPlayers(), 500);
            this.render();
            return;
        }

        if (this.game.phase !== 'exchange' || this.game.currentPlayerIndex === 0) {
            this.render();
            return;
        }

        const player = this.game.players[this.game.currentPlayerIndex];
        const exchangeCount = Math.floor(Math.random() * 4);
        const cardsToExchange = player.hand.slice(0, exchangeCount);

        setTimeout(() => {
            this.game.exchangeCards(this.game.currentPlayerIndex, cardsToExchange);
            setTimeout(() => this.autoExchangeOtherPlayers(), 500);
        }, 500);
    }

    autoDecideOtherPlayers() {
        if (this.isOnlineMode) return;

        if (this.game.phase === 'play') {
            setTimeout(() => this.autoPlayOtherPlayers(), 500);
            this.render();
            return;
        }

        if (this.game.phase !== 'decide') {
            this.render();
            return;
        }

        if (this.game.currentPlayerIndex !== 0) {
            const trumpChooserIndex = (this.game.dealerIndex + 1) % this.game.players.length;
            const mustPlay = this.game.currentPlayerIndex === trumpChooserIndex || this.game.trump === 'diamonds';
            const decision = mustPlay ? true : Math.random() > 0.3;

            setTimeout(() => {
                this.game.playerDecision(this.game.currentPlayerIndex, decision);
                setTimeout(() => this.autoDecideOtherPlayers(), 500);
            }, 500);
        } else {
            this.render();
        }
    }

    autoSelectTrump() {
        if (this.game.phase !== 'trump' || this.isOnlineMode) return;

        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        this.game.chooseTrump(randomSuit);
        setTimeout(() => this.autoExchangeOtherPlayers(), 500);
        this.render();
    }
}

// Online Game Manager (P2P)
class OnlineGameManager {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.p2p = null;
        this.trickTimeout = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Mode selection
        document.getElementById('local-mode-btn').addEventListener('click', () => {
            this.showScreen('setup');
        });

        document.getElementById('online-mode-btn').addEventListener('click', () => {
            this.showOnlineScreen();
        });

        // Back buttons
        document.getElementById('back-to-mode').addEventListener('click', () => {
            this.showScreen('mode');
        });

        document.getElementById('back-to-mode-online').addEventListener('click', () => {
            if (this.p2p) {
                this.p2p.disconnect();
                this.p2p = null;
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
            this.startOnlineGame();
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenId}-screen`).classList.add('active');
    }

    showOnlineScreen() {
        this.showScreen('online');
        document.getElementById('connection-status').style.display = 'block';
        document.getElementById('connection-status').textContent = 'Bereit.';
        document.getElementById('online-menu').style.display = 'block';
        document.getElementById('room-view').style.display = 'none';
        document.getElementById('join-room-form').style.display = 'none';
    }

    async createRoom() {
        const playerName = document.getElementById('player-name').value || 'Spieler';
        const statusEl = document.getElementById('connection-status');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Erstelle Raum...';

        try {
            this.p2p = new P2PManager();
            this._setupCallbacks();
            const roomCode = await this.p2p.createRoom(playerName);

            statusEl.style.display = 'none';
            document.getElementById('online-menu').style.display = 'none';
            document.getElementById('room-view').style.display = 'block';
            document.getElementById('room-code-display').textContent = roomCode;
        } catch (error) {
            statusEl.textContent = 'Fehler beim Erstellen: ' + error.message;
            console.error('Create room failed:', error);
        }
    }

    async joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();
        const playerName = document.getElementById('player-name').value || 'Spieler';

        if (roomCode.length !== 6) {
            alert('Bitte gib einen 6-stelligen Raum-Code ein');
            return;
        }

        const statusEl = document.getElementById('connection-status');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Verbinde mit Raum...';

        try {
            this.p2p = new P2PManager();
            this._setupCallbacks();
            await this.p2p.joinRoom(roomCode, playerName);

            statusEl.style.display = 'none';
            document.getElementById('online-menu').style.display = 'none';
            document.getElementById('room-view').style.display = 'block';
            document.getElementById('room-code-display').textContent = roomCode;
        } catch (error) {
            statusEl.textContent = error.message;
            console.error('Join room failed:', error);
            this.p2p = null;
        }
    }

    leaveRoom() {
        if (this.p2p) {
            this.p2p.disconnect();
            this.p2p = null;
        }
        document.getElementById('room-view').style.display = 'none';
        document.getElementById('online-menu').style.display = 'block';
        document.getElementById('join-room-form').style.display = 'none';
    }

    _setupCallbacks() {
        // Room state updates
        this.p2p.onRoomUpdate = (data) => {
            this.updateRoomView(data);
        };

        // Game state updates (received by both host and peers)
        this.p2p.onGameState = (state) => {
            // First game_state: transition peer to game screen
            if (!this.ui.isOnlineMode) {
                this.ui.isOnlineMode = true;
                this.ui.myPlayerIndex = state.myPlayerIndex;
                this.ui.onlineManager = this;
                this.showScreen('game');
            }
            // Only peers apply snapshots; host keeps authoritative state
            if (!this.p2p.isHost) {
                this.game.applySnapshot(state);
            }
            this.ui.myPlayerIndex = state.myPlayerIndex;
            this.ui.render();
        };

        // Error handling
        this.p2p.onError = (message) => {
            console.error('P2P Error:', message);
            alert(message);
        };

        // Disconnect handling
        this.p2p.onDisconnected = (reason) => {
            alert(reason || 'Verbindung verloren');
            this.showScreen('mode');
            this.ui.isOnlineMode = false;
            this.p2p = null;
        };

        // Host: handle actions from peers
        this.p2p.onPeerAction = (playerIndex, actionType, payload) => {
            this._handleAction(playerIndex, actionType, payload);
        };
    }

    // --- Host only: Handle and validate game actions ---
    _handleAction(playerIndex, actionType, payload) {
        if (!this.p2p || !this.p2p.isHost) return;

        switch (actionType) {
            case 'action:choose_trump':
                this._handleChooseTrump(playerIndex, payload);
                break;
            case 'action:exchange_cards':
                this._handleExchangeCards(playerIndex, payload);
                break;
            case 'action:player_decision':
                this._handlePlayerDecision(playerIndex, payload);
                break;
            case 'action:play_card':
                this._handlePlayCard(playerIndex, payload);
                break;
            case 'action:next_round':
                this._handleNextRound(playerIndex);
                break;
        }
    }

    _handleChooseTrump(playerIndex, payload) {
        if (this.game.phase !== 'trump') {
            this.p2p.sendErrorToPeer(playerIndex, 'Nicht in der Trumpf-Phase');
            return;
        }
        if (this.game.currentPlayerIndex !== playerIndex) {
            this.p2p.sendErrorToPeer(playerIndex, 'Du bist nicht dran');
            return;
        }
        if (!this.game.suits.includes(payload.suit)) {
            this.p2p.sendErrorToPeer(playerIndex, 'Ungueltige Farbe');
            return;
        }

        this.game.chooseTrump(payload.suit);
        this.p2p.broadcastGameState(this.game);
    }

    _handleExchangeCards(playerIndex, payload) {
        if (this.game.phase !== 'exchange') {
            this.p2p.sendErrorToPeer(playerIndex, 'Nicht in der Tausch-Phase');
            return;
        }
        if (this.game.currentPlayerIndex !== playerIndex) {
            this.p2p.sendErrorToPeer(playerIndex, 'Du bist nicht dran');
            return;
        }

        const indices = payload.cardIndices || [];
        if (indices.length > 3) {
            this.p2p.sendErrorToPeer(playerIndex, 'Maximal 3 Karten tauschen');
            return;
        }

        this.game.exchangeCardsByIndices(playerIndex, indices);
        this.p2p.broadcastGameState(this.game);
    }

    _handlePlayerDecision(playerIndex, payload) {
        if (this.game.phase !== 'decide') {
            this.p2p.sendErrorToPeer(playerIndex, 'Nicht in der Entscheidungs-Phase');
            return;
        }
        if (this.game.currentPlayerIndex !== playerIndex) {
            this.p2p.sendErrorToPeer(playerIndex, 'Du bist nicht dran');
            return;
        }

        this.game.playerDecision(playerIndex, !!payload.isPlaying);
        this.p2p.broadcastGameState(this.game);
    }

    _handlePlayCard(playerIndex, payload) {
        if (this.game.phase !== 'play') {
            this.p2p.sendErrorToPeer(playerIndex, 'Nicht in der Spiel-Phase');
            return;
        }
        if (this.game.currentPlayerIndex !== playerIndex) {
            this.p2p.sendErrorToPeer(playerIndex, 'Du bist nicht dran');
            return;
        }

        const player = this.game.players[playerIndex];
        const cardIndex = payload.cardIndex;
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            this.p2p.sendErrorToPeer(playerIndex, 'Ungueltige Karte');
            return;
        }

        const card = player.hand[cardIndex];
        const validCards = this.game.getValidCards(playerIndex);
        const isValid = validCards.some(c => c.suit === card.suit && c.rank === card.rank);
        if (!isValid) {
            this.p2p.sendErrorToPeer(playerIndex, 'Diese Karte darf nicht gespielt werden');
            return;
        }

        const result = this.game.playCard(playerIndex, card);
        this.p2p.broadcastGameState(this.game);

        if (result === 'trick_complete') {
            const roundOver = this.game.evaluateTrick();
            this.p2p.broadcastGameState(this.game);

            if (roundOver) {
                this.trickTimeout = setTimeout(() => {
                    this.game.endRound();
                    this.p2p.broadcastGameState(this.game);
                }, 2000);
            } else {
                this.trickTimeout = setTimeout(() => {
                    this.game.clearTrick();
                    this.p2p.broadcastGameState(this.game);
                }, 2000);
            }
        }
    }

    _handleNextRound(playerIndex) {
        // Only host (player 0) can start next round
        if (playerIndex !== 0) {
            this.p2p.sendErrorToPeer(playerIndex, 'Nur der Host kann die naechste Runde starten');
            return;
        }
        if (this.game.phase !== 'roundEnd') {
            return;
        }

        this.game.nextRound();
        this.p2p.broadcastGameState(this.game);
    }

    startOnlineGame() {
        if (!this.p2p || !this.p2p.isHost) return;
        if (this.p2p.players.length < 2) {
            alert('Mindestens 2 Spieler erforderlich');
            return;
        }

        // Initialize game with player names
        const names = this.p2p.players.map(p => p.name);
        this.game.initializePlayers(names.length, names);
        this.game.startRound();

        // Setup UI for online mode
        this.ui.isOnlineMode = true;
        this.ui.myPlayerIndex = this.p2p.myPlayerIndex;
        this.ui.onlineManager = this;

        // Show game screen
        this.showScreen('game');

        // Broadcast initial state to all peers
        this.p2p.broadcastGameState(this.game);
    }

    updateRoomView(data) {
        document.getElementById('room-code-display').textContent = data.roomCode;

        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';
        const title = document.createElement('h3');
        title.textContent = 'Spieler:';
        playersList.appendChild(title);

        data.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;
            playerDiv.appendChild(nameSpan);

            if (this.p2p && player.index === this.p2p.myPlayerIndex) {
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
        startBtn.style.display = (this.p2p && this.p2p.isHost) ? 'block' : 'none';
    }

    // Called by UI when sending actions
    sendAction(actionType, payload) {
        if (!this.p2p) return;
        this.p2p.sendAction(actionType, payload);
    }

    disconnect() {
        if (this.trickTimeout) {
            clearTimeout(this.trickTimeout);
            this.trickTimeout = null;
        }
        if (this.p2p) {
            this.p2p.disconnect();
            this.p2p = null;
        }
    }
}

// Initialize game
const game = new ZwanzigAbGame();
const ui = new GameUI(game);
const onlineManager = new OnlineGameManager(game, ui);

// Initialize player inputs
ui.updatePlayerInputs(4);
