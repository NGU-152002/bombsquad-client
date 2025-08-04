// Multiplayer Game configuration
const multiplayerConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-canvas',
    backgroundColor: '#34495e',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: multiplayerPreload,
        create: multiplayerCreate,
        update: multiplayerUpdate
    }
};

// Game variables
let multiplayerGame;
let multiplayerGameScene;
let multiplayerPlayers = new Map();
let multiplayerBombs = new Map();
let multiplayerPowerUps = new Map();
let multiplayerDestructibleBlocks = [];
let gameState = 'connecting';
let localPlayerId = null;
let roundTimer = 120;

// Connection overlay elements
const connectionOverlay = document.getElementById('connection-overlay');
const connectionMessage = document.getElementById('connection-message');
const gameOverOverlay = document.getElementById('game-over-overlay');
const networkStatus = document.getElementById('network-status');
const yourPlayerIdElement = document.getElementById('your-player-id');
const pingDisplay = document.getElementById('ping-display');

// Initialize the multiplayer game
function initMultiplayerGame() {
    multiplayerGame = new Phaser.Game(multiplayerConfig);
}

function multiplayerPreload() {
    multiplayerGameScene = this;
    
    // Create spark texture for particle effects
    this.add.graphics().fillStyle(0xffaa00).fillCircle(2, 2, 2).generateTexture('spark', 4, 4).destroy();
}

function multiplayerCreate() {
    multiplayerGameScene = this;
    
    // Store references in scene
    this.players = multiplayerPlayers;
    this.bombs = multiplayerBombs;
    this.powerUps = multiplayerPowerUps;
    this.destructibleBlocks = multiplayerDestructibleBlocks;
    
    // Create arena boundaries
    createMultiplayerArena(this);
    
    // Set up network manager
    networkManager.setGameScene(this);
    setupNetworkEvents();
    
    // Add helper functions to scene
    this.getPlayerById = function(playerId) {
        return multiplayerPlayers.get(playerId);
    };
    
    this.updateRemotePlayer = function(playerId, x, y) {
        const player = multiplayerPlayers.get(playerId);
        if (player && !player.isLocal) {
            player.setRemotePosition(x, y);
        }
    };
    
    // Connect to server and join game
    connectToMultiplayerGame();
}

function multiplayerUpdate(time, delta) {
    if (gameState !== 'playing') return;
    
    // Update round timer
    roundTimer -= delta / 1000;
    if (roundTimer <= 0) {
        roundTimer = 0;
        gameState = 'finished';
        
        // Determine winner based on remaining players
        const alivePlayers = Array.from(multiplayerPlayers.values()).filter(p => p.isAlive);
        let winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
        
        // Show game over
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const winnerText = document.getElementById('winner-text');
        if (gameOverOverlay && winnerText) {
            winnerText.textContent = winner ? `${winner.playerData?.name || `Player ${winner.playerId}`} Wins!` : 'Time Up - Draw!';
            gameOverOverlay.style.display = 'flex';
        }
        
        return;
    }
    
    // Update players with error recovery
    if (multiplayerPlayers.size > 0) {
        try {
            multiplayerPlayers.forEach(player => {
                if (player && player.sprite) {
                    player.update();
                }
            });
        } catch (error) {
            console.warn('Player update error:', error);
        }
    }
    
    // Check power-up collisions for local player only
    const localPlayer = multiplayerPlayers.get(localPlayerId);
    if (localPlayer && localPlayer.isAlive && multiplayerPowerUps.size > 0) {
        multiplayerPowerUps.forEach(powerUp => {
            if (powerUp && !powerUp.collected) {
                powerUp.checkCollision(localPlayer);
            }
        });
    }
    
    // Interpolate remote player positions
    if (networkManager) {
        networkManager.interpolateRemotePlayers(multiplayerGameScene);
    }
    
    // Update round timer display
    updateMultiplayerRoundTimer();
    
    // Update ping display
    updatePingDisplay();
}

