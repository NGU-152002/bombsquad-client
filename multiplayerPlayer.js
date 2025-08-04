class MultiplayerPlayer {
    constructor(scene, x, y, playerId, playerData, isLocal = false) {
        this.scene = scene;
        this.playerId = playerId;
        this.isLocal = isLocal;
        this.maxHealth = 100;
        this.networkUpdateRate = 1000 / 20; // 20 updates per second
        this.lastNetworkUpdate = 0;
        
        // Initialize from server data
        this.health = playerData.health || 100;
        this.isAlive = playerData.isAlive !== undefined ? playerData.isAlive : true;
        this.bombCapacity = playerData.bombCapacity || 1;
        this.bombCount = playerData.bombCount || 0;
        this.bombPower = playerData.bombPower || 3;
        this.speed = 20;
        this.invulnerable = false;
        this.invulnerabilityTime = 1000;
        
        // Player colors
        const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12];
        this.color = colors[playerId - 1];
        
        // Create player sprite
        this.sprite = scene.add.rectangle(x, y, 32, 32, this.color);
        this.sprite.setStrokeStyle(2, 0x000000);
        
        // Add physics
        scene.matter.add.gameObject(this.sprite, {
            shape: 'rectangle',
            density: 0.001,
            frictionAir: 0.01,
            friction: 0.1
        });
        
        this.sprite.setFixedRotation();
        this.sprite.player = this;
        
        // Add player number text
        this.playerText = scene.add.text(x, y, playerId.toString(), {
            fontSize: '16px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Add player name text
        this.nameText = scene.add.text(x, y - 45, playerData.name || `Player ${playerId}`, {
            fontSize: '12px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Movement keys (only for local player)
        if (this.isLocal) {
            this.setupControls();
        }
        
        // Power-up effects
        this.powerUps = playerData.powerUps || { speed: 1, bombs: 0, power: 0 };
        
        // Target position for smooth interpolation (remote players)
        this.targetX = x;
        this.targetY = y;
    }
    
    setupControls() {
        const cursors = this.scene.input.keyboard.createCursorKeys();
        const wasd = this.scene.input.keyboard.addKeys('W,S,A,D,SPACE');
        
        this.keys = {
            up: wasd.W,
            down: wasd.S,
            left: wasd.A,
            right: wasd.D,
            bomb: wasd.SPACE,
            // Alternative controls
            up2: cursors.up,
            down2: cursors.down,
            left2: cursors.left,
            right2: cursors.right,
            bomb2: this.scene.input.keyboard.addKey('ENTER')
        };
    }
    
    update() {
        if (!this.isAlive || !this.sprite) return;
        
        if (this.isLocal) {
            this.handleLocalMovement();
        } else {
            this.handleRemoteInterpolation();
        }
        
        // Update text positions
        if (this.playerText && this.sprite) {
            this.playerText.setPosition(this.sprite.x, this.sprite.y);
        }
        if (this.nameText && this.sprite) {
            this.nameText.setPosition(this.sprite.x, this.sprite.y - 45);
        }
        
        // Update UI for local player
        if (this.isLocal) {
            this.updateUI();
        }
        
        // Handle invulnerability
        if (this.sprite) {
            if (this.invulnerable) {
                this.sprite.alpha = Math.sin(this.scene.time.now * 0.01) * 0.5 + 0.5;
            } else {
                this.sprite.alpha = 1;
            }
        }
    }
    
    handleLocalMovement() {
        // Handle movement
        let velocityX = 0;
        let velocityY = 0;
        
        if (this.keys.left.isDown || this.keys.left2.isDown) {
            velocityX = -this.speed * this.powerUps.speed;
        } else if (this.keys.right.isDown || this.keys.right2.isDown) {
            velocityX = this.speed * this.powerUps.speed;
        }
        
        if (this.keys.up.isDown || this.keys.up2.isDown) {
            velocityY = -this.speed * this.powerUps.speed;
        } else if (this.keys.down.isDown || this.keys.down2.isDown) {
            velocityY = this.speed * this.powerUps.speed;
        }
        
        this.sprite.setVelocity(velocityX, velocityY);
        
        // Bounds checking - keep player within game boundaries
        const bounds = this.scene.game.config;
        const margin = 32; // Half player size
        
        if (this.sprite.x < margin) {
            this.sprite.x = margin;
        } else if (this.sprite.x > bounds.width - margin) {
            this.sprite.x = bounds.width - margin;
        }
        
        if (this.sprite.y < margin) {
            this.sprite.y = margin;
        } else if (this.sprite.y > bounds.height - margin) {
            this.sprite.y = bounds.height - margin;
        }
        
        // Send position to server
        this.sendMovementToServer();
        
        // Handle bomb placement
        if (Phaser.Input.Keyboard.JustDown(this.keys.bomb) || Phaser.Input.Keyboard.JustDown(this.keys.bomb2)) {
            this.placeBomb();
        }
    }
    
    handleRemoteInterpolation() {
        // Smooth interpolation for remote players
        const lerpFactor = 0.15;
        
        if (this.sprite) {
            this.sprite.x += (this.targetX - this.sprite.x) * lerpFactor;
            this.sprite.y += (this.targetY - this.sprite.y) * lerpFactor;
        }
    }
    
    sendMovementToServer() {
        const now = Date.now();
        if (now - this.lastNetworkUpdate < this.networkUpdateRate) return;
        
        if (networkManager && networkManager.isConnected) {
            networkManager.sendPlayerMovement(this.sprite.x, this.sprite.y);
            this.lastNetworkUpdate = now;
        }
    }
    
    placeBomb() {
        if (this.bombCount >= this.bombCapacity) return;
        
        // Send bomb placement to server
        if (networkManager && networkManager.isConnected) {
            networkManager.placeBomb(this.sprite.x, this.sprite.y);
        }
    }
    
    updateFromServer(serverData) {
        // Update player data from server
        this.health = serverData.health;
        this.isAlive = serverData.isAlive;
        this.bombCapacity = serverData.bombCapacity;
        this.bombCount = serverData.bombCount;
        this.bombPower = serverData.bombPower;
        this.powerUps = serverData.powerUps;
        
        // Update position for remote players
        if (!this.isLocal) {
            this.targetX = serverData.x;
            this.targetY = serverData.y;
        }
        
        // Update visual state
        if (!this.isAlive && this.sprite) {
            this.sprite.setFillStyle(0x666666);
            this.sprite.alpha = 0.5;
        }
    }
    
    setRemotePosition(x, y) {
        if (!this.isLocal) {
            this.targetX = x;
            this.targetY = y;
        }
    }
    
    takeDamage(damage) {
        if (!this.isAlive || this.invulnerable) return;
        
        this.health -= damage;
        this.makeInvulnerable();
        
        // Knockback effect
        if (this.sprite) {
            const knockbackForce = 10;
            const angle = Math.random() * Math.PI * 2;
            this.sprite.setVelocity(
                Math.cos(angle) * knockbackForce,
                Math.sin(angle) * knockbackForce
            );
        }
        
        if (this.health <= 0) {
            this.die();
        }
        
        // Flash effect
        if (this.sprite) {
            const originalColor = this.color;
            this.sprite.setFillStyle(0xff0000);
            
            this.scene.time.delayedCall(100, () => {
                if (this.sprite) {
                    this.sprite.setFillStyle(originalColor);
                }
            });
        }
    }
    
    makeInvulnerable() {
        this.invulnerable = true;
        this.scene.time.delayedCall(this.invulnerabilityTime, () => {
            this.invulnerable = false;
        });
    }
    
    die() {
        this.isAlive = false;
        
        // Stop any existing tweens first
        if (this.deathTween) {
            this.deathTween.destroy();
            this.deathTween = null;
        }
        
        if (this.sprite) {
            this.sprite.setFillStyle(0x666666);
            this.sprite.alpha = 0.5;
            
            // Death animation
            this.deathTween = this.scene.tweens.add({
                targets: this.sprite,
                scaleX: 0.1,
                scaleY: 0.1,
                angle: 360,
                duration: 500,
                ease: 'Back.easeIn'
            });
        }
        
        // Update UI
        try {
            const playerStat = document.getElementById(`player${this.playerId}-stat`);
            if (playerStat && playerStat.style) {
                playerStat.style.opacity = '0.5';
            }
        } catch (error) {
            console.warn('Failed to update UI for dead player', this.playerId, error);
        }
    }
    
    applyPowerUp(powerUpType) {
        switch(powerUpType) {
            case 'speed':
                this.powerUps.speed = Math.min(this.powerUps.speed + 0.3, 2);
                this.scene.time.delayedCall(10000, () => {
                    this.powerUps.speed = Math.max(this.powerUps.speed - 0.3, 1);
                });
                break;
            case 'bombs':
                this.bombCapacity++;
                this.powerUps.bombs++;
                break;
            case 'power':
                this.bombPower++;
                this.powerUps.power++;
                break;
            case 'health':
                this.health = Math.min(this.health + 30, this.maxHealth);
                break;
        }
    }
    
    updateUI() {
        try {
            const healthPercent = (this.health / this.maxHealth) * 100;
            const healthBar = document.getElementById(`player${this.playerId}-health`);
            const bombsCount = document.getElementById(`player${this.playerId}-bombs`);
            
            if (healthBar && healthBar.style) {
                healthBar.style.width = Math.max(0, Math.min(100, healthPercent)) + '%';
                if (healthPercent > 60) {
                    healthBar.style.backgroundColor = '#2ecc71';
                } else if (healthPercent > 30) {
                    healthBar.style.backgroundColor = '#f39c12';
                } else {
                    healthBar.style.backgroundColor = '#e74c3c';
                }
            }
            
            if (bombsCount) {
                const availableBombs = Math.max(0, this.bombCapacity - this.bombCount);
                bombsCount.textContent = `Bombs: ${availableBombs}`;
            }
        } catch (error) {
            console.warn('UI update failed for player', this.playerId, error);
        }
    }
    
    destroy() {
        // Kill any running tweens
        if (this.deathTween) {
            this.deathTween.destroy();
            this.deathTween = null;
        }
        
        // Clean up keyboard references
        if (this.keys) {
            Object.keys(this.keys).forEach(key => {
                if (this.keys[key] && this.keys[key].destroy) {
                    this.keys[key].destroy();
                }
            });
            this.keys = null;
        }
        
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.playerText && this.playerText.active) {
            this.playerText.destroy();
            this.playerText = null;
        }
        if (this.nameText && this.nameText.active) {
            this.nameText.destroy();
            this.nameText = null;
        }
    }
}