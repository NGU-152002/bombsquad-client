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
let isConnecting = false; // Prevent multiple connection attempts

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
    console.log('🎮 MULTIPLAYER CREATE - Scene initialization starting...');
    multiplayerGameScene = this;
    
    // Store references in scene
    this.players = multiplayerPlayers;
    this.bombs = multiplayerBombs;
    this.powerUps = multiplayerPowerUps;
    this.destructibleBlocks = multiplayerDestructibleBlocks;
    
    // Initialize weapon system arrays - EXACT same as offline mode
    this.projectiles = [];
    this.flames = [];
    this.meleeAttacks = [];
    
    // Mark scene as being initialized but not ready yet
    this.sceneReady = false;
    this.initializationPhase = 'creating_scene';
    
    console.log('🎮 Multiplayer scene arrays initialized');
    
    // Wait for physics world to be fully ready before proceeding
    console.log('⏳ Waiting for physics world to be ready...');
    
    // Use scene's built-in ready event to ensure everything is initialized
    this.matter.world.on('beforeupdate', () => {
        if (!this.sceneReady) {
            console.log('✅ Physics world is ready, completing scene initialization...');
            this.sceneReady = true;
            this.initializationPhase = 'physics_ready';
            completeSceneInitialization();
        }
    });
    
    // Also set a timeout fallback in case physics world doesn't trigger
    setTimeout(() => {
        if (!this.sceneReady) {
            console.log('⏰ Physics world timeout, force completing initialization...');
            this.sceneReady = true;
            this.initializationPhase = 'force_ready';
            completeSceneInitialization();
        }
    }, 2000);
}

function completeSceneInitialization() {
    console.log('🏗️ Completing scene initialization...');
    
    if (!multiplayerGameScene) {
        console.error('❌ No multiplayer game scene available!');
        return;
    }
    
    try {
        // Create arena boundaries
        console.log('🏟️ Creating arena boundaries...');
        createMultiplayerArena(multiplayerGameScene);
        
        // Set up network manager
        console.log('🌐 Setting up network manager...');
        networkManager.setGameScene(multiplayerGameScene);
        setupNetworkEvents();
        
        // Set up helper functions
        setupMultiplayerHelpers();
        
        // Connect to server now that scene is ready
        console.log('🔌 Connecting to multiplayer game...');
        connectToMultiplayerGame();
        
        // Start periodic UI refresh
        startPeriodicUIRefresh();
        
        console.log('✅ Scene initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Scene initialization failed:', error);
        console.error('Stack trace:', error.stack);
        
        // Retry initialization after delay
        setTimeout(() => {
            console.log('🔄 Retrying scene initialization...');
            completeSceneInitialization();
        }, 2000);
    }
}

// Add helper functions to the global multiplayer system
function setupMultiplayerHelpers() {
    if (!multiplayerGameScene) return;
    
    multiplayerGameScene.getPlayerById = function(playerId) {
        return multiplayerPlayers.get(playerId);
    };
    
    multiplayerGameScene.updateRemotePlayer = function(playerId, x, y) {
        const player = multiplayerPlayers.get(playerId);
        if (player && !player.isLocal) {
            player.setRemotePosition(x, y);
        }
    };
    
    console.log('🛠️ Multiplayer helper functions set up');
}

// Helper function to get the local player
function getLocalPlayer() {
    for (let player of multiplayerPlayers.values()) {
        if (player.isLocal) {
            return player;
        }
    }
    return null;
}

// Set up periodic UI refresh to catch any missed updates
function startPeriodicUIRefresh() {
    setInterval(() => {
        console.log('🔄 Periodic UI refresh check - gameState:', gameState, 'players:', multiplayerPlayers.size);
        if (gameState === 'playing' && multiplayerPlayers.size > 0) {
            forceUIRefresh();
        } else if (gameState === 'waiting' && multiplayerPlayers.size > 0) {
            // Also refresh during waiting state to show joined players
            console.log('🔄 Refreshing UI during waiting state');
            forceUIRefresh();
        }
    }, 2000); // Refresh every 2 seconds
}

function multiplayerUpdate(time, delta) {
    if (gameState !== 'playing') return;
    
    // Update players
    multiplayerPlayers.forEach(player => {
        if (player && player.update) {
            player.update(time, delta);
        }
    });
    
    // Update projectiles - EXACT same as offline
    if (multiplayerGameScene && multiplayerGameScene.projectiles) {
        multiplayerGameScene.projectiles = multiplayerGameScene.projectiles.filter(projectile => {
            if (projectile && projectile.active) {
                projectile.update(delta);
                return true;
            }
            return false;
        });
    }
    
    // Update flames - EXACT same as offline
    if (multiplayerGameScene && multiplayerGameScene.flames) {
        multiplayerGameScene.flames = multiplayerGameScene.flames.filter(flame => {
            if (flame && flame.active) {
                flame.update(delta);
                return true;
            }
            return false;
        });
    }
    
    // Update melee attacks - EXACT same as offline
    if (multiplayerGameScene && multiplayerGameScene.meleeAttacks) {
        multiplayerGameScene.meleeAttacks = multiplayerGameScene.meleeAttacks.filter(attack => {
            return attack && attack.active;
        });
    }
    
    // Debug weapon system activity
    if (multiplayerGameScene) {
        const projectileCount = multiplayerGameScene.projectiles?.length || 0;
        const flameCount = multiplayerGameScene.flames?.length || 0;
        const meleeCount = multiplayerGameScene.meleeAttacks?.length || 0;
        
        if (projectileCount > 0 || flameCount > 0 || meleeCount > 0) {
            console.log(`🎮 Weapon activity: projectiles=${projectileCount}, flames=${flameCount}, melee=${meleeCount}`);
        }
    }
    
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
    console.log('🧱🧱🧱 CREATE MULTIPLAYER BLOCKS - DETAILED DEBUG 🧱🧱🧱');
    console.log('📊 Function entry timestamp:', new Date().toISOString());
    console.log('📝 Blocks to create:', blocks.length);
    console.log('🏗️ Scene ready state:', multiplayerGameScene?.sceneReady);
    console.log('🔧 Physics world state:', multiplayerGameScene?.matter?.world ? 'Ready' : 'Not Ready');
    console.log('📊 Current blocks count before clear:', multiplayerDestructibleBlocks.length);
    
    try {
        // Clear existing blocks
        console.log('🧹 Clearing existing blocks...');
        multiplayerDestructibleBlocks.forEach(block => {
            if (block && block.destroy) {
                block.destroy();
            }
        });
        multiplayerDestructibleBlocks = [];
        console.log('✅ Existing blocks cleared');
        
        console.log('🏗️ Starting block creation...');
        // Create blocks from server data
        blocks.forEach((blockData, index) => {
            console.log(`  🧱 Creating block ${index + 1}/${blocks.length}:`, {
                x: blockData.x,
                y: blockData.y,
                id: blockData.id
            });
            
            try {
                const block = multiplayerGameScene.add.rectangle(blockData.x, blockData.y, 48, 48, 0xbdc3c7);
                console.log(`    ✅ Rectangle created for block ${index + 1}`);
                
                block.setStrokeStyle(2, 0x95a5a6);
                console.log(`    ✅ Stroke style set for block ${index + 1}`);
                
                multiplayerGameScene.matter.add.gameObject(block, { isStatic: true });
                console.log(`    ✅ Physics body added for block ${index + 1}`);
                
                block.blockId = blockData.id;
                multiplayerDestructibleBlocks.push(block);
                console.log(`    ✅ Block ${index + 1} added to array`);
                
            } catch (blockError) {
                console.error(`    ❌ Failed to create block ${index + 1}:`, blockError);
                console.error(`    Stack trace:`, blockError.stack);
            }
        });
        
        console.log('✅✅✅ BLOCK CREATION COMPLETED');
        console.log('📊 Final blocks count:', multiplayerDestructibleBlocks.length);
        console.log('📊 Blocks array:', multiplayerDestructibleBlocks.map(b => ({ x: b.x, y: b.y, id: b.blockId })));
        
        // Verify blocks are visible
        setTimeout(() => {
            console.log('🔍 Block visibility verification:');
            multiplayerDestructibleBlocks.forEach((block, index) => {
                console.log(`  Block ${index + 1}: visible=${block.visible}, active=${block.active}, alpha=${block.alpha}`);
            });
        }, 100);
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in createMultiplayerDestructibleBlocks:', error);
        console.error('Stack trace:', error.stack);
    }
}

