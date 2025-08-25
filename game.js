// Utility function for safe array iteration - prevents null reference errors
function safeArrayIteration(array, filterFn, callback) {
    if (!array || !Array.isArray(array)) return;
    
    const validItems = array.filter(item => {
        if (!item) return false;
        return filterFn ? filterFn(item) : true;
    });
    
    if (callback) {
        validItems.forEach(callback);
    }
    
    return validItems;
}

// Utility function to safely get valid game objects
function getValidGameObjects(array, type = 'default') {
    if (!array || !Array.isArray(array)) return [];
    
    const filters = {
        players: item => item && item.isAlive && item.sprite && item.sprite.active,
        blocks: item => item && item.x !== undefined && item.y !== undefined && item.active !== false && !item.destroyed,
        projectiles: item => item && item.sprite && item.sprite.active && item.active,
        bombs: item => item && item.sprite && item.sprite.active && !item.exploded,
        powerUps: item => item && item.sprite && item.sprite.active && !item.collected,
        default: item => item && (!item.sprite || item.sprite.active)
    };
    
    return array.filter(filters[type] || filters.default);
}

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
let cameraZoomManager;
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
    
    // Create shotgun weapon sprites
    createShotgunSprites.call(this);
}

function createShotgunSprites() {
    // Create shotgun idle sprite (brown/dark grey barrel)
    const shotgunGraphics = this.add.graphics();
    shotgunGraphics.fillStyle(0x4a4a4a); // Dark grey barrel
    shotgunGraphics.fillRoundedRect(0, 6, 40, 8, 2); // Main barrel
    shotgunGraphics.fillStyle(0x8B4513); // Brown wood stock
    shotgunGraphics.fillRoundedRect(35, 4, 15, 12, 3); // Stock
    shotgunGraphics.fillStyle(0x2f2f2f); // Darker trigger area
    shotgunGraphics.fillRoundedRect(25, 8, 8, 6, 1); // Trigger guard
    shotgunGraphics.generateTexture('shotgun_idle', 55, 20);
    shotgunGraphics.destroy();
    
    // Create shotgun firing sprite (with muzzle flash)
    const shotgunFireGraphics = this.add.graphics();
    shotgunFireGraphics.fillStyle(0x4a4a4a); // Dark grey barrel
    shotgunFireGraphics.fillRoundedRect(5, 6, 40, 8, 2); // Main barrel (shifted back)
    shotgunFireGraphics.fillStyle(0x8B4513); // Brown wood stock
    shotgunFireGraphics.fillRoundedRect(40, 4, 15, 12, 3); // Stock
    shotgunFireGraphics.fillStyle(0x2f2f2f); // Darker trigger area
    shotgunFireGraphics.fillRoundedRect(30, 8, 8, 6, 1); // Trigger guard
    // Muzzle flash
    shotgunFireGraphics.fillStyle(0xFFFF88); // Bright yellow flash
    shotgunFireGraphics.fillCircle(2, 10, 8); // Main flash
    shotgunFireGraphics.fillStyle(0xFFAA00); // Orange inner flash
    shotgunFireGraphics.fillCircle(2, 10, 5); // Inner flash
    shotgunFireGraphics.fillStyle(0xFF6600); // Red core
    shotgunFireGraphics.fillCircle(2, 10, 2); // Core flash
    shotgunFireGraphics.generateTexture('shotgun_fire', 60, 20);
    shotgunFireGraphics.destroy();
    
    // Create shotgun pellet sprite
    const pelletGraphics = this.add.graphics();
    pelletGraphics.fillStyle(0xFFDD44); // Golden pellet
    pelletGraphics.fillCircle(2, 2, 2);
    pelletGraphics.generateTexture('shotgun_pellet', 4, 4);
    pelletGraphics.destroy();
}

function create() {
    gameScene = this;
    
    // Store references in scene
    this.players = [];
    this.bombs = [];
    this.powerUps = [];
    this.destructibleBlocks = [];
    this.projectiles = [];
    this.flames = [];
    this.meleeAttacks = [];
    
    // Create arena boundaries
    createArena(this);
    
    // Create destructible blocks
    createDestructibleBlocks(this);
    
    // Initialize power-up manager
    powerUpManager = new PowerUpManager(this);
    
    // Initialize camera zoom manager
    cameraZoomManager = new CameraZoomManager(this, this.cameras.main);
    
    // Use simple zoom settings - no presets needed
    
    // Start with menu
    showMenu();
}

