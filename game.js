// Game configuration
const config = {
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
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let game;
let gameScene;
let powerUpManager;
let gameState = 'MENU';
let roundTimer = 120; // 2 minutes
let playerCount = 2;

// Initialize the game
function initGame() {
    game = new Phaser.Game(config);
}

function preload() {
    gameScene = this;
    
    // Create spark texture once for all particle effects
    this.add.graphics().fillStyle(0xffaa00).fillCircle(2, 2, 2).generateTexture('spark', 4, 4).destroy();
    
    // Create simple textures for sprites if needed
    this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
}

function create() {
    gameScene = this;
    
    // Store references in scene
    this.players = [];
    this.bombs = [];
    this.powerUps = [];
    this.destructibleBlocks = [];
    
    // Create arena boundaries
    createArena(this);
    
    // Create destructible blocks
    createDestructibleBlocks(this);
    
    // Initialize power-up manager
    powerUpManager = new PowerUpManager(this);
    
    // Start with menu
    showMenu();
}

function update(time, delta) {
    if (gameState !== 'PLAYING') return;
    
    // Update players with error recovery
    if (gameScene.players) {
        // Filter out any null/invalid players
        gameScene.players = gameScene.players.filter(player => player && player.sprite);
        
        gameScene.players.forEach(player => {
            if (player && player.isAlive && player.sprite) {
                try {
                    player.update();
                    
                    // Check power-up collisions with error recovery
                    if (gameScene.powerUps) {
                        // Filter out invalid power-ups
                        gameScene.powerUps = gameScene.powerUps.filter(powerUp => 
                            powerUp && !powerUp.collected && powerUp.sprite
                        );
                        
                        gameScene.powerUps.forEach(powerUp => {
                            if (powerUp && !powerUp.collected && powerUp.sprite) {
                                powerUp.checkCollision(player);
                            }
                        });
                    }
                } catch (error) {
                    console.warn('Player update error:', error);
                    // Remove problematic player
                    const index = gameScene.players.indexOf(player);
                    if (index > -1) {
                        gameScene.players.splice(index, 1);
                    }
                }
            }
        });
    }
    
    // Update power-up manager
    if (powerUpManager) {
        powerUpManager.update(delta);
    }
    
    // Update round timer
    updateRoundTimer(delta);
    
    // Check win condition
    checkWinCondition();
}

function createArena(scene) {
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
    
    // Add some indestructible blocks for cover
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

function createDestructibleBlocks(scene) {
    const { width, height } = scene.game.config;
    const blockSize = 48;
    
    // Create a grid of potentially destructible blocks
    for (let x = 100; x < width - 100; x += 64) {
        for (let y = 100; y < height - 100; y += 64) {
            // Skip player spawn areas
            const corners = [
                { x: 64, y: 64 }, { x: width - 64, y: 64 },
                { x: 64, y: height - 64 }, { x: width - 64, y: height - 64 }
            ];
            
            let tooClose = false;
            corners.forEach(corner => {
                if (Math.abs(x - corner.x) < 100 && Math.abs(y - corner.y) < 100) {
                    tooClose = true;
                }
            });
            
            // Skip indestructible block positions
            const indestructible = [
                { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 200, y: 600 },
                { x: 400, y: 200 }, { x: 400, y: 600 },
                { x: 600, y: 200 }, { x: 600, y: 600 },
                { x: 800, y: 200 }, { x: 800, y: 400 }, { x: 800, y: 600 }
            ];
            
            indestructible.forEach(pos => {
                if (Math.abs(x - pos.x) < 50 && Math.abs(y - pos.y) < 50) {
                    tooClose = true;
                }
            });
            
            if (!tooClose && Math.random() < 0.6) {
                const block = scene.add.rectangle(x, y, blockSize, blockSize, 0xbdc3c7);
                block.setStrokeStyle(2, 0x95a5a6);
                scene.matter.add.gameObject(block, { isStatic: true });
                scene.destructibleBlocks.push(block);
            }
        }
    }
}

function startGame(numPlayers) {
    playerCount = numPlayers;
    gameState = 'PLAYING';
    roundTimer = 120;
    
    hideMenu();
    hideGameOver();
    
    // Clear existing game objects
    cleanupGame();
    
    // Create players
    createPlayers(gameScene, numPlayers);
    
    // Show player stats
    for (let i = 1; i <= 4; i++) {
        const stat = document.getElementById(`player${i}-stat`);
        if (i <= numPlayers) {
            stat.style.display = 'block';
            stat.style.opacity = '1';
        } else {
            stat.style.display = 'none';
        }
    }
    
    // Update game status
    document.getElementById('game-status').textContent = 'Fight!';
}

function createPlayers(scene, numPlayers) {
    const { width, height } = scene.game.config;
    const spawnPositions = [
        { x: 64, y: 64 },
        { x: width - 64, y: 64 },
        { x: 64, y: height - 64 },
        { x: width - 64, y: height - 64 }
    ];
    
    scene.players = [];
    
    for (let i = 0; i < numPlayers; i++) {
        const player = new Player(scene, spawnPositions[i].x, spawnPositions[i].y, i + 1);
        scene.players.push(player);
    }
}

function updateRoundTimer(delta) {
    roundTimer -= delta / 1000;
    
    try {
        const timerElement = document.getElementById('round-timer');
        if (timerElement) {
            timerElement.textContent = `Time: ${Math.max(0, Math.ceil(roundTimer))}`;
        }
    } catch (error) {
        console.warn('Failed to update round timer:', error);
    }
    
    if (roundTimer <= 0) {
        // Time's up - sudden death mode or draw
        if (gameScene.players) {
            const alivePlayers = gameScene.players.filter(p => p && p.isAlive);
            if (alivePlayers.length > 1) {
                // Sudden death - start damaging all players
                alivePlayers.forEach(player => {
                    if (player && player.takeDamage) {
                        player.takeDamage(10);
                    }
                });
                roundTimer = 1; // Reset timer for continuous damage
            }
        }
    }
}

function checkWinCondition() {
    if (!gameScene.players) return;
    
    const alivePlayers = gameScene.players.filter(p => p && p.isAlive);
    
    if (alivePlayers.length <= 1) {
        gameState = 'GAME_OVER';
        
        let winnerText = 'Draw!';
        if (alivePlayers.length === 1) {
            winnerText = `Player ${alivePlayers[0].playerId} Wins!`;
        }
        
        // Show game over screen after a delay
        if (gameScene.time) {
            gameScene.time.delayedCall(2000, () => {
                showGameOver(winnerText);
            });
        }
        
        // Update game status
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.textContent = winnerText;
        }
    }
}

function cleanupGame() {
    if (gameScene.players) {
        gameScene.players.forEach(player => {
            if (player && player.destroy) {
                player.destroy();
            }
        });
        gameScene.players = [];
    }
    
    if (gameScene.bombs) {
        gameScene.bombs.forEach(bomb => {
            if (bomb && bomb.destroy) {
                bomb.destroy();
            }
        });
        gameScene.bombs = [];
    }
    
    if (gameScene.powerUps) {
        gameScene.powerUps.forEach(powerUp => {
            if (powerUp && powerUp.destroy) {
                powerUp.destroy();
            }
        });
        gameScene.powerUps = [];
    }
    
    // Reset PowerUp manager
    if (powerUpManager) {
        powerUpManager.spawnTimer = 0;
    }
    
    // Recreate destructible blocks for next game
    if (gameScene.destructibleBlocks) {
        gameScene.destructibleBlocks.forEach(block => {
            if (block && block.destroy) {
                block.destroy();
            }
        });
        gameScene.destructibleBlocks = [];
        createDestructibleBlocks(gameScene);
    }
}

function showMenu() {
    document.getElementById('menu-overlay').style.display = 'flex';
    gameState = 'MENU';
}

function hideMenu() {
    document.getElementById('menu-overlay').style.display = 'none';
}

function showGameOver(winnerText) {
    document.getElementById('winner-text').textContent = winnerText;
    document.getElementById('game-over-overlay').style.display = 'flex';
}

function hideGameOver() {
    document.getElementById('game-over-overlay').style.display = 'none';
}

function restartGame() {
    startGame(playerCount);
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    initGame();
});