function createMultiplayerBlocksFallback() {
    console.log('🔧 Creating multiplayer blocks locally (fallback mode)');
    
    if (!multiplayerGameScene) {
        console.error('❌ No multiplayer game scene available for block creation');
        console.log('⏳ Retrying block creation in 1 second...');
        setTimeout(createMultiplayerBlocksFallback, 1000);
        return;
    }
    
    if (!multiplayerGameScene.sceneReady) {
        console.error('❌ Scene not ready for block creation');
        console.log('⏳ Retrying block creation in 1 second...');
        setTimeout(createMultiplayerBlocksFallback, 1000);
        return;
    }
    
    if (!multiplayerGameScene.matter || !multiplayerGameScene.matter.world) {
        console.error('❌ Physics world not ready for block creation');
        console.log('⏳ Retrying block creation in 1 second...');
        setTimeout(createMultiplayerBlocksFallback, 1000);
        return;
    }
    
    // Clear existing blocks
    multiplayerDestructibleBlocks.forEach(block => {
        if (block && block.destroy) {
            block.destroy();
        }
    });
    multiplayerDestructibleBlocks = [];
    
    try {
        // Use exact same generation logic as offline mode
        const { width, height } = multiplayerGameScene.game.config;
        const blockSize = 48;
        
        console.log(`🔧 Generating blocks in ${width}x${height} area`);
        let blocksCreated = 0;
        
        // Create a grid of potentially destructible blocks - EXACT same as offline
        for (let x = 100; x < width - 100; x += 64) {
            for (let y = 100; y < height - 100; y += 64) {
            // Skip player spawn areas - EXACT same as offline
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
            
            // Skip indestructible block positions - EXACT same as offline
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
            
            // 60% chance to create a block - EXACT same as offline
            if (!tooClose && Math.random() < 0.6) {
                try {
                    const block = multiplayerGameScene.add.rectangle(x, y, blockSize, blockSize, 0xbdc3c7);
                    block.setStrokeStyle(2, 0x95a5a6);
                    multiplayerGameScene.matter.add.gameObject(block, { isStatic: true });
                    block.x = x; // Store coordinates for weapon collision
                    block.y = y;
                    block.active = true;
                    block.destroyed = false;
                    multiplayerDestructibleBlocks.push(block);
                    blocksCreated++;
                } catch (blockError) {
                    console.error(`❌ Failed to create block at (${x}, ${y}):`, blockError);
                }
            }
        }
    }
    
        // Update scene reference
        multiplayerGameScene.destructibleBlocks = multiplayerDestructibleBlocks;
        
        console.log(`🔧 Successfully created ${blocksCreated} destructible blocks locally`);
        console.log(`📊 Total blocks in array: ${multiplayerDestructibleBlocks.length}`);
        
        if (blocksCreated === 0) {
            throw new Error('No blocks were created - scene may not be ready');
        }
        
    } catch (error) {
        console.error('❌ Block creation failed:', error);
        console.error('Stack trace:', error.stack);
        
        // Retry block creation after delay
        console.log('⏳ Retrying block creation in 2 seconds...');
        setTimeout(() => {
            console.log('🔄 Retrying block creation...');
            createMultiplayerBlocksFallback();
        }, 2000);
    }
}

