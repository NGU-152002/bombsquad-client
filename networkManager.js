class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.gameScene = null;
        // Default to production server, fallback to localhost for development
        this.serverUrl = 'https://bombsquad-server-3atj.onrender.com' // Change this to your deployed server URL
        // this.serverUrl = 'http://localhost:3000' // Uncomment for local development
        // Network interpolation for smooth movement
        this.remotePlayers = new Map();
        this.networkUpdateRate = 1000 / 20; // 20 updates per second
        this.lastNetworkUpdate = 0;
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
        
        this.socket.on('playerMoved', (data) => {
            this.handlePlayerMovement(data);
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
        
        this.roomId = roomId;
        this.socket.emit('joinRoom', {
            roomId: roomId,
            name: playerName
        });
    }
    
    sendPlayerMovement(x, y) {
        if (!this.isConnected || !this.roomId) return;
        
        const now = Date.now();
        if (now - this.lastNetworkUpdate < this.networkUpdateRate) return;
        
        this.socket.emit('playerMove', { x, y });
        this.lastNetworkUpdate = now;
    }
    
    placeBomb(x, y) {
        if (!this.isConnected || !this.roomId) return;
        
        this.socket.emit('placeBomb', { x, y });
    }
    
    collectPowerUp(powerUpId) {
        if (!this.isConnected || !this.roomId) return;
        
        this.socket.emit('collectPowerUp', { powerUpId });
    }
    
    handlePlayerMovement(data) {
        if (data.playerId === this.playerId) return; // Ignore own movement
        
        // Store remote player position for interpolation
        const remotePlayer = this.remotePlayers.get(data.playerId) || {};
        remotePlayer.targetX = data.x;
        remotePlayer.targetY = data.y;
        remotePlayer.lastUpdate = Date.now();
        
        this.remotePlayers.set(data.playerId, remotePlayer);
        
        // Update game scene if available
        if (this.gameScene && this.gameScene.updateRemotePlayer) {
            this.gameScene.updateRemotePlayer(data.playerId, data.x, data.y);
        }
    }
    
    interpolateRemotePlayers(gameScene) {
        const now = Date.now();
        
        for (let [playerId, remotePlayer] of this.remotePlayers) {
            if (playerId === this.playerId) continue;
            
            const player = gameScene.getPlayerById(playerId);
            if (!player || !player.sprite) continue;
            
            // Simple linear interpolation
            const timeSinceUpdate = now - remotePlayer.lastUpdate;
            if (timeSinceUpdate < 1000) { // Only interpolate if update is recent
                const lerpFactor = 0.15; // Smoothness factor
                
                player.sprite.x += (remotePlayer.targetX - player.sprite.x) * lerpFactor;
                player.sprite.y += (remotePlayer.targetY - player.sprite.y) * lerpFactor;
                
                // Update player text position
                if (player.playerText) {
                    player.playerText.setPosition(player.sprite.x, player.sprite.y);
                }
            }
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.remotePlayers.clear();
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
    onBombPlaced = null;
    onBombExploded = null;
    onPowerUpCollected = null;
    onGameOver = null;
    onError = null;
    onDisconnected = null;
}

// Global network manager instance
window.networkManager = new NetworkManager();