function update(time, delta) {
    if (gameState !== 'PLAYING' && gameState !== 'INITIALIZING') return;
    
    // Update players with error recovery
    if (gameScene.players) {
        // Only filter out completely null players, not ones with temporarily missing sprites
        gameScene.players = gameScene.players.filter(player => player !== null && player !== undefined);
        
        // Filter out null/undefined players before iteration
        const validPlayers = gameScene.players.filter(player => 
            player && 
            player.isAlive && 
            player.sprite && 
            player.sprite.active
        );
        
        validPlayers.forEach(player => {
            try {
                player.update(time, delta);
                
                // Check power-up collisions with error recovery
                if (gameScene.powerUps) {
                    // Filter out invalid power-ups
                    gameScene.powerUps = gameScene.powerUps.filter(powerUp => 
                        powerUp && !powerUp.collected && powerUp.sprite
                    );
                    
                    // Filter out null/undefined powerUps before iteration
                    const validPowerUps = gameScene.powerUps.filter(powerUp => 
                        powerUp && 
                        !powerUp.collected && 
                        powerUp.sprite && 
                        powerUp.sprite.active
                    );
                    
                    validPowerUps.forEach(powerUp => {
                        powerUp.checkCollision(player);
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
        });
    }
    
    // Update power-up manager
    if (powerUpManager) {
        powerUpManager.update(delta);
    }
    
    // Update camera zoom manager
    if (cameraZoomManager && gameState === 'PLAYING') {
        cameraZoomManager.update(time, delta);
    }
    
    // Update projectiles
    if (gameScene.projectiles) {
        gameScene.projectiles = gameScene.projectiles.filter(projectile => {
            if (projectile && projectile.active) {
                projectile.update(delta);
                return true;
            }
            return false;
        });
    }
    
    // Update bombs (for trajectory movement)
    if (gameScene.bombs) {
        // Filter out null/undefined bombs before iteration
        const validBombs = gameScene.bombs.filter(bomb => 
            bomb && 
            bomb.update && 
            bomb.sprite && 
            bomb.sprite.active
        );
        
        validBombs.forEach(bomb => {
            bomb.update(delta);
        });
    }
    
    // Update flames
    if (gameScene.flames) {
        gameScene.flames = gameScene.flames.filter(flame => {
            if (flame && flame.active) {
                flame.update(delta);
                return true;
            }
            return false;
        });
    }
    
    // Update melee attacks
    if (gameScene.meleeAttacks) {
        gameScene.meleeAttacks = gameScene.meleeAttacks.filter(attack => {
            return attack && attack.active;
        });
    }
    
    // Update round timer
    updateRoundTimer(delta);
    
    // Check win condition only when game is actually playing
    if (gameState === 'PLAYING') {
        checkWinCondition();
    }
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
    gameState = 'INITIALIZING'; // Prevent early win condition checks
    roundTimer = 120;
    
    hideMenu();
    hideGameOver();
    
    // Clear existing game objects
    cleanupGame();
    
    // Create players
    createPlayers(gameScene, numPlayers);
    
    // Set game state to playing after a brief delay to ensure all players are initialized
    gameScene.time.delayedCall(200, () => {
        gameState = 'PLAYING';
        console.log(`Game started with ${numPlayers} players`);
    });
    
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
    // Spawn positions aligned to 144px grid with proper margins
    const gridSize = 144;
    const spawnPositions = [
        { x: gridSize * 2, y: gridSize * 2 }, // Top-left: 288, 288
        { x: gridSize * 5, y: gridSize * 2 }, // Top-right: 720, 288  
        { x: gridSize * 2, y: gridSize * 4 }, // Bottom-left: 288, 576
        { x: gridSize * 5, y: gridSize * 4 }  // Bottom-right: 720, 576
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
    if (!gameScene.players || gameScene.players.length < 2) return;
    
    // Don't check win condition immediately after game start
    if (roundTimer > 118) return; // Give 2 seconds grace period
    
    const alivePlayers = gameScene.players.filter(p => p && p.isAlive && p.sprite);
    
    // Only trigger game over if we actually have fewer alive players than we started with
    // and at least one frame has passed with all players properly initialized
    if (alivePlayers.length <= 1 && alivePlayers.length < playerCount) {
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
    if (gameScene.players && Array.isArray(gameScene.players)) {
        // Filter out null/undefined players before iteration
        const validPlayers = gameScene.players.filter(player => 
            player && 
            player.destroy
        );
        
        validPlayers.forEach(player => {
            player.destroy();
        });
        
        gameScene.players = [];
    }
    
    if (gameScene.bombs && Array.isArray(gameScene.bombs)) {
        // Filter out null/undefined bombs before iteration
        const validBombs = gameScene.bombs.filter(bomb => 
            bomb && 
            bomb.destroy
        );
        
        validBombs.forEach(bomb => {
            bomb.destroy();
        });
        
        gameScene.bombs = [];
    }
    
    if (gameScene.powerUps && Array.isArray(gameScene.powerUps)) {
        // Filter out null/undefined powerUps before iteration
        const validPowerUps = gameScene.powerUps.filter(powerUp => 
            powerUp && 
            powerUp.destroy
        );
        
        validPowerUps.forEach(powerUp => {
            powerUp.destroy();
        });
        
        gameScene.powerUps = [];
    }
    
    // Clean up projectiles
    if (gameScene.projectiles && Array.isArray(gameScene.projectiles)) {
        // Filter out null/undefined projectiles before iteration
        const validProjectiles = gameScene.projectiles.filter(projectile => 
            projectile && 
            projectile.destroy
        );
        
        validProjectiles.forEach(projectile => {
            projectile.destroy();
        });
        
        gameScene.projectiles = [];
    }
    
    // Clean up flames
    if (gameScene.flames) {
        gameScene.flames.forEach(flame => {
            if (flame && flame.destroy) {
                flame.destroy();
            }
        });
        gameScene.flames = [];
    }
    
    // Clean up melee attacks
    if (gameScene.meleeAttacks) {
        gameScene.meleeAttacks.forEach(attack => {
            if (attack && attack.destroy) {
                attack.destroy();
            }
        });
        gameScene.meleeAttacks = [];
    }
    
    // Reset PowerUp manager
    if (powerUpManager) {
        powerUpManager.spawnTimer = 0;
    }
    
    // Reset camera zoom
    if (cameraZoomManager) {
        cameraZoomManager.reset();
    }
    
    // Recreate destructible blocks for next game
    if (gameScene.destructibleBlocks && Array.isArray(gameScene.destructibleBlocks)) {
        // Filter out null/undefined blocks before iteration
        const validBlocks = gameScene.destructibleBlocks.filter(block => 
            block && 
            block.destroy
        );
        
        validBlocks.forEach(block => {
            block.destroy();
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