function setupNetworkEvents() {
    // Game state events
    networkManager.onRoomJoined = (data) => {
        console.log('🚪 Joined multiplayer game, localPlayerId:', data.playerId);
        console.log('🎮 Game state on join:', data.gameState);
        console.log('👥 Players on join:', data.gameState.players);
        
        isConnecting = false; // Reset connection flag on successful join
        localPlayerId = data.playerId;
        yourPlayerIdElement.textContent = localPlayerId;
        
        // Simplified network status logic
        if (data.gameState && data.gameState.gameState === 'playing') {
            gameState = 'playing';
            connectionOverlay.style.display = 'none';
            networkStatus.textContent = 'Playing';
            networkStatus.style.color = '#2ecc71';
        } else {
            gameState = 'waiting';
            networkStatus.textContent = 'Waiting for players';
            networkStatus.style.color = '#f39c12';
        }
        
        // Start ping measurement as soon as we join
        networkManager.startPingMeasurement();
        
        initializeGameState(data.gameState);
    };
    
    networkManager.onGameStarted = (data) => {
        console.log('🎯🎯🎯 MULTIPLAYER GAME STARTED - COMPREHENSIVE DEBUG 🎯🎯🎯');
        console.log('📊 Current timestamp:', new Date().toISOString());
        console.log('🔍 Game state before start:', gameState);
        console.log('🎮 Complete game start data:', JSON.stringify(data, null, 2));
        console.log('👥 Players on game start:', data.players);
        console.log('🏗️ Scene ready state:', multiplayerGameScene?.sceneReady);
        console.log('🔧 Physics world state:', multiplayerGameScene?.matter?.world ? 'Ready' : 'Not ready');
        console.log('🗺️ Current players in map:', multiplayerPlayers.size);
        console.log('🧱 Current blocks count:', multiplayerDestructibleBlocks.length);
        
        // Step 1: Update game state
        console.log('📝 STEP 1: Updating game state to playing...');
        gameState = 'playing';
        connectionOverlay.style.display = 'none';
        networkStatus.textContent = 'Playing';
        networkStatus.style.color = '#2ecc71';
        console.log('✅ Game state updated successfully');
        
        // Step 2: Start ping measurement
        console.log('📝 STEP 2: Starting ping measurement...');
        try {
            networkManager.startPingMeasurement();
            console.log('✅ Ping measurement started successfully');
        } catch (error) {
            console.error('❌ Ping measurement failed:', error);
        }
        
        // Step 3: Store game start data for debugging and recovery
        console.log('📝 STEP 3A: Storing game start data for debugging/recovery...');
        window.lastGameStartData = data;
        console.log('✅ Game start data stored');
        
        // Step 3B: Initialize game state (CRITICAL STEP)
        console.log('📝 STEP 3B: Initializing game state (CRITICAL STEP)...');
        console.log('⚠️ This is where everything usually breaks - watching closely...');
        try {
            initializeGameState(data);
            console.log('✅ initializeGameState completed without throwing error');
        } catch (error) {
            console.error('❌ CRITICAL ERROR in initializeGameState:', error);
            console.error('Stack trace:', error.stack);
            console.log('🔄 Attempting recovery...');
            
            // Recovery attempt
            setTimeout(() => {
                console.log('🔄 Recovery attempt: Re-running initializeGameState...');
                try {
                    initializeGameState(data);
                } catch (recoveryError) {
                    console.error('❌ Recovery failed:', recoveryError);
                }
            }, 2000);
        }
        
        // Step 4: Verify initialization results
        console.log('📝 STEP 4: Verifying initialization results...');
        setTimeout(() => {
            console.log('🔍 POST-INITIALIZATION VERIFICATION:');
            console.log('  👥 Players in map:', multiplayerPlayers.size);
            console.log('  🧱 Blocks count:', multiplayerDestructibleBlocks.length);
            console.log('  🎯 Local player ID:', localPlayerId);
            console.log('  🗺️ Map contents:', Array.from(multiplayerPlayers.keys()));
            
            if (multiplayerPlayers.size === 0) {
                console.error('❌ CRITICAL: No players created after initialization!');
            }
            if (multiplayerDestructibleBlocks.length === 0) {
                console.error('❌ CRITICAL: No blocks created after initialization!');
            }
        }, 1000);
        
        // Step 5: Multiple UI refresh attempts
        console.log('📝 STEP 5: Starting multiple UI refresh attempts...');
        [1000, 2000, 3000, 5000].forEach((delay, index) => {
            setTimeout(() => {
                console.log(`🔄 UI refresh attempt ${index + 1} (${delay}ms after game start)`);
                console.log(`  Pre-refresh - Players: ${multiplayerPlayers.size}, Blocks: ${multiplayerDestructibleBlocks.length}`);
                try {
                    forceUIRefresh();
                    console.log(`✅ UI refresh attempt ${index + 1} completed`);
                } catch (error) {
                    console.error(`❌ UI refresh attempt ${index + 1} failed:`, error);
                }
            }, delay);
        });
        
        // Step 6: Continuous monitoring
        console.log('📝 STEP 6: Starting continuous monitoring...');
        let monitoringInterval = setInterval(() => {
            console.log('📊 CONTINUOUS MONITOR:', {
                timestamp: new Date().toISOString(),
                gameState: gameState,
                playersCount: multiplayerPlayers.size,
                blocksCount: multiplayerDestructibleBlocks.length,
                sceneReady: multiplayerGameScene?.sceneReady,
                physicsReady: multiplayerGameScene?.matter?.world ? true : false
            });
            
            // Stop monitoring after 30 seconds
            if (Date.now() - new Date().getTime() > 30000) {
                clearInterval(monitoringInterval);
                console.log('📊 Continuous monitoring stopped after 30 seconds');
            }
        }, 5000);
        
        console.log('🎯 GAME START HANDLER COMPLETED - All steps initiated');
    };
    
    // Handle game state updates (for synchronization)
    networkManager.onGameStateUpdate = (data) => {
        console.log('Game state update received:', data.gameState);
        
        // Simplified synchronization - only update if actually different
        if (data.gameState !== gameState) {
            gameState = data.gameState;
            
            if (gameState === 'playing') {
                connectionOverlay.style.display = 'none';
                networkStatus.textContent = 'Playing';
                networkStatus.style.color = '#2ecc71';
            } else if (gameState === 'waiting') {
                networkStatus.textContent = 'Waiting for players';
                networkStatus.style.color = '#f39c12';
            }
        }
        
        // Update player data
        if (data.players) {
            updatePlayerStats(data.players);
            updatePlayerHealthAndBombs(data.players);
        }
        
        // Update round timer
        if (data.roundTimer !== undefined) {
            roundTimer = data.roundTimer;
        }
    };
    
    // Player events
    networkManager.onPlayerJoined = (data) => {
        console.log('🔥 Player joined game:', data.player.name);
        console.log('👥 All players after join:', data.gameState.players);
        console.log('🎮 Game state after join:', data.gameState.gameState);
        
        addPlayer(data.player);
        updatePlayerStats(data.gameState.players);
        
        // Only update status if game state actually changed
        if (data.gameState.gameState !== gameState) {
            gameState = data.gameState.gameState;
            if (gameState === 'playing') {
                networkStatus.textContent = 'Playing';
                networkStatus.style.color = '#2ecc71';
            } else {
                networkStatus.textContent = 'Waiting for players';
                networkStatus.style.color = '#f39c12';
            }
        }
        
        // Multiple UI refresh attempts after player join
        console.log('🔄 Starting UI refresh attempts after player join...');
        setTimeout(() => {
            console.log('🔄 UI refresh attempt 1 (500ms after player join)');
            forceUIRefresh();
        }, 500);
        
        setTimeout(() => {
            console.log('🔄 UI refresh attempt 2 (1500ms after player join)');
            forceUIRefresh();
        }, 1500);
    };
    
    networkManager.onPlayerLeft = (data) => {
        console.log('Player left game:', data.playerId);
        removePlayer(data.playerId);
        updatePlayerStats(data.gameState.players);
    };
    
    // Handle server position updates (replaces individual playerMoved events)
    networkManager.onPlayersPositionUpdate = (data) => {
        // This is now handled in NetworkManager.handlePlayersPositionUpdate
        // No need for additional processing here
    };
    
    // Handle weapon firing
    networkManager.onWeaponFired = (data) => {
        console.log('🎆 Weapon fired event received:', data);
        
        // Get the firing player to trigger their weapon system effects
        const firingPlayer = multiplayerPlayers.get(data.playerId);
        if (firingPlayer && firingPlayer !== getLocalPlayer()) {
            // Use the player's weapon system to create remote effects
            if (firingPlayer.weaponSystem) {
                firingPlayer.weaponSystem.handleRemoteWeaponFire(data);
            } else {
                // Fallback to old method if weapon system not available
                createWeaponEffect(data.weapon);
            }
        }
    };
    
    // Handle player damage
    networkManager.onPlayerDamaged = (data) => {
        const player = multiplayerPlayers.get(data.playerId);
        if (player) {
            // Apply damage and show damage number
            player.takeDamage(data.damage, data.damageType);
        }
    };
    
    // Handle player elimination
    networkManager.onPlayerEliminated = (data) => {
        const player = multiplayerPlayers.get(data.playerId);
        const killer = multiplayerPlayers.get(data.killerId);
        
        if (player) {
            player.die();
        }
        
        // Show kill feed message
        showKillFeed(killer?.playerData?.name || `Player ${data.killerId}`, 
                     player?.playerData?.name || `Player ${data.playerId}`, 
                     data.weaponType);
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
        
        // Handle specific error cases
        if (data.message === 'Room not found') {
            connectionMessage.textContent = 'Room not found. Creating new room...';
            // Clear invalid room data
            localStorage.removeItem('bombsquad_roomId');
            localStorage.removeItem('bombsquad_session');
            
            // Redirect to lobby after a delay
            setTimeout(() => {
                window.location.href = 'lobby.html';
            }, 2000);
        } else if (data.message === 'Room is full') {
            connectionMessage.textContent = 'Room is full. Returning to lobby...';
            setTimeout(() => {
                window.location.href = 'lobby.html';
            }, 2000);
        } else {
            connectionMessage.textContent = `Error: ${data.message}`;
        }
        
        networkStatus.textContent = 'Error';
        networkStatus.style.color = '#e74c3c';
    };
    
    networkManager.onDisconnected = () => {
        console.log('Disconnected from multiplayer server');
        connectionMessage.textContent = 'Disconnected from server';
        networkStatus.textContent = 'Disconnected';
        networkStatus.style.color = '#e74c3c';
        gameState = 'disconnected';
        
        // Simplified - no auto-reconnect during normal gameplay to prevent loops
        setTimeout(() => {
            if (gameState === 'disconnected') {
                window.location.href = 'lobby.html';
            }
        }, 3000);
    };
}