function createMultiplayerArena(scene) {
    const { width, height } = scene.game.config;
    
    // Create walls
    const wallThickness = 20;
    
    // Top wall
    const topWall = scene.add.rectangle(width / 2, wallThickness / 2, width, wallThickness, 0x7f8c8d);
    scene.matter.add.gameObject(topWall, { isStatic: true });
    
    // Bottom wall
    const bottomWall = scene.add.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, 0x7f8c8d);
    scene.matter.add.gameObject(bottomWall, { isStatic: true });
    
    // Left wall
    const leftWall = scene.add.rectangle(wallThickness / 2, height / 2, wallThickness, height, 0x7f8c8d);
    scene.matter.add.gameObject(leftWall, { isStatic: true });
    
    // Right wall
    const rightWall = scene.add.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, 0x7f8c8d);
    scene.matter.add.gameObject(rightWall, { isStatic: true });
    
    // Add indestructible blocks for cover
    const blockPositions = [
        { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 200, y: 600 },
        { x: 400, y: 200 }, { x: 400, y: 600 },
        { x: 600, y: 200 }, { x: 600, y: 600 },
        { x: 800, y: 200 }, { x: 800, y: 400 }, { x: 800, y: 600 }
    ];
    
    blockPositions.forEach(pos => {
        const block = scene.add.rectangle(pos.x, pos.y, 48, 48, 0x95a5a6);
        block.setStrokeStyle(2, 0x7f8c8d);
        scene.matter.add.gameObject(block, { isStatic: true });
    });
}

function createMultiplayerDestructibleBlocks(blocks) {
    // Clear existing blocks
    multiplayerDestructibleBlocks.forEach(block => {
        if (block && block.destroy) {
            block.destroy();
        }
    });
    multiplayerDestructibleBlocks = [];
    
    // Create blocks from server data
    blocks.forEach(blockData => {
        const block = multiplayerGameScene.add.rectangle(blockData.x, blockData.y, 48, 48, 0xbdc3c7);
        block.setStrokeStyle(2, 0x95a5a6);
        multiplayerGameScene.matter.add.gameObject(block, { isStatic: true });
        block.blockId = blockData.id;
        multiplayerDestructibleBlocks.push(block);
    });
}

function setupNetworkEvents() {
    // Game state events
    networkManager.onRoomJoined = (data) => {
        console.log('Joined multiplayer game');
        localPlayerId = data.playerId;
        yourPlayerIdElement.textContent = localPlayerId;
        
        // Check if game is already playing
        if (data.gameState && data.gameState.gameState === 'playing') {
            console.log('Game already in progress, setting to playing state');
            gameState = 'playing';
            connectionOverlay.style.display = 'none';
            networkStatus.textContent = 'Playing';
            networkStatus.style.color = '#2ecc71';
        }
        
        initializeGameState(data.gameState);
    };
    
    networkManager.onGameStarted = (data) => {
        console.log('Multiplayer game started!');
        gameState = 'playing';
        connectionOverlay.style.display = 'none';
        networkStatus.textContent = 'Playing';
        networkStatus.style.color = '#2ecc71';
        
        // Start ping measurement
        networkManager.startPingMeasurement();
        
        initializeGameState(data);
    };
    
    // Handle game state updates (for synchronization)
    networkManager.onGameStateUpdate = (data) => {
        console.log('Game state update received');
        if (data.gameState === 'playing' && gameState !== 'playing') {
            gameState = 'playing';
            connectionOverlay.style.display = 'none';
            networkStatus.textContent = 'Playing';
            networkStatus.style.color = '#2ecc71';
        }
        updatePlayerStats(data.players);
        updatePlayerHealthAndBombs(data.players);
    };
    
    // Player events
    networkManager.onPlayerJoined = (data) => {
        console.log('Player joined game:', data.player.name);
        addPlayer(data.player);
        updatePlayerStats(data.gameState.players);
    };
    
    networkManager.onPlayerLeft = (data) => {
        console.log('Player left game:', data.playerId);
        removePlayer(data.playerId);
        updatePlayerStats(data.gameState.players);
    };
    
    networkManager.onPlayerMoved = (data) => {
        const player = multiplayerPlayers.get(data.playerId);
        if (player && !player.isLocal) {
            player.setRemotePosition(data.x, data.y);
        }
    };
    
    // Bomb events
    networkManager.onBombPlaced = (data) => {
        const bomb = new MultiplayerBomb(multiplayerGameScene, data.bomb);
        multiplayerBombs.set(data.bomb.id, bomb);
    };
    
    networkManager.onBombExploded = (data) => {
        const bomb = multiplayerBombs.get(data.bombId);
        if (bomb) {
            bomb.explode(data);
            multiplayerBombs.delete(data.bombId);
        }
        
        // Update players from server data
        data.players.forEach(playerData => {
            const player = multiplayerPlayers.get(playerData.id);
            if (player) {
                player.updateFromServer(playerData);
            }
        });
        
        // Update health bars and bomb counts in UI
        updatePlayerHealthAndBombs(data.players);
        
        // Remove destroyed blocks
        if (data.destroyedBlocks) {
            data.destroyedBlocks.forEach(destroyedBlock => {
                const blockIndex = multiplayerDestructibleBlocks.findIndex(block => 
                    block.blockId === destroyedBlock.id
                );
                if (blockIndex > -1) {
                    const block = multiplayerDestructibleBlocks[blockIndex];
                    block.destroy();
                    multiplayerDestructibleBlocks.splice(blockIndex, 1);
                }
            });
        }
        
        // Add new power-ups
        if (data.powerUps) {
            data.powerUps.forEach(powerUpData => {
                if (!multiplayerPowerUps.has(powerUpData.id)) {
                    const powerUp = new MultiplayerPowerUp(multiplayerGameScene, powerUpData);
                    multiplayerPowerUps.set(powerUpData.id, powerUp);
                }
            });
        }
    };
    
    // Power-up events
    networkManager.onPowerUpCollected = (data) => {
        const powerUp = multiplayerPowerUps.get(data.powerUpId);
        if (powerUp) {
            powerUp.destroy();
            multiplayerPowerUps.delete(data.powerUpId);
        }
        
        // Update players from server data
        data.players.forEach(playerData => {
            const player = multiplayerPlayers.get(playerData.id);
            if (player) {
                player.updateFromServer(playerData);
            }
        });
    };
    
    // Game over event
    networkManager.onGameOver = (data) => {
        gameState = 'finished';
        
        let winnerText = 'Draw!';
        if (data.winner) {
            const winnerPlayer = multiplayerPlayers.get(data.winner);
            if (winnerPlayer) {
                winnerText = `${winnerPlayer.nameText.text} Wins!`;
            } else {
                winnerText = `Player ${data.winner} Wins!`;
            }
        }
        
        document.getElementById('winner-text').textContent = winnerText;
        document.getElementById('game-status').textContent = winnerText;
        
        setTimeout(() => {
            gameOverOverlay.style.display = 'flex';
            // Clean up session data
            localStorage.removeItem('bombsquad_session');
        }, 2000);
    };
    
    // Error handling
    networkManager.onError = (data) => {
        console.error('Network error:', data.message);
        connectionMessage.textContent = `Error: ${data.message}`;
        networkStatus.textContent = 'Error';
        networkStatus.style.color = '#e74c3c';
    };
    
    networkManager.onDisconnected = () => {
        console.log('Disconnected from multiplayer server');
        connectionMessage.textContent = 'Disconnected from server';
        networkStatus.textContent = 'Disconnected';
        networkStatus.style.color = '#e74c3c';
        gameState = 'disconnected';
    };
}

