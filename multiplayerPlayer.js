class MultiplayerPlayer {
    constructor(scene, x, y, playerId, playerData, isLocal = false) {
        this.scene = scene;
        this.playerId = playerId;
        this.isLocal = isLocal;
        this.maxHealth = 100;
        this.networkUpdateRate = 1000 / 20; // 20 updates per second for better responsiveness
        this.lastNetworkUpdate = 0;
        
        // Initialize from server data
        this.health = playerData.health || 100;
        this.isAlive = playerData.isAlive !== undefined ? playerData.isAlive : true;
        this.bombCapacity = playerData.bombCapacity || 1;
        this.bombCount = playerData.bombCount || 0;
        this.bombPower = playerData.bombPower || 5;
        // Match offline mode feel - increase base speed to compensate for network latency
        this.speed = 60; // 3x offline speed (20 * 3) to match offline feel
        this.invulnerable = false;
        this.invulnerabilityTime = 1000;
        
        // Player colors
        const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12];
        this.color = colors[playerId - 1];
        
        // Create player sprite with physics (match offline mode exactly)
        this.sprite = scene.add.rectangle(x, y, 32, 32, this.color);
        this.sprite.setStrokeStyle(2, 0x000000);
        
        // Add physics to sprite (same as offline mode)
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
        
        // Weapon system - use new MultiplayerWeaponSystem with immediate validation
        try {
            console.log(`🔫 Creating weapon system for player ${this.playerId} (isLocal: ${this.isLocal})`);
            
            // Check if MultiplayerWeaponSystem class exists
            if (typeof MultiplayerWeaponSystem === 'undefined') {
                throw new Error('MultiplayerWeaponSystem class not found - script may not be loaded');
            }
            
            this.weaponSystem = new MultiplayerWeaponSystem(scene);
            this.shields = 0;
            this.teleportCharges = 0;
            
            console.log(`🔫 Weapon system created, setting owner to player ${this.playerId}`);
            
            // Setup weapon system for player
            this.weaponSystem.setOwner(this);
            
            // IMMEDIATE validation for local players
            if (this.isLocal) {
                console.log(`🎯 Immediate validation for local player ${this.playerId}`);
                
                // Validate immediately
                const immediateResult = this.validateAndFixWeaponSystem();
                console.log(`🎯 Immediate validation result:`, immediateResult);
                
                // Also validate with delay as backup
                this.scene.time.delayedCall(100, () => {
                    console.log(`🎯 Delayed validation for local player ${this.playerId}`);
                    this.validateAndFixWeaponSystem();
                });
                
                // Additional validation after 500ms
                this.scene.time.delayedCall(500, () => {
                    console.log(`🎯 Extended validation for local player ${this.playerId}`);
                    this.validateAndFixWeaponSystem();
                });
            }
            
            console.log(`✅ Weapon system initialization completed for player ${this.playerId}`);
            
        } catch (error) {
            console.error(`❌ Failed to initialize weapon system for player ${this.playerId}:`, error);
            console.error(`❌ Error details:`, error.message);
            console.error(`❌ Stack trace:`, error.stack);
            this.weaponSystem = null;
            
            // Try to create a fallback weapon system
            if (this.isLocal) {
                console.warn(`🔧 Attempting fallback weapon system creation for player ${this.playerId}`);
                this.scene.time.delayedCall(200, () => {
                    this.createFallbackWeaponSystem();
                });
            }
        }
        
        // Target position for smooth interpolation (remote players)
        this.targetX = x;
        this.targetY = y;
        
        // Client-side prediction for local player
        this.predictedX = x;
        this.predictedY = y;
        this.serverX = x;
        this.serverY = y;
        this.predictionEnabled = isLocal;
        
        // Input buffering for network delays
        this.inputBuffer = [];
        this.maxBufferSize = 10;
        this.bufferProcessDelay = 50; // ms
    }
    
    setupControls() {
        // Only setup input for local player
        if (!this.isLocal) {
            this.keys = {}; // Empty keys for remote players
            this.inputState = {};
            return;
        }
        
        // Standardized input system - same keys for all players
        const wasd = this.scene.input.keyboard.addKeys('W,S,A,D,Q,E,F,SPACE');
        
        this.keys = {
            // Movement (WASD)
            up: wasd.W,
            down: wasd.S,
            left: wasd.A,
            right: wasd.D,
            // Actions
            fireWeapon: wasd.SPACE,  // Space - Fire weapon
            cycleWeapon: wasd.Q,     // Q - Cycle weapon
            interact: wasd.E,        // E - Interact with power-ups / Place bomb
            special: wasd.F          // F - Special ability (reserved for future use)
        };
        
        // Input state tracking
        this.inputState = {
            up: false,
            down: false,
            left: false,
            right: false,
            fireWeapon: false,
            cycleWeapon: false,
            interact: false,
            special: false
        };
        
        this.lastInputState = { ...this.inputState };
        this.inputSequence = 0;
    }
    
    update(delta) {
        
        if (!this.isAlive || !this.sprite) return;
        
        if (this.isLocal) {
            this.handleLocalMovement();
            // Also apply interpolation to local player for smooth server sync
            this.handleRemoteInterpolation();
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
        
        // Always show weapon status for local player
        if (this.isLocal) {
            this.updateWeaponStatusDisplay();
        }
        
        // Update weapon system
        if (this.weaponSystem) {
            this.weaponSystem.update(delta);
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
        // Safety check - only handle input for local player
        if (!this.isLocal) {
            console.warn(`⚠️ handleLocalMovement called for non-local player ${this.playerId}`);
            return;
        }
        
        // Check if keys are properly setup
        if (!this.keys || Object.keys(this.keys).length === 0) {
            console.warn(`⚠️ No keys setup for local player ${this.playerId}`);
            return;
        }
        
        // Update input state
        this.inputState.up = this.keys.up.isDown;
        this.inputState.down = this.keys.down.isDown;
        this.inputState.left = this.keys.left.isDown;
        this.inputState.right = this.keys.right.isDown;
        this.inputState.fireWeapon = Phaser.Input.Keyboard.JustDown(this.keys.fireWeapon);
        this.inputState.cycleWeapon = Phaser.Input.Keyboard.JustDown(this.keys.cycleWeapon);
        this.inputState.interact = Phaser.Input.Keyboard.JustDown(this.keys.interact);
        this.inputState.special = Phaser.Input.Keyboard.JustDown(this.keys.special);
        
        // Weapon controls with safety checks
        if (this.keys.cycleWeapon && Phaser.Input.Keyboard.JustDown(this.keys.cycleWeapon)) {
            console.log('🎯 Q key pressed - attempting to cycle weapon');
            if (this.weaponSystem) {
                console.log('🎯 Weapon system found, cycling...');
                this.weaponSystem.cycleWeapon();
                console.log('🎯 Current weapon after cycle:', this.weaponSystem.getCurrentWeapon()?.type || 'none');
            } else {
                console.warn('❌ No weapon system available for cycling');
                // Try to reinitialize weapon system
                this.validateAndFixWeaponSystem();
            }
        }
        
        if (this.keys.fireWeapon && Phaser.Input.Keyboard.JustDown(this.keys.fireWeapon)) {
            console.log('🔥 Space key pressed - attempting to fire weapon');
            if (this.weaponSystem) {
                const currentWeapon = this.weaponSystem.getCurrentWeapon();
                console.log('🔥 Current weapon for firing:', currentWeapon?.type || 'none');
                this.fireWeapon();
            } else {
                console.warn('❌ No weapon system available for firing');
                // Try to reinitialize weapon system
                this.validateAndFixWeaponSystem();
            }
        }
        
        // Bomb placement with E key
        if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) { // E key for bomb placement
            this.placeBomb();
        }
        
        // Send input to server - always send when moving, and when any input changes
        const hasMovement = this.hasMovementInput();
        const hasInputChange = this.hasInputChanged();
        
        if (hasMovement || hasInputChange) {
            // Movement logging disabled for performance
            // if (hasMovement && Math.random() < 0.02) {
            //     console.log(`Sending movement input: up=${this.inputState.up}, down=${this.inputState.down}, left=${this.inputState.left}, right=${this.inputState.right}`);
            // }
            this.sendInputToServer();
            
            // Update lastInputState but keep movement keys always "changed" for continuous sending
            this.lastInputState = { ...this.inputState };
            if (hasMovement) {
                // Reset movement state to ensure it's always detected as "changed" next frame
                this.lastInputState.up = false;
                this.lastInputState.down = false;
                this.lastInputState.left = false;
                this.lastInputState.right = false;
            }
        }
        
        // Disable aggressive client prediction to prevent jiggling
        // Let the server handle all movement calculations for smoother sync
        // if (this.predictionEnabled && false) { // Disabled for now
        //     this.applyClientPrediction();
        // }
    }
    
    hasMovementInput() {
        return this.inputState.up || this.inputState.down || this.inputState.left || this.inputState.right;
    }
    
    hasInputChanged() {
        return Object.keys(this.inputState).some(key => 
            this.inputState[key] !== this.lastInputState[key]
        );
    }
    
    applyClientPrediction() {
        // Use same movement system as offline mode for consistency
        // Match offline mode calculation exactly: this.speed * this.powerUps.speed
        const moveSpeed = this.speed * (this.powerUps?.speed || 1);
        
        let velocityX = 0;
        let velocityY = 0;
        
        if (this.inputState.left) velocityX = -moveSpeed;
        if (this.inputState.right) velocityX = moveSpeed;
        if (this.inputState.up) velocityY = -moveSpeed;
        if (this.inputState.down) velocityY = moveSpeed;
        
        // Apply velocity directly to sprite like offline mode - NO REDUCTION FACTORS
        if (this.sprite && this.sprite.body) {
            // Direct velocity application like offline mode (removed prediction factor)
            this.sprite.setVelocity(velocityX, velocityY);
            
            // Apply bounds checking like offline mode
            const bounds = this.scene.game.config;
            const playerRadius = 16;
            const wallBuffer = 25;
            
            // Check boundaries and prevent movement outside walls (same as offline)
            if (this.sprite.x - playerRadius <= wallBuffer && velocityX < 0) {
                this.sprite.setVelocityX(0);
            } else if (this.sprite.x + playerRadius >= bounds.width - wallBuffer && velocityX > 0) {
                this.sprite.setVelocityX(0);
            }
            
            if (this.sprite.y - playerRadius <= wallBuffer && velocityY < 0) {
                this.sprite.setVelocityY(0);
            } else if (this.sprite.y + playerRadius >= bounds.height - wallBuffer && velocityY > 0) {
                this.sprite.setVelocityY(0);
            }
        } else {
            // Fallback for non-physics sprites - remove frame rate dependency
            // Direct position update for immediate response like offline mode
            this.predictedX = this.sprite.x + velocityX * 0.1; // Small immediate offset
            this.predictedY = this.sprite.y + velocityY * 0.1;
            
            const bounds = this.scene.game.config;
            const margin = 32;
            
            this.predictedX = Math.max(margin, Math.min(bounds.width - margin, this.predictedX));
            this.predictedY = Math.max(margin, Math.min(bounds.height - margin, this.predictedY));
            
            this.sprite.x = this.predictedX;
            this.sprite.y = this.predictedY;
        }
    }
    
    handleRemoteInterpolation() {
        // Enhanced interpolation for all players
        if (!this.sprite) return;
        
        const distance = Math.sqrt(
            Math.pow(this.targetX - this.sprite.x, 2) + 
            Math.pow(this.targetY - this.sprite.y, 2)
        );
        
        // Much faster interpolation for local player, normal for remote
        let baseLerpFactor = this.isLocal ? 0.6 : 0.4; // Local player gets faster interpolation
        
        // Dynamic lerp factor based on distance - catch up faster when far behind
        let lerpFactor = baseLerpFactor;
        
        if (distance > 100) {
            lerpFactor = this.isLocal ? 1.0 : 0.95; // Instant/Very fast catch-up
        } else if (distance > 50) {
            lerpFactor = this.isLocal ? 0.95 : 0.8;  // Very fast catch-up
        } else if (distance > 20) {
            lerpFactor = this.isLocal ? 0.85 : 0.7;  // Fast speed
        } else if (distance < 2) {
            // Snap to exact position when very close to prevent micro-jiggling
            this.sprite.x = this.targetX;
            this.sprite.y = this.targetY;
            return;
        }
        
        this.sprite.x += (this.targetX - this.sprite.x) * lerpFactor;
        this.sprite.y += (this.targetY - this.sprite.y) * lerpFactor;
    }
    
    sendInputToServer() {
        if (networkManager && networkManager.isConnected) {
            this.inputSequence++;
            const inputData = {
                ...this.inputState,
                sequence: this.inputSequence,
                timestamp: Date.now()
            };
            
            // Send input to server for processing
            
            // Send immediately without batching for input responsiveness
            networkManager.socket.emit('playerInput', inputData);
        }
    }
    
    bufferInput(inputType, data) {
        // Add input to buffer with timestamp
        const input = {
            type: inputType,
            data: data,
            timestamp: Date.now()
        };
        
        this.inputBuffer.push(input);
        
        // Limit buffer size
        if (this.inputBuffer.length > this.maxBufferSize) {
            this.inputBuffer.shift();
        }
        
        // Process buffered input after delay to batch with network updates
        this.scene.time.delayedCall(this.bufferProcessDelay, () => {
            this.processBufferedInputs();
        });
    }
    
    processBufferedInputs() {
        if (this.inputBuffer.length === 0) return;
        
        // Process all buffered inputs
        this.inputBuffer.forEach(input => {
            switch (input.type) {
                case 'bomb':
                    this.placeBomb(input.data.x, input.data.y);
                    break;
            }
        });
        
        // Clear processed inputs
        this.inputBuffer = [];
    }
    
    placeBomb(x = null, y = null) {
        if (this.bombCount >= this.bombCapacity) return;
        
        // Use provided coordinates or current sprite position
        const bombX = x !== null ? x : this.sprite.x;
        const bombY = y !== null ? y : this.sprite.y;
        
        // Send bomb placement to server
        if (networkManager && networkManager.isConnected) {
            networkManager.placeBomb(bombX, bombY);
        }
    }
    
    updateFromServer(serverData) {
        // Update player data from server
        this.health = serverData.health || this.health;
        this.isAlive = serverData.isAlive !== undefined ? serverData.isAlive : this.isAlive;
        this.bombCapacity = serverData.bombCapacity || this.bombCapacity;
        this.bombCount = serverData.bombCount || this.bombCount;
        this.bombPower = serverData.bombPower || this.bombPower;
        this.powerUps = serverData.powerUps || this.powerUps;
        
        // Treat ALL players the same for consistent smooth movement
        // Both local and remote players use server-authoritative positions with smooth interpolation
        this.targetX = serverData.x;
        this.targetY = serverData.y;
        
        // For local player, also store server position for reference
        if (this.isLocal) {
            this.serverX = serverData.x;
            this.serverY = serverData.y;
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
                this.showDamageNumber('SPEED UP!', 'heal');
                this.scene.time.delayedCall(10000, () => {
                    this.powerUps.speed = Math.max(this.powerUps.speed - 0.3, 1);
                });
                break;
            case 'bombs':
                this.bombCapacity++;
                this.powerUps.bombs++;
                this.showDamageNumber('+1 BOMB', 'heal');
                break;
            case 'power':
                this.bombPower++;
                this.powerUps.power++;
                this.showDamageNumber('POWER UP!', 'heal');
                break;
            case 'health':
                const healAmount = Math.min(30, this.maxHealth - this.health);
                this.health = Math.min(this.health + 30, this.maxHealth);
                if (healAmount > 0) {
                    this.showDamageNumber(`+${healAmount}`, 'heal');
                }
                break;
            case 'shield':
                this.shields = (this.shields || 0) + 3;
                this.showDamageNumber('SHIELD +3', 'heal');
                break;
            case 'teleport':
                this.teleportCharges = (this.teleportCharges || 0) + 2;
                this.showDamageNumber('TELEPORT +2', 'heal');
                break;
            // Weapon pickups
            case 'grenade':
            case 'rocket':
            case 'flamethrower':
            case 'sword':
            case 'sniper':
            case 'shotgun':
            case 'lightning':
                this.equipWeapon(powerUpType);
                this.showDamageNumber(`${powerUpType.toUpperCase()} EQUIPPED!`, 'heal');
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
    
    showCorrectionEffect() {
        // Visual feedback for server position correction
        if (this.sprite && this.scene) {
            const originalAlpha = this.sprite.alpha;
            this.sprite.alpha = 0.7;
            
            this.scene.time.delayedCall(100, () => {
                if (this.sprite) {
                    this.sprite.alpha = originalAlpha;
                }
            });
        }
    }
    
    // Damage number animation system
    showDamageNumber(damage, damageType = 'normal') {
        if (!this.sprite || !this.scene) return;
        
        // Different colors for different damage types
        let damageColor = '#ff4444'; // Default red
        let fontSize = '18px';
        let isCritical = false;
        
        switch (damageType) {
            case 'weapon':
                damageColor = '#ff6600'; // Orange for weapon damage
                break;
            case 'explosion':
                damageColor = '#ff0000'; // Bright red for explosions
                fontSize = '20px';
                break;
            case 'fire':
                damageColor = '#ff3300'; // Red-orange for fire
                break;
            case 'critical':
                damageColor = '#ffff00'; // Yellow for critical hits
                fontSize = '22px';
                isCritical = true;
                break;
            case 'heal':
                damageColor = '#00ff00'; // Green for healing
                break;
        }
        
        // Create damage text
        const damageText = this.scene.add.text(
            this.sprite.x, 
            this.sprite.y - 30, 
            isCritical ? `CRIT ${damage}!` : `-${damage}`,
            {
                fontSize: fontSize,
                fill: damageColor,
                stroke: '#000000',
                strokeThickness: 3,
                fontWeight: 'bold'
            }
        ).setOrigin(0.5);
        
        // Random horizontal offset for multiple damage numbers
        const randomX = (Math.random() - 0.5) * 40;
        const startY = this.sprite.y - 30;
        const endY = startY - 60;
        
        damageText.x += randomX;
        
        // Scale animation for impact
        damageText.setScale(0.5);
        
        // Create floating animation sequence
        this.scene.tweens.add({
            targets: damageText,
            scaleX: isCritical ? 1.3 : 1.0,
            scaleY: isCritical ? 1.3 : 1.0,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Float upward and fade
                this.scene.tweens.add({
                    targets: damageText,
                    y: endY,
                    alpha: 0,
                    scaleX: 0.8,
                    scaleY: 0.8,
                    duration: 800,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        damageText.destroy();
                    }
                });
            }
        });
        
        // Add screen shake for critical hits
        if (isCritical && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(200, 0.01);
        }
    }
    
    // Enhanced takeDamage method with damage numbers
    takeDamage(damage, damageType = 'normal') {
        if (!this.isAlive) return;
        
        // Show damage number animation
        this.showDamageNumber(damage, damageType);
        
        // Apply damage
        this.health = Math.max(0, this.health - damage);
        
        // Flash effect for taking damage
        if (this.sprite) {
            const originalTint = this.sprite.tint;
            this.sprite.setTint(0xff4444); // Red tint
            
            this.scene.time.delayedCall(100, () => {
                if (this.sprite) {
                    this.sprite.setTint(originalTint);
                }
            });
        }
        
        // Check if player died
        if (this.health <= 0) {
            this.isAlive = false;
            this.die();
        }
        
        // Update UI
        this.updateUI();
    }
    
    die() {
        this.isAlive = false;
        
        // Death animation
        if (this.sprite) {
            this.sprite.setTint(0x666666);
            this.sprite.alpha = 0.5;
            
            // Death animation with rotation
            this.scene.tweens.add({
                targets: this.sprite,
                scaleX: 0.1,
                scaleY: 0.1,
                angle: 360,
                alpha: 0.2,
                duration: 1000,
                ease: 'Back.easeIn'
            });
        }
        
        // Show "ELIMINATED" text
        const eliminatedText = this.scene.add.text(
            this.sprite.x, 
            this.sprite.y, 
            'ELIMINATED',
            {
                fontSize: '16px',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 2,
                fontWeight: 'bold'
            }
        ).setOrigin(0.5);
        
        // Animate eliminated text
        this.scene.tweens.add({
            targets: eliminatedText,
            y: this.sprite.y - 50,
            alpha: 0,
            duration: 2000,
            ease: 'Power2.easeOut',
            onComplete: () => {
                eliminatedText.destroy();
            }
        });
    }
    
    // Weapon system methods - use new MultiplayerWeaponSystem
    fireWeapon() {
        if (!this.weaponSystem) {
            console.warn('❌ No weapon system available');
            return;
        }
        
        // Get target coordinates
        const mousePointer = this.scene.input.activePointer;
        let targetX = mousePointer.worldX;
        let targetY = mousePointer.worldY;
        
        // If no mouse input, fire in the direction the player is moving
        if (targetX === 0 && targetY === 0) {
            const direction = this.getMovementDirection();
            targetX = this.sprite.x + (direction.x || 1) * 100;
            targetY = this.sprite.y + (direction.y || 0) * 100;
        }
        
        // Fire weapon using the weapon system
        const success = this.weaponSystem.fireWeapon(targetX, targetY);
        
        if (success) {
            console.log(`🔥 Player ${this.playerId} fired weapon at (${targetX}, ${targetY})`);
        }
    }
    
    equipWeapon(weaponType) {
        if (this.weaponSystem) {
            return this.weaponSystem.equipWeapon(weaponType);
        }
        return false;
    }
    
    getCurrentWeapon() {
        if (this.weaponSystem) {
            return this.weaponSystem.getCurrentWeapon();
        }
        return null;
    }
    
    // Legacy methods for compatibility
    cycleToNextWeapon() {
        if (this.weaponSystem) {
            this.weaponSystem.cycleWeapon();
        }
    }
    
    fireCurrentWeapon() {
        this.fireWeapon();
    }
    
    getMovementDirection() {
        let dirX = 0;
        let dirY = 0;
        
        if (this.keys.left.isDown) dirX = -1;
        else if (this.keys.right.isDown) dirX = 1;
        
        if (this.keys.up.isDown) dirY = -1;
        else if (this.keys.down.isDown) dirY = 1;
        
        // Default to right if no movement
        if (dirX === 0 && dirY === 0) {
            dirX = 1;
        }
        
        return { x: dirX, y: dirY };
    }
    
    // Weapon system validation and recovery methods
    
    validateAndFixWeaponSystem() {
        console.log(`🔧 Validating weapon system for player ${this.playerId}...`);
        console.log(`🔧 Initial weapon system state:`, !!this.weaponSystem);
        
        // Check if MultiplayerWeaponSystem class exists
        if (typeof MultiplayerWeaponSystem === 'undefined') {
            console.error(`❌ MultiplayerWeaponSystem class not found during validation`);
            return false;
        }
        
        // Check if weapon system exists
        if (!this.weaponSystem) {
            console.warn(`⚠️ Weapon system missing, recreating for player ${this.playerId}`);
            try {
                this.weaponSystem = new MultiplayerWeaponSystem(this.scene);
                console.log(`🔧 New weapon system created successfully`);
            } catch (error) {
                console.error(`❌ Failed to recreate weapon system:`, error);
                return false;
            }
        }
        
        // Check if weapon system has an owner
        if (!this.weaponSystem.owner) {
            console.warn(`⚠️ Weapon system has no owner, setting owner`);
            try {
                this.weaponSystem.setOwner(this);
                console.log(`🔧 Owner set successfully`);
            } catch (error) {
                console.error(`❌ Failed to set weapon system owner:`, error);
                return false;
            }
        }
        
        // Check if weapon system has a current weapon
        const currentWeapon = this.weaponSystem.getCurrentWeapon();
        console.log(`🔧 Current weapon before validation:`, currentWeapon?.type || 'none');
        
        if (!currentWeapon) {
            console.warn(`⚠️ No weapon equipped, forcing first weapon`);
            try {
                const success = this.weaponSystem.equipWeapon('grenade'); // Force equip grenade as default
                console.log(`🔧 Weapon equip result:`, success);
                
                // Verify the weapon was equipped
                const verifyWeapon = this.weaponSystem.getCurrentWeapon();
                if (verifyWeapon) {
                    console.log(`✅ Successfully equipped ${verifyWeapon.type}`);
                } else {
                    console.error(`❌ Failed to equip weapon even after forcing`);
                    // Try to create a weapon manually
                    try {
                        const manualWeapon = new MultiplayerWeapon(this.scene, 'grenade', this);
                        this.weaponSystem.weapons.set('grenade', manualWeapon);
                        this.weaponSystem.currentWeapon = manualWeapon;
                        this.weaponSystem.currentWeaponIndex = 0;
                        console.log(`🔧 Manually created weapon as fallback`);
                    } catch (manualError) {
                        console.error(`❌ Manual weapon creation failed:`, manualError);
                        return false;
                    }
                }
            } catch (error) {
                console.error(`❌ Failed to equip weapon:`, error);
                return false;
            }
        }
        
        const finalWeapon = this.weaponSystem.getCurrentWeapon();
        console.log(`✅ Weapon system validated for player ${this.playerId}, current weapon: ${finalWeapon?.type || 'none'}`);
        console.log(`✅ Weapon system final state:`, {
            exists: !!this.weaponSystem,
            hasOwner: !!this.weaponSystem?.owner,
            currentWeapon: finalWeapon?.type || 'none',
            weaponCount: this.weaponSystem?.weapons?.size || 0
        });
        
        return !!finalWeapon;
    }
    
    createFallbackWeaponSystem() {
        console.log(`🆘 Creating fallback weapon system for player ${this.playerId}`);
        
        try {
            // Force clear existing weapon system
            this.weaponSystem = null;
            
            // Check if classes exist
            if (typeof MultiplayerWeaponSystem === 'undefined') {
                console.error(`❌ MultiplayerWeaponSystem class not available for fallback`);
                return false;
            }
            
            if (typeof MultiplayerWeapon === 'undefined') {
                console.error(`❌ MultiplayerWeapon class not available for fallback`);
                return false;
            }
            
            // Create new weapon system
            this.weaponSystem = new MultiplayerWeaponSystem(this.scene);
            console.log(`🆘 Fallback weapon system created`);
            
            // Set owner
            this.weaponSystem.setOwner(this);
            console.log(`🆘 Fallback weapon system owner set`);
            
            // Force equip first weapon
            const success = this.weaponSystem.equipWeapon('grenade');
            console.log(`🆘 Fallback weapon equip result:`, success);
            
            // Verify
            const weapon = this.weaponSystem.getCurrentWeapon();
            if (weapon) {
                console.log(`✅ Fallback weapon system successful, weapon: ${weapon.type}`);
                return true;
            } else {
                console.error(`❌ Fallback weapon system failed - no weapon equipped`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Fallback weapon system creation failed:`, error);
            return false;
        }
    }
    
    getCurrentWeapon() {
        return this.weaponSystem?.getCurrentWeapon() || null;
    }
    
    // Weapon info methods are now handled by the weapon system
    
    updateWeaponStatusDisplay() {
        if (!this.isLocal || !this.sprite) return;
        
        // Always show weapon status for local player
        if (!this.weaponStatusDisplay) {
            this.weaponStatusDisplay = this.scene.add.text(
                this.sprite.x, this.sprite.y - 75,
                'WEAPON STATUS',
                {
                    fontSize: '14px',
                    fill: '#00ff00',
                    stroke: '#000000',
                    strokeThickness: 3,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)'
                }
            ).setOrigin(0.5);
        }
        
        // Update position
        this.weaponStatusDisplay.setPosition(this.sprite.x, this.sprite.y - 75);
        
        // Update text based on weapon status
        const currentWeapon = this.getCurrentWeapon();
        if (currentWeapon) {
            const config = currentWeapon.config;
            const ammo = currentWeapon.ammo === -1 ? '∞' : currentWeapon.ammo;
            this.weaponStatusDisplay.setText(`${config.symbol} ${config.name} [${ammo}]`);
            this.weaponStatusDisplay.setFill('#00ff00'); // Green when armed
        } else {
            this.weaponStatusDisplay.setText('NO WEAPON - Press Q');
            this.weaponStatusDisplay.setFill('#ffff00'); // Yellow when no weapon
        }
    }
    
    createLocalWeaponEffect() {
        const currentWeapon = this.getCurrentWeapon();
        if (!currentWeapon || !this.sprite) return;
        
        console.log('🎆 Creating local weapon effect');
        
        const config = currentWeapon.config;
        
        // Create a simple projectile effect
        const projectile = this.scene.add.circle(
            this.sprite.x, this.sprite.y, 
            8, config.color
        );
        
        // Animate projectile forward
        const direction = this.getMovementDirection();
        const targetX = this.sprite.x + (direction.x || 1) * 150;
        const targetY = this.sprite.y + (direction.y || 0) * 150;
        
        this.scene.tweens.add({
            targets: projectile,
            x: targetX,
            y: targetY,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Create explosion effect
                const explosion = this.scene.add.circle(
                    targetX, targetY, 
                    30, 0xff6b35
                );
                explosion.setAlpha(0.8);
                
                this.scene.tweens.add({
                    targets: explosion,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => explosion.destroy()
                });
                
                projectile.destroy();
            }
        });
        
        // Create muzzle flash effect
        const flash = this.scene.add.circle(
            this.sprite.x, this.sprite.y,
            15, 0xffffff
        );
        
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
    }
    
    // Manual weapon test functions for debugging
    testWeaponSystem() {
        console.log('🧪 MANUAL WEAPON SYSTEM TEST');
        console.log('  Player ID:', this.playerId);
        console.log('  Is Local:', this.isLocal);
        console.log('  Keys setup:', !!this.keys && Object.keys(this.keys).length > 0);
        console.log('  Current weapon:', this.getCurrentWeapon() ? this.getCurrentWeapon().type : 'none');
        console.log('  Weapon system:', !!this.weaponSystem);
        
        // Test cycling
        console.log('🔄 Testing weapon cycling...');
        if (this.weaponSystem) {
            this.weaponSystem.cycleWeapon();
        }
        
        // Test firing
        setTimeout(() => {  
            console.log('🔥 Testing weapon firing...');
            this.fireWeapon();
        }, 1000);
    }
    
    forceEquipWeapon(weaponType = 'grenade') {
        this.equipWeapon(weaponType);
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
        
        // Clean up weapon display
        if (this.weaponInfoText) {
            this.weaponInfoText.destroy();
            this.weaponInfoText = null;
        }
        if (this.weaponSymbol) {
            this.weaponSymbol.destroy();
            this.weaponSymbol = null;
        }
        if (this.noWeaponReminder) {
            this.noWeaponReminder.destroy();
            this.noWeaponReminder = null;
        }
        if (this.weaponStatusDisplay) {
            this.weaponStatusDisplay.destroy();
            this.weaponStatusDisplay = null;
        }
        
        // Clean up weapon system
        if (this.weaponSystem) {
            this.weaponSystem.destroy();
            this.weaponSystem = null;
        }
    }
}