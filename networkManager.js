class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.hasJoinedRoom = false; // Track if we've already joined a room
        this.gameScene = null;
        this.serverUrl = 'http://192.168.1.104:3000'; // Change this to your deployed server URL
        // this.serverUrl = 'https://bombsquad-server-3atj.onrender.com'
        // Network interpolation for smooth movement
        this.remotePlayers = new Map();
        this.networkUpdateRate = 1000 / 20; // 20 updates per second for better responsiveness
        this.lastNetworkUpdate = 0;
        
        // Ping measurement
        this.ping = 0;
        this.pingHistory = [];
        this.maxPingHistory = 5;
        this.pingInterval = null;
        this.lastPingTime = 0;
        
        // Message batching for efficiency
        this.messageBatch = [];
        this.batchTimeout = null;
        this.batchDelay = 100; // ms - batch messages for 100ms
    }
    
    connect(serverUrl = null) {
        if (serverUrl) {
            this.serverUrl = serverUrl;
        }
        
        try {
            // Load socket.io client
            this.socket = io(this.serverUrl);
            
            this.setupEventListeners();
            
            return new Promise((resolve, reject) => {
                this.socket.on('connect', () => {
                    console.log('Connected to server');
                    this.isConnected = true;
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('Connection failed:', error);
                    this.isConnected = false;
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Failed to initialize socket:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Room management
        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data.roomId);
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.isHost = true;
            
            if (this.onRoomCreated) {
                this.onRoomCreated(data);
            }
        });
        
        this.socket.on('roomJoined', (data) => {
            console.log('Joined room:', this.roomId);
            this.playerId = data.playerId;
            
            if (this.onRoomJoined) {
                this.onRoomJoined(data);
            }
        });
        
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data.player.name);
            
            if (this.onPlayerJoined) {
                this.onPlayerJoined(data);
            }
        });
        
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data.playerId);
            
            if (this.onPlayerLeft) {
                this.onPlayerLeft(data);
            }
        });
        
        // Game events
        this.socket.on('gameStarted', (data) => {
            console.log('Game started!');
            
            if (this.onGameStarted) {
                this.onGameStarted(data);
            }
        });
        
        this.socket.on('playersPositionUpdate', (data) => {
            this.handlePlayersPositionUpdate(data);
            
            if (this.onPlayersPositionUpdate) {
                this.onPlayersPositionUpdate(data);
            }
        });
        
        this.socket.on('weaponFired', (data) => {
            if (this.onWeaponFired) {
                this.onWeaponFired(data);
            }
        });
        
        this.socket.on('playerDamaged', (data) => {
            if (this.onPlayerDamaged) {
                this.onPlayerDamaged(data);
            }
        });
        
        this.socket.on('playerEliminated', (data) => {
            if (this.onPlayerEliminated) {
                this.onPlayerEliminated(data);
            }
        });
        
        this.socket.on('bombPlaced', (data) => {
            if (this.onBombPlaced) {
                this.onBombPlaced(data);
            }
        });
        
        this.socket.on('bombExploded', (data) => {
            if (this.onBombExploded) {
                this.onBombExploded(data);
            }
        });
        
        this.socket.on('powerUpCollected', (data) => {
            if (this.onPowerUpCollected) {
                this.onPowerUpCollected(data);
            }
        });
        
        this.socket.on('gameOver', (data) => {
            if (this.onGameOver) {
                this.onGameOver(data);
            }
        });
        
        this.socket.on('gameStateUpdate', (data) => {
            if (this.onGameStateUpdate) {
                this.onGameStateUpdate(data);
            }
        });
        
        // Ping measurement events
        this.socket.on('pong', (data) => {
            const currentTime = Date.now();
            const pingTime = currentTime - data.timestamp;
            this.updatePing(pingTime);
        });
        
        // Error handling
        this.socket.on('error', (data) => {
            console.error('Server error:', data.message);
            
            if (this.onError) {
                this.onError(data);
            }
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            
            if (this.onDisconnected) {
                this.onDisconnected();
            }
        });
    }
    
    createRoom(playerName, maxPlayers = 4) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        // Critical event - send immediately, do NOT batch
        this.socket.emit('createRoom', {
            name: playerName,
            maxPlayers: maxPlayers
        });
    }
    
    joinRoom(roomId, playerName) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        // Prevent duplicate room joins
        if (this.hasJoinedRoom && this.roomId === roomId) {
            console.log('Already joined room', roomId, 'ignoring duplicate join attempt');
            return;
        }
        
        console.log('[DEBUG] Joining room:', roomId, 'hasJoinedRoom:', this.hasJoinedRoom);
        
        this.roomId = roomId;
        this.hasJoinedRoom = true;
        
        // Critical event - send immediately, do NOT batch
        this.socket.emit('joinRoom', {
            roomId: roomId,
            name: playerName
        });
    }
    
    sendPlayerInput(inputData) {
        if (!this.isConnected || !this.roomId) return;
        
        const now = Date.now();
        if (now - this.lastNetworkUpdate < this.networkUpdateRate) return;
        
        // Use batching for input updates to reduce network traffic
        this.batchMessage('playerInput', inputData);
        this.lastNetworkUpdate = now;
    }
    
    placeBomb(x, y) {
        if (!this.isConnected || !this.roomId) return;
        
        // Critical game event - send immediately, do NOT batch
        this.socket.emit('placeBomb', { x, y });
    }
    
    collectPowerUp(powerUpId) {
        if (!this.isConnected || !this.roomId) return;
        
        // Critical game event - send immediately, do NOT batch
        this.socket.emit('collectPowerUp', { powerUpId });
    }
    
    fireWeapon(weaponData) {
        if (!this.isConnected || !this.roomId) return;
        
        console.log('📡 NetworkManager.fireWeapon called:', weaponData);
        
        // Critical game event - send immediately, do NOT batch
        this.socket.emit('fireWeapon', weaponData);
    }
    
    batchMessage(eventType, data) {
        // Add message to batch
        this.messageBatch.push({ event: eventType, data: data, timestamp: Date.now() });
        
        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        // Set new timeout to send batch
        this.batchTimeout = setTimeout(() => {
            this.sendBatch();
        }, this.batchDelay);
    }
    
    sendBatch() {
        if (this.messageBatch.length === 0) return;
        
        // Group messages by type for more efficient processing
        const groupedMessages = {};
        this.messageBatch.forEach(message => {
            if (!groupedMessages[message.event]) {
                groupedMessages[message.event] = [];
            }
            groupedMessages[message.event].push(message.data);
        });
        
        // Send grouped messages
        Object.keys(groupedMessages).forEach(eventType => {
            const messages = groupedMessages[eventType];
            
            if (eventType === 'playerInput' && messages.length > 1) {
                // For input, only send the latest input state
                const latestInput = messages[messages.length - 1];
                this.socket.emit(eventType, latestInput);
            } else {
                // For other events, send all
                messages.forEach(data => {
                    this.socket.emit(eventType, data);
                });
            }
        });
        
        // Clear batch
        this.messageBatch = [];
        this.batchTimeout = null;
    }
    
    handlePlayersPositionUpdate(data) {
        const now = Date.now();
        
        data.players.forEach(playerData => {
            if (playerData.id === this.playerId) {
                // Handle server reconciliation for local player
                if (this.gameScene && this.gameScene.getPlayerById) {
                    const localPlayer = this.gameScene.getPlayerById(playerData.id);
                    if (localPlayer) {
                        localPlayer.updateFromServer(playerData);
                    }
                }
            } else {
                // Handle remote player position update
                const remotePlayer = this.remotePlayers.get(playerData.id) || {};
                remotePlayer.targetX = playerData.x;
                remotePlayer.targetY = playerData.y;
                remotePlayer.lastUpdate = now;
                remotePlayer.sequence = playerData.sequence;
                
                this.remotePlayers.set(playerData.id, remotePlayer);
                
                // Update game scene if available
                if (this.gameScene && this.gameScene.updateRemotePlayer) {
                    this.gameScene.updateRemotePlayer(playerData.id, playerData.x, playerData.y);
                }
            }
        });
    }
    
    interpolateRemotePlayers(gameScene) {
        const now = Date.now();
        
        for (let [playerId, remotePlayer] of this.remotePlayers) {
            if (playerId === this.playerId) continue;
            
            const player = gameScene.getPlayerById(playerId);
            if (!player || !player.sprite) continue;
            
            // Enhanced interpolation with ping-based adaptation
            const timeSinceUpdate = now - remotePlayer.lastUpdate;
            if (timeSinceUpdate < 2000) { // Extended timeout for high latency
                // Calculate distance for dynamic interpolation
                const distance = Math.sqrt(
                    Math.pow(remotePlayer.targetX - player.sprite.x, 2) + 
                    Math.pow(remotePlayer.targetY - player.sprite.y, 2)
                );
                
                // Dynamic lerp factor based on distance and ping
                let lerpFactor = 0.3; // Increased base smoothness factor
                
                // Adjust for ping - higher ping needs faster catch-up
                if (this.ping > 200) {
                    lerpFactor = 0.6; // Much faster for high ping
                } else if (this.ping > 100) {
                    lerpFactor = 0.45; // Faster for medium ping
                }
                
                // Distance-based adjustment - catch up faster when far behind
                if (distance > 100) {
                    lerpFactor = Math.min(lerpFactor * 3, 0.9); // Very fast catch-up
                } else if (distance > 50) {
                    lerpFactor = Math.min(lerpFactor * 2, 0.7); // Fast catch-up
                }
                
                player.sprite.x += (remotePlayer.targetX - player.sprite.x) * lerpFactor;
                player.sprite.y += (remotePlayer.targetY - player.sprite.y) * lerpFactor;
                
                // Update player text position
                if (player.playerText) {
                    player.playerText.setPosition(player.sprite.x, player.sprite.y);
                }
                
                // Update name text position
                if (player.nameText) {
                    player.nameText.setPosition(player.sprite.x, player.sprite.y - 45);
                }
            }
        }
    }
    
    disconnect() {
        // Send any remaining batched messages before disconnecting
        if (this.messageBatch.length > 0) {
            this.sendBatch();
        }
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        // Stop ping measurement
        this.stopPingMeasurement();
        
        // Clear batch timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
        
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.hasJoinedRoom = false; // Reset room join state
        this.remotePlayers.clear();
        this.messageBatch = [];
    }
    
    // Ping measurement methods
    startPingMeasurement() {
        if (this.pingInterval) return;
        
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, 5000); // Send ping every 5 seconds (optimized for high latency)
    }
    
    stopPingMeasurement() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    sendPing() {
        if (!this.isConnected || !this.socket) return;
        
        const timestamp = Date.now();
        this.lastPingTime = timestamp;
        this.socket.emit('ping', { timestamp });
    }
    
    updatePing(pingTime) {
        // Add to history
        this.pingHistory.push(pingTime);
        if (this.pingHistory.length > this.maxPingHistory) {
            this.pingHistory.shift();
        }
        
        // Calculate average ping
        const sum = this.pingHistory.reduce((a, b) => a + b, 0);
        this.ping = Math.round(sum / this.pingHistory.length);
        
        // Adaptive network update rate based on ping
        this.adaptNetworkRates();
    }
    
    adaptNetworkRates() {
        // Adjust network update rates based on current ping
        if (this.ping > 300) {
            // Very high ping: reduce to 5 FPS
            this.networkUpdateRate = 1000 / 5;
            this.batchDelay = 200; // Longer batching
        } else if (this.ping > 200) {
            // High ping: reduce to 8 FPS
            this.networkUpdateRate = 1000 / 8;
            this.batchDelay = 150; // Medium batching
        } else if (this.ping > 100) {
            // Medium ping: 10 FPS (default)
            this.networkUpdateRate = 1000 / 10;
            this.batchDelay = 100; // Standard batching
        } else {
            // Low ping: can handle higher rate
            this.networkUpdateRate = 1000 / 12;
            this.batchDelay = 75; // Faster batching
        }
    }
    
    getPing() {
        return this.ping;
    }
    
    // Event callback setters
    setGameScene(scene) {
        this.gameScene = scene;
    }
    
    onRoomCreated = null;
    onRoomJoined = null;
    onPlayerJoined = null;
    onPlayerLeft = null;
    onGameStarted = null;
    onGameStateUpdate = null;
    onPlayersPositionUpdate = null;
    onWeaponFired = null;
    onPlayerDamaged = null;
    onPlayerEliminated = null;
    onBombPlaced = null;
    onBombExploded = null;
    onPowerUpCollected = null;
    onGameOver = null;
    onError = null;
    onDisconnected = null;
}

// Global network manager instance
window.networkManager = new NetworkManager();