async function connectToMultiplayerGame() {
    try {
        connectionMessage.textContent = 'Connecting to server...';
        
        // Get room ID from URL parameters or localStorage fallback
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get('room');
        
        if (!roomId) {
            roomId = localStorage.getItem('bombsquad_roomId');
            if (!roomId) {
                throw new Error('No room ID provided in URL or localStorage');
            }
            console.log('Using room ID from localStorage:', roomId);
        }
        
        // Try to restore session data
        let playerName = 'Player';
        let serverUrl = null;
        
        try {
            const sessionData = localStorage.getItem('bombsquad_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                // Check if session is recent (within 2 minutes)
                if (Date.now() - session.timestamp < 120000 && session.roomId === roomId) {
                    playerName = session.playerName;
                    serverUrl = session.serverUrl;
                    console.log('Restored session data for seamless reconnection');
                }
            }
        } catch (e) {
            console.warn('Failed to restore session data:', e);
        }
        
        // Connect to server with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                await networkManager.connect(serverUrl);
                break;
            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) throw error;
                
                connectionMessage.textContent = `Connection failed, retrying... (${retryCount}/${maxRetries})`;
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
        
        connectionMessage.textContent = 'Joining game room...';
        
        // Join the room with proper player name
        networkManager.joinRoom(roomId, playerName);
        
    } catch (error) {
        console.error('Failed to connect to multiplayer game:', error);
        connectionMessage.textContent = 'Failed to connect. Returning to lobby...';
        
        // Clean up session data
        localStorage.removeItem('bombsquad_session');
        
        setTimeout(() => {
            window.location.href = 'lobby.html';
        }, 3000);
    }
}