async function connectToMultiplayerGame() {
    if (isConnecting) {
        console.log('[DEBUG] Connection already in progress, ignoring duplicate call');
        return;
    }
    
    isConnecting = true;
    
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
        
        // Validate room ID format (should start with 'room_')
        if (!roomId.startsWith('room_')) {
            console.warn('Invalid room ID format:', roomId);
            localStorage.removeItem('bombsquad_roomId');
            localStorage.removeItem('bombsquad_session');
            throw new Error('Invalid room ID format. Redirecting to lobby...');
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
        isConnecting = false; // Reset flag on error
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
    console.log('🏗️🏗️🏗️ INITIALIZE GAME STATE - SUPER DETAILED DEBUG 🏗️🏗️🏗️');
    console.log('📊 Function entry timestamp:', new Date().toISOString());
    console.log('📊 Complete game state received:', JSON.stringify(gameState, null, 2));
    console.log('🔍 Game state type:', typeof gameState);
    console.log('🔍 Game state keys:', Object.keys(gameState || {}));
    console.log('👥 Player count in game state:', gameState?.players?.length || 0);
    console.log('🎯 Current local player ID:', localPlayerId);
    console.log('🏗️ Scene ready state:', multiplayerGameScene?.sceneReady);
    console.log('🔧 Physics world state:', multiplayerGameScene?.matter?.world ? 'Ready' : 'Not ready');
    
    // Pre-check scene readiness
    if (!multiplayerGameScene) {
        console.error('❌ CRITICAL: multiplayerGameScene is null/undefined!');
        console.log('🔄 Cannot proceed with initialization - scene missing');
        return;
    }
    
    if (!multiplayerGameScene.sceneReady) {
        console.error('❌ CRITICAL: Scene not ready for initialization!');
        console.log('🔄 Scene readiness state:', multiplayerGameScene.sceneReady);
        console.log('🔄 Initialization phase:', multiplayerGameScene.initializationPhase);
        return;
    }
    
    // STEP 1: Create players
    console.log('📝 STEP 1: Processing players...');
    if (gameState.players && gameState.players.length > 0) {
        console.log('✅ Players array found with', gameState.players.length, 'players');
        console.log('📝 Processing each player individually:');
        
        gameState.players.forEach((playerData, index) => {
            console.log(`  🧑 Processing Player ${index + 1}/${gameState.players.length}:`);
            console.log(`    📝 ID: ${playerData.id}`);
            console.log(`    📝 Name: ${playerData.name}`);
            console.log(`    📝 Position: (${playerData.x}, ${playerData.y})`);
            console.log(`    📝 Alive: ${playerData.isAlive}`);
            console.log(`    📝 Health: ${playerData.health}`);
            
            try {
                console.log(`    🔄 Calling addPlayer for ${playerData.id}...`);
                addPlayer(playerData);
                console.log(`    ✅ addPlayer completed for ${playerData.id}`);
            } catch (error) {
                console.error(`    ❌ addPlayer failed for ${playerData.id}:`, error);
                console.error(`    Stack trace:`, error.stack);
            }
        });
        
        // Verify players were added
        setTimeout(() => {
            console.log('🔍 Player creation verification:');
            console.log('  🗺️ multiplayerPlayers size:', multiplayerPlayers.size);
            console.log('  🗺️ multiplayerPlayers keys:', Array.from(multiplayerPlayers.keys()));
            
            if (multiplayerPlayers.size !== gameState.players.length) {
                console.error('❌ MISMATCH: Expected', gameState.players.length, 'players, got', multiplayerPlayers.size);
            } else {
                console.log('✅ Player count matches expected');
            }
        }, 500);
        
    } else {
        console.error('❌ CRITICAL: No players array in game state or empty array!');
        console.log('  🔍 gameState.players value:', gameState.players);
        console.log('  🔍 gameState.players type:', typeof gameState.players);
        console.log('  🔍 Is array?', Array.isArray(gameState.players));
    }
    
    // STEP 2: Create destructible blocks
    console.log('📝 STEP 2: Processing blocks...');
    console.log('  🧱 DETAILED BLOCK DEBUG:');
    console.log('    🔍 gameState has destructibleBlocks property?', 'destructibleBlocks' in gameState);
    console.log('    🔍 destructibleBlocks value:', gameState.destructibleBlocks);
    console.log('    🔍 destructibleBlocks type:', typeof gameState.destructibleBlocks);
    console.log('    🔍 destructibleBlocks is array?', Array.isArray(gameState.destructibleBlocks));
    console.log('    📊 Current blocks count before processing:', multiplayerDestructibleBlocks.length);
    
    if (gameState.destructibleBlocks && Array.isArray(gameState.destructibleBlocks) && gameState.destructibleBlocks.length > 0) {
        console.log('✅ Server provided', gameState.destructibleBlocks.length, 'destructible blocks');
        console.log('🔄 Calling createMultiplayerDestructibleBlocks...');
        try {
            createMultiplayerDestructibleBlocks(gameState.destructibleBlocks);
            console.log('✅ createMultiplayerDestructibleBlocks completed');
        } catch (error) {
            console.error('❌ createMultiplayerDestructibleBlocks failed:', error);
            console.error('Stack trace:', error.stack);
        }
    } else {
        console.error('❌ NO DESTRUCTIBLE BLOCKS IN GAME STATE! Server didn\'t provide blocks!');
        console.log('  🔧 Falling back to local block creation...');
        try {
            createMultiplayerBlocksFallback();
            console.log('✅ Block fallback completed');
        } catch (error) {
            console.error('❌ Block fallback failed:', error);
            console.error('Stack trace:', error.stack);
        }
    }
    
    // Double-check blocks were created
    setTimeout(() => {
        console.log('🔍 Block verification after creation:');
        console.log('  multiplayerDestructibleBlocks.length:', multiplayerDestructibleBlocks.length);
        console.log('  multiplayerGameScene.destructibleBlocks?.length:', multiplayerGameScene.destructibleBlocks?.length);
        
        if (multiplayerDestructibleBlocks.length === 0) {
            console.log('  ⚠️ Still no blocks! Force creating blocks...');
            createMultiplayerBlocksFallback();
        }
    }, 500);
    
    // Create existing bombs
    if (gameState.bombs) {
        console.log('  💣 Creating', gameState.bombs.length, 'existing bombs');
        gameState.bombs.forEach(bombData => {
            const bomb = new MultiplayerBomb(multiplayerGameScene, bombData);
            multiplayerBombs.set(bombData.id, bomb);
        });
    }
    
    // Create existing power-ups
    if (gameState.powerUps) {
        console.log('  ⚡ Creating', gameState.powerUps.length, 'existing power-ups');
        gameState.powerUps.forEach(powerUpData => {
            const powerUp = new MultiplayerPowerUp(multiplayerGameScene, powerUpData);
            multiplayerPowerUps.set(powerUpData.id, powerUp);
        });
    }
    
    // Update UI immediately
    console.log('  🎨 Immediate UI update with server data');
    updatePlayerStats(gameState.players || []);
    
    // Force UI update after a short delay to ensure DOM is ready and all players are added
    setTimeout(() => {
        console.log('  🔄 Delayed UI update (500ms) - calling both updatePlayerStats and forceUIRefresh');
        updatePlayerStats(gameState.players || []);
        forceUIRefresh();
    }, 500);
    
    roundTimer = gameState.roundTimer || 120;
    console.log('  ⏱️ Set round timer to:', roundTimer);
}

function addPlayer(playerData) {
    console.log('🧑🧑🧑 ADD PLAYER - COMPREHENSIVE DEBUG 🧑🧑🧑');
    console.log('📊 Function entry timestamp:', new Date().toISOString());
    console.log('📝 Complete player data received:', JSON.stringify(playerData, null, 2));
    console.log('🔍 Player data type:', typeof playerData);
    console.log('🔍 Player data keys:', Object.keys(playerData || {}));
    console.log('🎯 Local player ID:', localPlayerId);
    console.log('🗺️ Current Map size before add:', multiplayerPlayers.size);
    console.log('🔍 Current Map keys:', Array.from(multiplayerPlayers.keys()));
    console.log('🔍 Player already exists?', multiplayerPlayers.has(playerData.id));
    
    // VALIDATION STEP 1: Check if scene exists
    console.log('📝 VALIDATION STEP 1: Checking scene...');
    if (!multiplayerGameScene) {
        console.error('❌ CRITICAL: multiplayerGameScene is null/undefined!');
        console.log('🔄 Scene creation might have failed - retrying in 1 second...');
        setTimeout(() => {
            console.log('🔄 Retry attempt for addPlayer:', playerData.id);
            addPlayer(playerData);
        }, 1000);
        return;
    }
    console.log('✅ Scene exists');
    
    // VALIDATION STEP 2: Check if scene is ready
    console.log('📝 VALIDATION STEP 2: Checking scene readiness...');
    if (!multiplayerGameScene.sceneReady) {
        console.error('❌ CRITICAL: Scene not fully initialized!');
        console.log('🔄 Scene readiness:', multiplayerGameScene.sceneReady);
        console.log('🔄 Initialization phase:', multiplayerGameScene.initializationPhase);
        console.log('🔄 Retrying player creation in 1 second...');
        setTimeout(() => {
            console.log('🔄 Retry attempt for addPlayer:', playerData.id);
            addPlayer(playerData);
        }, 1000);
        return;
    }
    console.log('✅ Scene is ready');
    
    // VALIDATION STEP 3: Check physics world
    console.log('📝 VALIDATION STEP 3: Checking physics world...');
    if (!multiplayerGameScene.matter || !multiplayerGameScene.matter.world) {
        console.error('❌ CRITICAL: Physics world not ready!');
        console.log('🔄 Matter.js state:', {
            matter: multiplayerGameScene.matter ? 'exists' : 'missing',
            world: multiplayerGameScene.matter?.world ? 'exists' : 'missing'
        });
        console.log('🔄 Retrying player creation in 1 second...');
        setTimeout(() => {
            console.log('🔄 Retry attempt for addPlayer:', playerData.id);
            addPlayer(playerData);
        }, 1000);
        return;
    }
    console.log('✅ Physics world is ready');
    
    // VALIDATION STEP 4: Check for duplicate player
    console.log('📝 VALIDATION STEP 4: Checking for duplicate player...');
    if (multiplayerPlayers.has(playerData.id)) {
        console.warn('⚠️ Player', playerData.id, 'already exists in the map - updating instead of creating');
        const existingPlayer = multiplayerPlayers.get(playerData.id);
        if (existingPlayer && existingPlayer.updatePosition) {
            existingPlayer.updatePosition(playerData.x, playerData.y);
        }
        return;
    }
    console.log('✅ No duplicate player found');
    
    // STEP 5: Calculate spawn position and determine if local
    console.log('📝 STEP 5: Calculating spawn position...');
    const spawnPositions = [
        { x: 64, y: 64 },
        { x: 1024 - 64, y: 64 },
        { x: 64, y: 768 - 64 },
        { x: 1024 - 64, y: 768 - 64 }
    ];
    
    const spawnPos = spawnPositions[playerData.id - 1];
    const isLocal = playerData.id === localPlayerId;
    console.log('  🎯 Is local player:', isLocal);
    console.log('  📍 Spawn position:', spawnPos);
    console.log('  📊 Player position in data:', { x: playerData.x, y: playerData.y });
    console.log('  📊 Final position to use:', { 
        x: playerData.x || spawnPos.x, 
        y: playerData.y || spawnPos.y 
    });
    
    // STEP 6: Create player instance
    console.log('📝 STEP 6: Creating player instance...');
    try {
        console.log('  🏗️ Calling MultiplayerPlayer constructor...');
        console.log('  🏗️ Constructor parameters:', {
            scene: multiplayerGameScene ? 'exists' : 'missing',
            x: playerData.x || spawnPos.x,
            y: playerData.y || spawnPos.y,
            id: playerData.id,
            data: 'provided',
            isLocal: isLocal
        });
        
        const player = new MultiplayerPlayer(
            multiplayerGameScene,
            playerData.x || spawnPos.x,
            playerData.y || spawnPos.y,
            playerData.id,
            playerData,
            isLocal
        );
        
        console.log('  ✅ MultiplayerPlayer constructor completed');
        
        // STEP 7: Verify player was created successfully
        console.log('📝 STEP 7: Verifying player creation...');
        if (!player) {
            throw new Error('Player creation returned null/undefined');
        }
        console.log('  ✅ Player object exists');
        
        if (!player.sprite) {
            throw new Error('Player sprite was not created');
        }
        console.log('  ✅ Player sprite exists');
        
        if (!player.sprite.active) {
            throw new Error('Player sprite is not active');
        }
        console.log('  ✅ Player sprite is active');
        
        // STEP 8: Add to players map
        console.log('📝 STEP 8: Adding to multiplayerPlayers Map...');
        multiplayerPlayers.set(playerData.id, player);
        console.log('  ✅ Player added to map');
        
        console.log(`✅✅✅ PLAYER CREATION SUCCESS for ${playerData.id} (${isLocal ? 'local' : 'remote'}):`, playerData.name);
        console.log(`📊 New Map size: ${multiplayerPlayers.size}`);
        console.log(`📊 Map keys now: ${Array.from(multiplayerPlayers.keys())}`);
        
    } catch (error) {
        console.error(`❌ Failed to create player ${playerData.id}:`, error);
        console.error('Stack trace:', error.stack);
        
        // Retry player creation after delay
        console.log('⏳ Retrying player creation in 2 seconds...');
        setTimeout(() => {
            console.log(`🔄 Retrying creation of player ${playerData.id}...`);
            addPlayer(playerData);
        }, 2000);
    }
    console.log(`  🔍 New Map keys:`, Array.from(multiplayerPlayers.keys()));
    
    // Force UI refresh after adding player
    console.log('  ⏰ Scheduling UI refresh in 100ms...');
    setTimeout(() => {
        console.log('  🔄 Executing scheduled UI refresh after addPlayer');
        forceUIRefresh();
    }, 100);
}

function removePlayer(playerId) {
    const player = multiplayerPlayers.get(playerId);
    if (player) {
        player.destroy();
        multiplayerPlayers.delete(playerId);
    }
}

function updatePlayerStats(players) {
    console.log('🎮 DETAILED UI UPDATE DEBUG:');
    console.log('  📊 Player count:', players.length);
    console.log('  📋 Full players array:', JSON.stringify(players, null, 2));
    console.log('  🎯 Local player ID:', localPlayerId);
    console.log('  🗺️ MultiplayerPlayers Map size:', multiplayerPlayers.size);
    console.log('  🔍 Players in Map:', Array.from(multiplayerPlayers.keys()));
    
    // Verify DOM is ready first
    console.log('🏗️ DOM READINESS CHECK:');
    let missingElements = [];
    for (let i = 1; i <= 4; i++) {
        const stat = document.getElementById(`player${i}-stat`);
        const health = document.getElementById(`player${i}-health`);
        const bombs = document.getElementById(`player${i}-bombs`);
        
        if (!stat) missingElements.push(`player${i}-stat`);
        if (!health) missingElements.push(`player${i}-health`);
        if (!bombs) missingElements.push(`player${i}-bombs`);
    }
    
    if (missingElements.length > 0) {
        console.warn('❌ Missing DOM elements:', missingElements);
        console.log('⏳ Deferring UI update until DOM is ready...');
        setTimeout(() => {
            console.log('🔄 Retrying UI update after DOM delay...');
            updatePlayerStats(players);
        }, 1000);
        return;
    }
    
    // Check DOM elements exist
    console.log('🏗️ DOM ELEMENT CHECK:');
    for (let i = 1; i <= 4; i++) {
        const stat = document.getElementById(`player${i}-stat`);
        console.log(`  Player ${i} stat element:`, stat ? 'EXISTS' : 'MISSING');
        if (stat) {
            const nameElement = stat.querySelector('.player-name');
            console.log(`    Player ${i} name element:`, nameElement ? 'EXISTS' : 'MISSING');
            console.log(`    Current display style:`, stat.style.display || 'default');
        }
    }
    
    // Show/hide player stat panels
    console.log('🎨 UPDATING UI FOR EACH PLAYER:');
    for (let i = 1; i <= 4; i++) {
        const stat = document.getElementById(`player${i}-stat`);
        if (stat) {
            const player = players.find(p => p.id === i);
            console.log(`  🔍 Looking for player with ID ${i}:`, player ? `FOUND (${player.name})` : 'NOT FOUND');
            
            if (player) {
                console.log(`    ✅ Showing UI for Player ${i}: ${player.name}`);
                console.log(`    📱 Setting display: block, opacity:`, player.isAlive ? '1' : '0.5');
                stat.style.display = 'block';
                stat.style.opacity = player.isAlive ? '1' : '0.5';
                
                // Update player name
                const nameElement = stat.querySelector('.player-name');
                if (nameElement) {
                    const displayName = player.name || `Player ${i}`;
                    const finalName = i === localPlayerId ? displayName + ' (You)' : displayName;
                    nameElement.textContent = finalName;
                    console.log(`    📝 Updated name for Player ${i}: "${finalName}"`);
                } else {
                    console.log(`    ❌ No .player-name element found for Player ${i}`);
                }
            } else {
                console.log(`    👻 Hiding UI for Player ${i} (not in game)`);
                stat.style.display = 'none';
            }
        } else {
            console.log(`  ❌ No stat element found for Player ${i}`);
        }
    }
    
    console.log('🏁 UI UPDATE COMPLETE');
}

// Force UI refresh function
function forceUIRefresh() {
    console.log('🔄 FORCE UI REFRESH DEBUG:');
    console.log('  🗺️ MultiplayerPlayers Map details:');
    console.log('    Size:', multiplayerPlayers.size);
    console.log('    Keys:', Array.from(multiplayerPlayers.keys()));
    
    if (multiplayerPlayers.size === 0) {
        console.log('  ⚠️ WARNING: No players in multiplayerPlayers Map!');
        return;
    }
    
    const currentPlayers = [];
    multiplayerPlayers.forEach((player, playerId) => {
        console.log(`  🧑 Processing player ${playerId}:`, {
            playerId: player.playerId,
            playerData: player.playerData,
            isAlive: player.isAlive,
            health: player.health
        });
        
        currentPlayers.push({
            id: player.playerId,
            name: player.playerData?.name || `Player ${player.playerId}`,
            isAlive: player.isAlive,
            health: player.health
        });
    });
    
    console.log('  📋 Mapped currentPlayers array:', currentPlayers);
    console.log('  ➡️ Calling updatePlayerStats with', currentPlayers.length, 'players');
    updatePlayerStats(currentPlayers);
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


// Show kill feed message
function showKillFeed(killerName, victimName, weaponType) {
    // Create kill feed container if it doesn't exist
    let killFeed = document.getElementById('kill-feed');
    if (!killFeed) {
        killFeed = document.createElement('div');
        killFeed.id = 'kill-feed';
        killFeed.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000;
            max-width: 300px;
            pointer-events: none;
        `;
        document.body.appendChild(killFeed);
    }
    
    // Get weapon symbol
    const weaponSymbols = {
        grenade: '💣', rocket: '🚀', flamethrower: '🔥', sword: '⚔️',
        sniper: '🎯', shotgun: '🔫', lightning: '⚡'
    };
    
    // Create kill message
    const killMessage = document.createElement('div');
    killMessage.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        margin-bottom: 5px;
        border-radius: 5px;
        font-size: 14px;
        animation: slideInRight 0.3s ease-out;
        border-left: 3px solid #ff4444;
    `;
    
    killMessage.innerHTML = `
        <span style="color: #ff6666;">${killerName}</span> 
        ${weaponSymbols[weaponType] || '💥'} 
        <span style="color: #cccccc;">${victimName}</span>
    `;
    
    // Add CSS animation if not already added
    if (!document.getElementById('kill-feed-styles')) {
        const style = document.createElement('style');
        style.id = 'kill-feed-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; transform: translateX(50%); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to feed
    killFeed.appendChild(killMessage);
    
    // Remove after 4 seconds
    setTimeout(() => {
        killMessage.style.animation = 'fadeOut 0.5s ease-in';
        setTimeout(() => {
            if (killMessage.parentNode) {
                killMessage.parentNode.removeChild(killMessage);
            }
        }, 500);
    }, 4000);
    
    // Keep only last 5 messages
    const messages = killFeed.children;
    if (messages.length > 5) {
        killFeed.removeChild(messages[0]);
    }
}

// Create visual weapon effects
function createWeaponEffect(weapon) {
    if (!multiplayerGameScene) return;
    
    console.log(`Creating weapon effect for ${weapon.type}`);
    
    // Create projectile visual
    let projectileColor = 0xff0000;
    let projectileSize = 8;
    
    switch (weapon.type) {
        case 'grenade':
            projectileColor = 0x8b4513;
            projectileSize = 10;
            break;
        case 'rocket':
            projectileColor = 0xff4500;
            projectileSize = 12;
            break;
        case 'sniper':
            projectileColor = 0x2c3e50;
            projectileSize = 6;
            break;
        case 'shotgun':
            projectileColor = 0x8b4513;
            projectileSize = 4;
            break;
        case 'lightning':
            projectileColor = 0x9b59b6;
            projectileSize = 8;
            break;
    }
    
    // Create visual projectile
    const projectile = multiplayerGameScene.add.circle(
        weapon.startX, weapon.startY, 
        projectileSize, projectileColor
    );
    
    // Animate projectile to target
    multiplayerGameScene.tweens.add({
        targets: projectile,
        x: weapon.targetX,
        y: weapon.targetY,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
            // Create explosion effect at target
            const explosion = multiplayerGameScene.add.circle(
                weapon.targetX, weapon.targetY, 
                20, 0xff6b35
            );
            explosion.setAlpha(0.8);
            
            multiplayerGameScene.tweens.add({
                targets: explosion,
                scaleX: 3,
                scaleY: 3,
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => explosion.destroy()
            });
            
            projectile.destroy();
        }
    });
}

// Global debugging functions for weapon testing
window.testWeaponSystem = function() {
    console.log('🧪 GLOBAL WEAPON SYSTEM TEST');
    console.log('Local player ID:', localPlayerId);
    console.log('Players in game:', multiplayerPlayers.size);
    
    const localPlayer = multiplayerPlayers.get(localPlayerId);
    if (localPlayer) {
        console.log('✅ Found local player, testing weapon system...');
        localPlayer.testWeaponSystem();
    } else {
        console.log('❌ No local player found');
        console.log('Available players:', Array.from(multiplayerPlayers.keys()));
    }
};

window.forceEquipWeapon = function(weaponType = 'grenade') {
    console.log(`🔧 GLOBAL FORCE EQUIP: ${weaponType}`);
    const localPlayer = multiplayerPlayers.get(localPlayerId);
    if (localPlayer) {
        localPlayer.forceEquipWeapon(weaponType);
    } else {
        console.log('❌ No local player found for weapon equipping');
    }
};

window.checkWeaponStatus = function() {
    console.log('🔍 GLOBAL WEAPON STATUS CHECK');
    console.log('Local player ID:', localPlayerId);
    console.log('Game state:', gameState);
    console.log('Players in game:', multiplayerPlayers.size);
    
    const localPlayer = multiplayerPlayers.get(localPlayerId);
    if (localPlayer) {
        console.log('✅ Local player found');
        console.log('  Current weapon:', localPlayer.currentWeapon ? localPlayer.currentWeapon.type : 'NONE');
        console.log('  Weapon count:', Object.keys(localPlayer.weapons).length);
        console.log('  Keys setup:', !!localPlayer.keys && Object.keys(localPlayer.keys).length > 0);
        console.log('  Scene exists:', !!localPlayer.scene);
        console.log('  Sprite exists:', !!localPlayer.sprite);
        
        // Force show weapon status
        if (localPlayer.updateWeaponStatusDisplay) {
            localPlayer.updateWeaponStatusDisplay();
        }
        
        // Try to force equip a weapon
        console.log('🔧 Attempting to force equip grenade...');
        localPlayer.forceEquipWeapon('grenade');
        
        setTimeout(() => {
            console.log('📊 Status after force equip:');
            console.log('  Current weapon:', localPlayer.currentWeapon ? localPlayer.currentWeapon.type : 'STILL NONE');
        }, 500);
    } else {
        console.log('❌ No local player found');
        console.log('Available players:', Array.from(multiplayerPlayers.keys()));
    }
};

// Real-time debugging overlay for initialization tracking
function createInitializationDebugOverlay() {
    console.log('🔧 Creating initialization debug overlay...');
    
    // Remove existing overlay if it exists
    const existingOverlay = document.getElementById('init-debug-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'init-debug-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 11px;
        z-index: 10000;
        max-width: 400px;
        border: 2px solid #e74c3c;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    overlay.innerHTML = `
        <div style="color: #e74c3c; font-weight: bold; margin-bottom: 10px;">🔍 INITIALIZATION DEBUG</div>
        <div id="debug-timestamp">Timestamp: Loading...</div>
        <div id="debug-game-state">Game State: Loading...</div>
        <div id="debug-scene-state">Scene State: Loading...</div>
        <div id="debug-physics-state">Physics State: Loading...</div>
        <div id="debug-players-count">Players Count: Loading...</div>
        <div id="debug-blocks-count">Blocks Count: Loading...</div>
        <div id="debug-local-player">Local Player: Loading...</div>
        <div id="debug-last-action">Last Action: Loading...</div>
        <div id="debug-errors">Errors: None</div>
        <div style="margin-top: 10px;">
            <button onclick="window.forceRefreshDebug()" style="background: #27ae60; color: white; border: none; padding: 5px; border-radius: 3px; cursor: pointer; margin: 2px; font-size: 10px;">Refresh</button>
            <button onclick="window.forceGameRestart()" style="background: #e67e22; color: white; border: none; padding: 5px; border-radius: 3px; cursor: pointer; margin: 2px; font-size: 10px;">Restart</button>
            <br/>
            <button onclick="window.testBlockCreation()" style="background: #9b59b6; color: white; border: none; padding: 5px; border-radius: 3px; cursor: pointer; margin: 2px; font-size: 10px;">Test Block</button>
            <button onclick="window.forceHardRefresh()" style="background: #e74c3c; color: white; border: none; padding: 5px; border-radius: 3px; cursor: pointer; margin: 2px; font-size: 10px;">Hard Refresh</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    console.log('✅ Initialization debug overlay created');
}

// Update the debug overlay with current state
function updateInitializationDebugOverlay() {
    const overlay = document.getElementById('init-debug-overlay');
    if (!overlay) return;
    
    try {
        document.getElementById('debug-timestamp').textContent = `Timestamp: ${new Date().toISOString()}`;
        document.getElementById('debug-game-state').textContent = `Game State: ${gameState}`;
        document.getElementById('debug-scene-state').textContent = `Scene State: ${multiplayerGameScene?.sceneReady ? 'Ready' : 'Not Ready'} (${multiplayerGameScene?.initializationPhase || 'unknown'})`;
        document.getElementById('debug-physics-state').textContent = `Physics State: ${multiplayerGameScene?.matter?.world ? 'Ready' : 'Not Ready'}`;
        document.getElementById('debug-players-count').textContent = `Players Count: ${multiplayerPlayers.size} (Local: ${localPlayerId})`;
        document.getElementById('debug-blocks-count').textContent = `Blocks Count: ${multiplayerDestructibleBlocks.length}`;
        document.getElementById('debug-local-player').textContent = `Local Player: ${multiplayerPlayers.has(localPlayerId) ? 'Found' : 'Missing'}`;
        
        // Show recent console errors
        const errors = window.initDebugErrors || [];
        document.getElementById('debug-errors').textContent = `Errors: ${errors.length} (Recent: ${errors.slice(-3).join(', ')})`;
        
    } catch (error) {
        console.error('Error updating debug overlay:', error);
    }
}

// Start the debug overlay system
function startInitializationDebugging() {
    console.log('🔧 Starting initialization debugging system...');
    
    // Track errors
    window.initDebugErrors = window.initDebugErrors || [];
    const originalConsoleError = console.error;
    console.error = function(...args) {
        window.initDebugErrors.push(args[0]?.toString() || 'Unknown error');
        if (window.initDebugErrors.length > 10) {
            window.initDebugErrors = window.initDebugErrors.slice(-10);
        }
        originalConsoleError.apply(console, args);
    };
    
    // Create overlay
    createInitializationDebugOverlay();
    
    // Update overlay every second
    setInterval(updateInitializationDebugOverlay, 1000);
    
    // Update immediately
    updateInitializationDebugOverlay();
}

// Global debugging functions for initialization
window.forceRefreshDebug = function() {
    console.log('🔄 Force refreshing debug overlay...');
    updateInitializationDebugOverlay();
    forceUIRefresh();
};

window.forceGameRestart = function() {
    console.log('🔄 Force restarting game initialization...');
    if (multiplayerGameScene) {
        try {
            // Clear existing players and blocks
            multiplayerPlayers.clear();
            multiplayerDestructibleBlocks.forEach(block => {
                if (block && block.destroy) block.destroy();
            });
            multiplayerDestructibleBlocks = [];
            
            // Try to reinitialize
            if (typeof window.lastGameStartData !== 'undefined') {
                initializeGameState(window.lastGameStartData);
            } else {
                console.error('No game start data available for restart');
            }
        } catch (error) {
            console.error('Force restart failed:', error);
        }
    }
};

// Force hard refresh to bypass caching issues
window.forceHardRefresh = function() {
    console.log('🔄 Force hard refresh to bypass caching...');
    window.location.reload(true);
};

// Manual block creation test
window.testBlockCreation = function() {
    console.log('🧪 Testing manual block creation...');
    if (multiplayerGameScene) {
        try {
            const testBlock = multiplayerGameScene.add.rectangle(400, 300, 48, 48, 0xff0000);
            testBlock.setStrokeStyle(4, 0x000000);
            multiplayerGameScene.matter.add.gameObject(testBlock, { isStatic: true });
            console.log('✅ Test block created at (400, 300)');
        } catch (error) {
            console.error('❌ Test block creation failed:', error);
        }
    } else {
        console.error('❌ No scene available for test block creation');
    }
};

// Test weapon system directly
window.testWeaponDirect = function() {
    console.log('Testing weapon system...');
    const localPlayer = multiplayerPlayers.get(localPlayerId);
    if (localPlayer) {
        localPlayer.cycleToNextWeapon();
        setTimeout(() => localPlayer.fireCurrentWeapon(), 1000);
    } else {
        console.error('No local player found');
    }
};

// Test input system
window.testInputSystem = function() {
    console.log('Testing input system...');
    const localPlayer = multiplayerPlayers.get(localPlayerId);
    if (localPlayer && localPlayer.keys) {
        console.log('Keys available:', Object.keys(localPlayer.keys));
        console.log('Q key ready:', !!localPlayer.keys.cycleWeapon);
        console.log('Space key ready:', !!localPlayer.keys.fireWeapon);
    } else {
        console.error('No local player or keys found');
    }
};

// Initialize the multiplayer game when the page loads
window.addEventListener('load', () => {
    console.log('🌐 Window loaded - initializing multiplayer game');
    console.log('🧪 Debug functions available: testWeaponSystem(), forceEquipWeapon(), checkWeaponStatus()');
    console.log('🧪 Initialization debug functions: forceRefreshDebug(), forceGameRestart(), testBlockCreation(), forceHardRefresh()');
    
    // Start the comprehensive debugging system
    setTimeout(() => {
        startInitializationDebugging();
    }, 1000);
    
    initMultiplayerGame();
    
    // Auto-check weapon status after game initialization
    setTimeout(() => {
        console.log('🔍 Auto-checking weapon status after 5 seconds...');
        if (typeof checkWeaponStatus === 'function') {
            checkWeaponStatus();
        }
    }, 5000);
});

// Also try DOMContentLoaded for earlier initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM content loaded');
    // Check if DOM elements exist and test basic manipulation
    for (let i = 1; i <= 4; i++) {
        const stat = document.getElementById(`player${i}-stat`);
        console.log(`DOM Check - Player ${i} stat:`, stat ? 'EXISTS' : 'MISSING');
        if (stat) {
            const nameElement = stat.querySelector('.player-name');
            console.log(`  Name element:`, nameElement ? 'EXISTS' : 'MISSING');
            
            // Test basic DOM manipulation
            try {
                const originalDisplay = stat.style.display;
                stat.style.display = 'block';
                nameElement.textContent = `Test Player ${i}`;
                console.log(`  ✅ DOM manipulation test passed for Player ${i}`);
                // Reset
                stat.style.display = originalDisplay;
                nameElement.textContent = `Player ${i}`;
            } catch (error) {
                console.log(`  ❌ DOM manipulation test failed for Player ${i}:`, error);
            }
        }
    }
});