function initializeGameState(gameState) {
    // Create players
    gameState.players.forEach(playerData => {
        addPlayer(playerData);
    });
    
    // Create destructible blocks
    if (gameState.destructibleBlocks) {
        createMultiplayerDestructibleBlocks(gameState.destructibleBlocks);
    }
    
    // Create existing bombs
    if (gameState.bombs) {
        gameState.bombs.forEach(bombData => {
            const bomb = new MultiplayerBomb(multiplayerGameScene, bombData);
            multiplayerBombs.set(bombData.id, bomb);
        });
    }
    
    // Create existing power-ups
    if (gameState.powerUps) {
        gameState.powerUps.forEach(powerUpData => {
            const powerUp = new MultiplayerPowerUp(multiplayerGameScene, powerUpData);
            multiplayerPowerUps.set(powerUpData.id, powerUp);
        });
    }
    
    // Update UI
    updatePlayerStats(gameState.players);
    roundTimer = gameState.roundTimer || 120;
}

function addPlayer(playerData) {
    const spawnPositions = [
        { x: 64, y: 64 },
        { x: 1024 - 64, y: 64 },
        { x: 64, y: 768 - 64 },
        { x: 1024 - 64, y: 768 - 64 }
    ];
    
    const spawnPos = spawnPositions[playerData.id - 1];
    const isLocal = playerData.id === localPlayerId;
    
    const player = new MultiplayerPlayer(
        multiplayerGameScene,
        playerData.x || spawnPos.x,
        playerData.y || spawnPos.y,
        playerData.id,
        playerData,
        isLocal
    );
    
    multiplayerPlayers.set(playerData.id, player);
    
    console.log(`Added player ${playerData.id} (${isLocal ? 'local' : 'remote'}):`, playerData.name);
}

function removePlayer(playerId) {
    const player = multiplayerPlayers.get(playerId);
    if (player) {
        player.destroy();
        multiplayerPlayers.delete(playerId);
    }
}

function updatePlayerStats(players) {
    // Show/hide player stat panels
    for (let i = 1; i <= 4; i++) {
        const stat = document.getElementById(`player${i}-stat`);
        if (stat) {
            const player = players.find(p => p.id === i);
            if (player) {
                stat.style.display = 'block';
                stat.style.opacity = player.isAlive ? '1' : '0.5';
                
                // Update player name
                const nameElement = stat.querySelector('.player-name');
                if (nameElement) {
                    nameElement.textContent = player.name || `Player ${i}`;
                    if (i === localPlayerId) {
                        nameElement.textContent += ' (You)';
                    }
                }
            } else {
                stat.style.display = 'none';
            }
        }
    }
}

function updatePlayerHealthAndBombs(players) {
    players.forEach(player => {
        // Update health bar
        const healthBar = document.getElementById(`player${player.id}-health`);
        if (healthBar) {
            const healthPercent = (player.health / 100) * 100;
            healthBar.style.width = Math.max(0, Math.min(100, healthPercent)) + '%';
            if (healthPercent > 60) {
                healthBar.style.backgroundColor = '#2ecc71';
            } else if (healthPercent > 30) {
                healthBar.style.backgroundColor = '#f39c12';
            } else {
                healthBar.style.backgroundColor = '#e74c3c';
            }
        }
        
        // Update bomb count
        const bombsCount = document.getElementById(`player${player.id}-bombs`);
        if (bombsCount) {
            const availableBombs = Math.max(0, player.bombCapacity - player.bombCount);
            bombsCount.textContent = `Bombs: ${availableBombs}`;
        }
        
        // Update game player object if it exists
        const gamePlayer = multiplayerPlayers.get(player.id);
        if (gamePlayer) {
            gamePlayer.updateFromServer(player);
        }
    });
}

function updateMultiplayerRoundTimer() {
    try {
        const timerElement = document.getElementById('round-timer');
        if (timerElement) {
            timerElement.textContent = `Time: ${Math.max(0, Math.ceil(roundTimer))}`;
        }
    } catch (error) {
        console.warn('Failed to update round timer:', error);
    }
}

function updatePingDisplay() {
    if (!pingDisplay || !networkManager) return;
    
    const ping = networkManager.getPing();
    pingDisplay.textContent = `Ping: ${ping}ms`;
    
    // Remove all ping classes
    pingDisplay.classList.remove('ping-good', 'ping-fair', 'ping-poor', 'ping-bad');
    
    // Add appropriate class based on ping
    if (ping < 50) {
        pingDisplay.classList.add('ping-good');
    } else if (ping < 100) {
        pingDisplay.classList.add('ping-fair');
    } else if (ping < 200) {
        pingDisplay.classList.add('ping-poor');
    } else {
        pingDisplay.classList.add('ping-bad');
    }
}

function returnToLobby() {
    if (networkManager) {
        networkManager.disconnect();
    }
    window.location.href = '/';
}


// Initialize the multiplayer game when the page loads
window.addEventListener('load', () => {
    initMultiplayerGame();
});