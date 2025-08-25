class Player {
    constructor(scene, x, y, playerId) {
        this.scene = scene;
        this.playerId = playerId;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 20;
        this.bombCapacity = 1;
        this.bombCount = 0;
        this.bombPower = 3;
        this.isAlive = true;
        this.invulnerable = false;
        this.invulnerabilityTime = 1000;
        
        // Health regeneration system
        this.lastDamageTime = 0;
        this.healthRegenDelay = 3000; // Wait 3 seconds after last damage
        this.healthRegenRate = 5; // Heal 5 HP per second
        this.lastHealthRegen = 0;
        this.healthRegenInterval = 1000; // Regenerate every 1 second
        
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
        
        // Movement keys based on player ID
        this.setupControls();
        
        // Power-up effects
        this.powerUps = {
            speed: 1,
            bombs: 0,
            power: 0
        };
        
        // Weapon system
        this.currentWeapon = null;
        this.weapons = {};
        this.weaponCycleIndex = -1; // Start before first weapon
        this.shields = 0;
        this.teleportCharges = 0;
        
        // Step-based movement system
        this.gridSize = 144; // Size of each movement step (3x increase)
        this.isMoving = false; // Prevent movement during animation
        this.movementSpeed = 200; // Animation speed (ms per step)
        this.gridX = Math.round(x / this.gridSize); // Current grid position
        this.gridY = Math.round(y / this.gridSize);
        this.targetX = x; // Target pixel position
        this.targetY = y;
        this.movementTween = null;
        
        // Snap to grid initially
        this.sprite.x = this.gridX * this.gridSize;
        this.sprite.y = this.gridY * this.gridSize;
        this.targetX = this.sprite.x;
        this.targetY = this.sprite.y;
        
        // Trail system - initialize after a small delay to ensure sprite is ready
        this.trailManager = null;
        this.scene.time.delayedCall(100, () => {
            try {
                this.trailManager = new PlayerTrailManager(scene, this);
                this.trailManager.setTrailType(this.getPlayerTrailType());
                this.trailManager.setIntensity('normal');
            } catch (error) {
                console.warn('Trail system initialization failed:', error);
            }
        });
    }
    
    setupControls() {
        const cursors = this.scene.input.keyboard.createCursorKeys();
        const wasd = this.scene.input.keyboard.addKeys('W,S,A,D,SPACE,Q,E');
        const ijkl = this.scene.input.keyboard.addKeys('I,K,J,L,U,O,P');
        const numpad = this.scene.input.keyboard.addKeys('NUMPAD_EIGHT,NUMPAD_FIVE,NUMPAD_FOUR,NUMPAD_SIX,NUMPAD_ZERO,NUMPAD_ONE,NUMPAD_THREE');
        
        switch(this.playerId) {
            case 1:
                this.keys = {
                    up: wasd.W,
                    down: wasd.S,
                    left: wasd.A,
                    right: wasd.D,
                    bomb: wasd.SPACE,
                    weapon: wasd.Q,
                    special: wasd.E,
                    detonateBomb: this.scene.input.keyboard.addKey('F')
                };
                break;
            case 2:
                this.keys = {
                    up: cursors.up,
                    down: cursors.down,
                    left: cursors.left,
                    right: cursors.right,
                    bomb: this.scene.input.keyboard.addKey('ENTER'),
                    weapon: this.scene.input.keyboard.addKey('SHIFT'),
                    special: this.scene.input.keyboard.addKey('CTRL'),
                    detonateBomb: this.scene.input.keyboard.addKey('NUMPAD_ENTER')
                };
                break;
            case 3:
                this.keys = {
                    up: ijkl.I,
                    down: ijkl.K,
                    left: ijkl.J,
                    right: ijkl.L,
                    bomb: ijkl.U,
                    weapon: ijkl.O,
                    special: ijkl.P,
                    detonateBomb: this.scene.input.keyboard.addKey('H')
                };
                break;
            case 4:
                this.keys = {
                    up: numpad.NUMPAD_EIGHT,
                    down: numpad.NUMPAD_FIVE,
                    left: numpad.NUMPAD_FOUR,
                    right: numpad.NUMPAD_SIX,
                    bomb: numpad.NUMPAD_ZERO,
                    weapon: numpad.NUMPAD_ONE,
                    special: numpad.NUMPAD_THREE,
                    detonateBomb: this.scene.input.keyboard.addKey('NUMPAD_ADD')
                };
                break;
        }
    }
    
    update(time, delta) {
        if (!this.isAlive || !this.sprite) return;
        
        // Handle continuous movement (temporarily back to old system)
        this.handleContinuousMovement();
        
        // Handle weapon cycling (Q key)
        if (Phaser.Input.Keyboard.JustDown(this.keys.weapon)) {
            this.cycleToNextWeapon();
        }
        
        // Handle weapon firing (SPACE key)
        if (Phaser.Input.Keyboard.JustDown(this.keys.bomb)) {
            this.fireCurrentWeapon();
        }
        
        // Handle bomb detonation (F key)
        if (Phaser.Input.Keyboard.JustDown(this.keys.detonateBomb)) {
            this.detonateBombs();
        }
        
        // Handle special abilities
        if (Phaser.Input.Keyboard.JustDown(this.keys.special)) {
            this.useSpecialAbility();
        }
        
        // Handle health regeneration
        this.handleHealthRegeneration(time);
        
        // Update player text position
        if (this.playerText && this.sprite) {
            this.playerText.setPosition(this.sprite.x, this.sprite.y);
        }
        
        // Update weapon symbol position
        if (this.weaponSymbol && this.sprite) {
            this.weaponSymbol.setPosition(this.sprite.x + 20, this.sprite.y - 20);
        }
        
        // Update reload timer display
        this.updateReloadTimer();
        
        // Update UI
        this.updateUI();
        
        // Update weapon cooldowns
        if (this.currentWeapon) {
            this.currentWeapon.update(delta);
        }
        
        // Update shield position
        if (this.hasActiveShield && this.shieldSprite && this.sprite) {
            this.shieldSprite.setPosition(this.sprite.x, this.sprite.y);
        }
        
        // Update trail system
        if (this.trailManager) {
            this.trailManager.update(this.scene.time.now, delta);
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
    
    handleContinuousMovement() {
        if (!this.sprite) return;
        
        let velocityX = 0;
        let velocityY = 0;
        const moveSpeed = this.speed * this.powerUps.speed;
        
        // Check for continuous key presses
        if (this.keys.left.isDown) {
            velocityX = -moveSpeed;
        } else if (this.keys.right.isDown) {
            velocityX = moveSpeed;
        }
        
        if (this.keys.up.isDown) {
            velocityY = -moveSpeed;
        } else if (this.keys.down.isDown) {
            velocityY = moveSpeed;
        }
        
        // Check boundaries and prevent movement outside walls
        const bounds = this.scene.game.config;
        const playerX = this.sprite.x;
        const playerY = this.sprite.y;
        const playerRadius = 16;
        const wallBuffer = 25; // Buffer to keep player inside walls
        
        const smallBounceForce = 10; // Small bounce velocity
        
        // Check horizontal boundaries
        if (playerX - playerRadius <= wallBuffer && velocityX < 0) {
            // Hit left wall - add small bounce right
            velocityX = smallBounceForce;
            this.createSubtleBounceEffect();
            if (playerX - playerRadius < wallBuffer) {
                // Push player back inside if already outside
                this.sprite.x = wallBuffer + playerRadius;
            }
        } else if (playerX + playerRadius >= bounds.width - wallBuffer && velocityX > 0) {
            // Hit right wall - add small bounce left
            velocityX = -smallBounceForce;
            this.createSubtleBounceEffect();
            if (playerX + playerRadius > bounds.width - wallBuffer) {
                // Push player back inside if already outside
                this.sprite.x = bounds.width - wallBuffer - playerRadius;
            }
        }
        
        // Check vertical boundaries
        if (playerY - playerRadius <= wallBuffer && velocityY < 0) {
            // Hit top wall - add small bounce down
            velocityY = smallBounceForce;
            this.createSubtleBounceEffect();
            if (playerY - playerRadius < wallBuffer) {
                // Push player back inside if already outside
                this.sprite.y = wallBuffer + playerRadius;
            }
        } else if (playerY + playerRadius >= bounds.height - wallBuffer && velocityY > 0) {
            // Hit bottom wall - add small bounce up
            velocityY = -smallBounceForce;
            this.createSubtleBounceEffect();
            if (playerY + playerRadius > bounds.height - wallBuffer) {
                // Push player back inside if already outside
                this.sprite.y = bounds.height - wallBuffer - playerRadius;
            }
        }
        
        // Apply velocity to sprite
        this.sprite.setVelocity(velocityX, velocityY);
        
        // Update isMoving flag for zoom system
        this.isMoving = (velocityX !== 0 || velocityY !== 0);
    }
    
    
    createSubtleBounceEffect() {
        if (!this.sprite || this.bounceInvulnerable) return;
        
        // Set brief bounce invulnerability to prevent spam
        this.bounceInvulnerable = true;
        
        // Very subtle visual effect - slight scale pulse
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.sprite) {
                    this.sprite.setScale(1, 1);
                }
            }
        });
        
        // Very light screen shake
        this.scene.cameras.main.shake(50, 0.002);
        
        // Reset bounce invulnerability quickly
        this.scene.time.delayedCall(150, () => {
            this.bounceInvulnerable = false;
        });
    }
    
    handleHealthRegeneration(currentTime) {
        // Only regenerate if player is alive and not at full health
        if (!this.isAlive || this.health >= this.maxHealth) return;
        
        // Check if enough time has passed since last damage
        const timeSinceLastDamage = currentTime - this.lastDamageTime;
        if (timeSinceLastDamage < this.healthRegenDelay) return;
        
        // Check if it's time for the next regeneration tick
        const timeSinceLastRegen = currentTime - this.lastHealthRegen;
        if (timeSinceLastRegen < this.healthRegenInterval) return;
        
        // Regenerate health
        const oldHealth = this.health;
        this.health = Math.min(this.health + this.healthRegenRate, this.maxHealth);
        this.lastHealthRegen = currentTime;
        
        // Visual feedback for health regeneration
        if (this.health > oldHealth) {
            this.createHealthRegenEffect();
        }
    }
    
    createHealthRegenEffect() {
        if (!this.sprite) return;
        
        // Green healing sparkles
        const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, 'spark', {
            speed: { min: 20, max: 40 },
            scale: { start: 0.2, end: 0 },
            lifespan: 800,
            quantity: 3,
            tint: 0x2ecc71, // Green color
            alpha: { start: 0.8, end: 0 }
        });
        
        // Clean up particles
        this.scene.time.delayedCall(900, () => {
            if (particles) particles.destroy();
        });
        
        // Subtle green flash on player
        const originalColor = this.color;
        this.sprite.setFillStyle(0x2ecc71);
        
        this.scene.time.delayedCall(200, () => {
            if (this.sprite) {
                this.sprite.setFillStyle(originalColor);
            }
        });
    }
    
    handleStepMovement() {
        // Don't handle new movement if already moving
        if (this.isMoving) return;
        
        let newGridX = this.gridX;
        let newGridY = this.gridY;
        let moved = false;
        
        // Check for key presses (JustDown = single press detection)
        if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
            newGridX--;
            moved = true;
            console.log(`Player ${this.playerId} pressed LEFT, moving to grid ${newGridX}, ${newGridY}`);
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
            newGridX++;
            moved = true;
            console.log(`Player ${this.playerId} pressed RIGHT, moving to grid ${newGridX}, ${newGridY}`);
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
            newGridY--;
            moved = true;
            console.log(`Player ${this.playerId} pressed UP, moving to grid ${newGridX}, ${newGridY}`);
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
            newGridY++;
            moved = true;
            console.log(`Player ${this.playerId} pressed DOWN, moving to grid ${newGridX}, ${newGridY}`);
        }
        
        if (moved) {
            // Check boundaries and collisions
            if (this.canMoveTo(newGridX, newGridY)) {
                console.log(`Player ${this.playerId} can move to ${newGridX}, ${newGridY}`);
                this.moveToGrid(newGridX, newGridY);
            } else {
                console.log(`Player ${this.playerId} CANNOT move to ${newGridX}, ${newGridY}`);
            }
        }
    }
    
    canMoveTo(gridX, gridY) {
        // Convert grid position to pixel position
        const pixelX = gridX * this.gridSize;
        const pixelY = gridY * this.gridSize;
        
        // Check game boundaries (allow players to reach walls)
        const bounds = this.scene.game.config;
        const margin = 72; // Half grid size - allows players to get close to walls
        
        if (pixelX < margin || pixelX > bounds.width - margin ||
            pixelY < margin || pixelY > bounds.height - margin) {
            console.log(`Boundary check failed: ${pixelX}, ${pixelY} vs bounds ${bounds.width}x${bounds.height} with margin ${margin}`);
            return false;
        }
        
        // Check collision with destructible blocks (very small radius for 144px movement)
        if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
            // Filter out null/undefined blocks before iteration to prevent null reference errors
            const validBlocks = this.scene.destructibleBlocks.filter(block => 
                block && 
                block.x !== undefined && 
                block.y !== undefined && 
                block.active !== false &&
                !block.destroyed
            );
            
            for (let block of validBlocks) {
                const distance = Phaser.Math.Distance.Between(pixelX, pixelY, block.x, block.y);
                if (distance < 30) { // Very small collision radius - blocks are 48px, so 30px gives some space
                    console.log(`Destructible block collision at distance ${distance}`);
                    return false;
                }
            }
        }
        
        // Check collision with indestructible blocks (distance-based for larger steps)
        const indestructiblePositions = [
            { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 200, y: 600 },
            { x: 400, y: 200 }, { x: 400, y: 600 },
            { x: 600, y: 200 }, { x: 600, y: 600 },
            { x: 800, y: 200 }, { x: 800, y: 400 }, { x: 800, y: 600 }
        ];
        
        for (let pos of indestructiblePositions) {
            const distance = Phaser.Math.Distance.Between(pixelX, pixelY, pos.x, pos.y);
            if (distance < 30) { // Very small collision radius
                console.log(`Indestructible block collision at distance ${distance}`);
                return false;
            }
        }
        
        // Check collision with bombs (distance-based for larger steps)
        if (this.scene.bombs && Array.isArray(this.scene.bombs)) {
            // Filter out null/undefined bombs before iteration
            const validBombs = this.scene.bombs.filter(bomb => 
                bomb && 
                bomb.sprite && 
                bomb.sprite.active &&
                bomb.sprite.x !== undefined &&
                bomb.sprite.y !== undefined
            );
            
            for (let bomb of validBombs) {
                const distance = Phaser.Math.Distance.Between(pixelX, pixelY, bomb.sprite.x, bomb.sprite.y);
                if (distance < 30) { // Small collision radius for bombs
                    console.log(`Bomb collision at distance ${distance}`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    moveToGrid(newGridX, newGridY) {
        this.isMoving = true;
        this.gridX = newGridX;
        this.gridY = newGridY;
        
        const newPixelX = newGridX * this.gridSize;
        const newPixelY = newGridY * this.gridSize;
        
        // Calculate movement speed based on power-ups
        const actualSpeed = this.movementSpeed / this.powerUps.speed;
        
        // Kill any existing movement tween
        if (this.movementTween) {
            this.movementTween.destroy();
        }
        
        // Create smooth movement animation with bounce effect
        this.movementTween = this.scene.tweens.add({
            targets: this.sprite,
            x: newPixelX,
            y: newPixelY,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: actualSpeed * 0.6,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Return to normal scale
                this.scene.tweens.add({
                    targets: this.sprite,
                    scaleX: 1,
                    scaleY: 1,
                    duration: actualSpeed * 0.4,
                    ease: 'Power2',
                    onComplete: () => {
                        this.isMoving = false;
                        this.movementTween = null;
                        
                        // Update target position for camera tracking
                        this.targetX = newPixelX;
                        this.targetY = newPixelY;
                        
                        // Trigger trail effect for movement
                        if (this.trailManager) {
                            this.trailManager.speed = 3; // Simulate movement for trail
                            this.scene.time.delayedCall(100, () => {
                                if (this.trailManager) {
                                    this.trailManager.speed = 0;
                                }
                            });
                        }
                    }
                });
            }
        });
    }
    
    placeBomb() {
        if (this.bombCount >= this.bombCapacity) return;
        
        // Get mouse position for aiming
        const mousePointer = this.scene.input.activePointer;
        let targetX = mousePointer.worldX;
        let targetY = mousePointer.worldY;
        
        // If no mouse input or mouse is at (0,0), place bomb at player position (fallback)
        if (targetX === 0 && targetY === 0) {
            const bombGridSize = 64;
            targetX = Math.round(this.sprite.x / bombGridSize) * bombGridSize;
            targetY = Math.round(this.sprite.y / bombGridSize) * bombGridSize;
        } else {
            // Calculate throw distance and limit it
            const playerX = this.sprite.x;
            const playerY = this.sprite.y;
            const distance = Phaser.Math.Distance.Between(playerX, playerY, targetX, targetY);
            const maxThrowDistance = 200; // Maximum throw distance
            
            if (distance > maxThrowDistance) {
                // Limit throw distance
                const angle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
                targetX = playerX + Math.cos(angle) * maxThrowDistance;
                targetY = playerY + Math.sin(angle) * maxThrowDistance;
            }
            
            // Snap to grid for final placement
            const bombGridSize = 64;
            targetX = Math.round(targetX / bombGridSize) * bombGridSize;
            targetY = Math.round(targetY / bombGridSize) * bombGridSize;
        }
        
        // Check if there's already a bomb at target position
        let bombExists = false;
        if (this.scene.bombs && Array.isArray(this.scene.bombs)) {
            // Filter out null/undefined bombs before iteration
            const validBombs = this.scene.bombs.filter(bomb => 
                bomb && 
                bomb.sprite && 
                bomb.sprite.active &&
                bomb.sprite.x !== undefined &&
                bomb.sprite.y !== undefined
            );
            
            validBombs.forEach(bomb => {
                if (Math.abs(bomb.sprite.x - targetX) < 32 && Math.abs(bomb.sprite.y - targetY) < 32) {
                    bombExists = true;
                }
            });
        }
        
        if (bombExists) return;
        
        // Create throwable bomb with trajectory
        const bomb = new Bomb(this.scene, this.sprite.x, this.sprite.y, this, this.bombPower, targetX, targetY);
        this.scene.bombs.push(bomb);
        this.bombCount++;
    }
    
    detonateBombs() {
        if (!this.scene.bombs || !Array.isArray(this.scene.bombs)) return;
        
        // Find all bombs belonging to this player
        const playerBombs = this.scene.bombs.filter(bomb => 
            bomb && 
            bomb.owner === this && 
            !bomb.exploded &&
            bomb.sprite &&
            bomb.sprite.active
        );
        
        // Detonate all player's bombs
        playerBombs.forEach(bomb => {
            bomb.explode();
        });
        
        // Visual/audio feedback for detonation
        if (playerBombs.length > 0) {
            console.log(`Player ${this.playerId} detonated ${playerBombs.length} bomb(s)`);
        }
    }
    
    takeDamage(damage) {
        if (!this.isAlive || this.invulnerable) return;
        
        // Record damage time for health regeneration system
        this.lastDamageTime = this.scene.time.now;
        
        // Check if shield is active
        if (this.hasActiveShield) {
            this.deactivateShield();
            // Shields absorb 50% of damage
            damage *= 0.5;
        }
        
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
        // Apply the power-up effect
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
            case 'shield':
                this.shields += 3;
                break;
            case 'teleport':
                this.teleportCharges += 2;
                break;
            // Weapon pickups
            case 'grenade':
            case 'rocket':
            case 'flamethrower':
            case 'sword':
                this.equipWeapon(powerUpType);
                break;
        }
        
        // Enhance trail effect based on power-up
        this.enhanceTrailForPowerUp(powerUpType);
    }
    
    onBombExploded() {
        this.bombCount--;
    }
    
    equipWeapon(weaponType) {
        if (!this.weapons[weaponType]) {
            this.weapons[weaponType] = new Weapon(this.scene, weaponType, this);
        } else {
            this.weapons[weaponType].reload();
        }
        this.currentWeapon = this.weapons[weaponType];
        
        // Show weapon info when equipped
        this.showWeaponInfo();
    }
    
    equipRandomWeapon() {
        const allWeaponTypes = ['grenade', 'rocket', 'flamethrower', 'sword', 'sniper', 'shotgun', 'lightning'];
        const randomWeapon = allWeaponTypes[Math.floor(Math.random() * allWeaponTypes.length)];
        
        this.equipWeapon(randomWeapon);
        return randomWeapon;
    }
    
    cycleToNextWeapon() {
        const allWeaponTypes = ['grenade', 'rocket', 'flamethrower', 'sword', 'sniper', 'shotgun', 'lightning'];
        
        // Cycle to next weapon
        this.weaponCycleIndex = (this.weaponCycleIndex + 1) % allWeaponTypes.length;
        const selectedWeapon = allWeaponTypes[this.weaponCycleIndex];
        
        console.log(`Player ${this.playerId} cycled to: ${selectedWeapon} (${this.weaponCycleIndex + 1}/${allWeaponTypes.length})`);
        
        this.equipWeapon(selectedWeapon);
        return selectedWeapon;
    }
    
    fireCurrentWeapon() {
        // If no weapon selected, start with first weapon
        if (!this.currentWeapon) {
            this.cycleToNextWeapon();
        }
        
        if (!this.currentWeapon) return;
        
        const mousePointer = this.scene.input.activePointer;
        let targetX = mousePointer.worldX;
        let targetY = mousePointer.worldY;
        
        // If no mouse input, fire in the direction the player is moving
        if (targetX === 0 && targetY === 0) {
            const direction = this.getMovementDirection();
            targetX = this.sprite.x + direction.x * 100;
            targetY = this.sprite.y + direction.y * 100;
        }
        
        this.currentWeapon.fire(targetX, targetY);
        
        // Update weapon symbol to show current weapon
        this.updateWeaponSymbol();
    }
    
    showWeaponInfo() {
        if (!this.currentWeapon) return;
        
        const config = this.currentWeapon.config;
        const weaponName = config.name;
        const ammo = this.currentWeapon.ammo === -1 ? '∞' : this.currentWeapon.ammo;
        const damage = config.damage;
        
        // Create weapon info display
        if (this.weaponInfoText) {
            this.weaponInfoText.destroy();
        }
        
        this.weaponInfoText = this.scene.add.text(
            this.sprite.x, this.sprite.y - 50, 
            `${weaponName}\n${damage}DMG | ${ammo} ammo`, 
            {
                fontSize: '12px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Keep weapon info visible longer since players need to see their selected weapon
        this.scene.tweens.add({
            targets: this.weaponInfoText,
            alpha: 0,
            duration: 5000,
            onComplete: () => {
                if (this.weaponInfoText) {
                    this.weaponInfoText.destroy();
                    this.weaponInfoText = null;
                }
            }
        });
        
        // Add weapon symbol indicator that follows player
        if (this.weaponSymbol) {
            this.weaponSymbol.destroy();
        }
        
        this.weaponSymbol = this.scene.add.text(
            this.sprite.x + 20, this.sprite.y - 20,
            config.symbol,
            {
                fontSize: '14px',
                fill: '#' + config.color.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);
        
        // Create reload timer display
        this.createReloadTimer();
    }
    
    fireWeapon() {
        // Equip a random weapon for each attack
        const randomWeapon = this.equipRandomWeapon();
        
        if (!this.currentWeapon) return;
        
        const mousePointer = this.scene.input.activePointer;
        let targetX = mousePointer.worldX;
        let targetY = mousePointer.worldY;
        
        // If no mouse input, fire in the direction the player is moving
        if (targetX === 0 && targetY === 0) {
            const direction = this.getMovementDirection();
            targetX = this.sprite.x + direction.x * 100;
            targetY = this.sprite.y + direction.y * 100;
        }
        
        this.currentWeapon.fire(targetX, targetY);
        
        // Update weapon symbol to show current weapon
        this.updateWeaponSymbol();
    }
    
    updateWeaponSymbol() {
        if (!this.currentWeapon) return;
        
        const config = this.currentWeapon.config;
        const ammo = this.currentWeapon.ammo === -1 ? '∞' : this.currentWeapon.ammo;
        
        if (this.weaponSymbol) {
            this.weaponSymbol.setText(`${config.symbol}:${ammo}`);
            this.weaponSymbol.setFill('#' + config.color.toString(16).padStart(6, '0'));
        }
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
    
    useSpecialAbility() {
        // Primary special ability: Place bomb
        if (this.bombCount < this.bombCapacity) {
            this.placeBomb();
        } else if (this.shields > 0) {
            this.activateShield();
        } else if (this.teleportCharges > 0) {
            this.teleport();
        }
    }
    
    activateShield() {
        if (this.shields <= 0 || this.hasActiveShield) return;
        
        this.shields--;
        this.hasActiveShield = true;
        this.shieldSprite = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0x9b59b6);
        this.shieldSprite.setAlpha(0.3);
        this.shieldSprite.setStrokeStyle(3, 0x9b59b6);
        
        this.scene.time.delayedCall(5000, () => {
            this.deactivateShield();
        });
    }
    
    deactivateShield() {
        this.hasActiveShield = false;
        if (this.shieldSprite) {
            this.shieldSprite.destroy();
            this.shieldSprite = null;
        }
    }
    
    teleport() {
        if (this.teleportCharges <= 0) return;
        
        this.teleportCharges--;
        
        // Find a safe teleport location
        let attempts = 0;
        let newX, newY;
        
        do {
            newX = Phaser.Math.Between(50, this.scene.game.config.width - 50);
            newY = Phaser.Math.Between(50, this.scene.game.config.height - 50);
            attempts++;
        } while (attempts < 20 && this.isLocationBlocked(newX, newY));
        
        if (attempts < 20) {
            // Teleport effect at old position
            this.createTeleportEffect(this.sprite.x, this.sprite.y);
            
            // Move player
            this.sprite.x = newX;
            this.sprite.y = newY;
            
            // Teleport effect at new position
            this.createTeleportEffect(newX, newY);
        }
    }
    
    isLocationBlocked(x, y) {
        // Check destructible blocks - filter out null/undefined blocks first
        if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
            const validBlocks = this.scene.destructibleBlocks.filter(block => 
                block && 
                block.x !== undefined && 
                block.y !== undefined && 
                block.active !== false &&
                !block.destroyed
            );
            
            for (let block of validBlocks) {
                if (Phaser.Math.Distance.Between(x, y, block.x, block.y) < 60) {
                    return true;
                }
            }
        }
        
        // Check other players - filter out null/undefined players first
        if (this.scene.players && Array.isArray(this.scene.players)) {
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player !== this && 
                player.isAlive && 
                player.sprite && 
                player.sprite.active
            );
            
            for (let player of validPlayers) {
                if (Phaser.Math.Distance.Between(x, y, player.sprite.x, player.sprite.y) < 80) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    createTeleportEffect(x, y) {
        const effect = this.scene.add.circle(x, y, 30, 0x1abc9c);
        effect.setAlpha(0.6);
        
        this.scene.tweens.add({
            targets: effect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => effect.destroy()
        });
        
        const particles = this.scene.add.particles(x, y, 'spark', {
            speed: { min: 40, max: 80 },
            scale: { start: 0.3, end: 0 },
            lifespan: 300,
            quantity: 12,
            tint: 0x1abc9c
        });
        
        this.scene.time.delayedCall(400, () => particles.destroy());
    }
    
    getPlayerTrailType() {
        // Check if user has a preferred trail type
        const preferredTrail = localStorage.getItem('preferredTrailType');
        if (preferredTrail) {
            return preferredTrail;
        }
        
        // Default: Different trail types for different players
        const playerTrails = ['sparkle', 'neon', 'fire', 'lightning'];
        return playerTrails[this.playerId - 1] || 'sparkle';
    }
    
    // Trail enhancement methods
    enhanceTrailForPowerUp(powerUpType) {
        if (!this.trailManager) return;
        
        switch(powerUpType) {
            case 'speed':
                this.trailManager.setIntensity('maximum');
                this.scene.time.delayedCall(10000, () => {
                    this.trailManager.setIntensity('normal');
                });
                break;
            case 'shield':
                this.trailManager.setCustomColor(0x9b59b6);
                this.scene.time.delayedCall(5000, () => {
                    this.trailManager.usePlayerColor = true;
                });
                break;
            case 'teleport':
                this.trailManager.enableRainbowMode();
                this.scene.time.delayedCall(3000, () => {
                    this.trailManager.rainbowMode = false;
                    this.trailManager.usePlayerColor = true;
                });
                break;
            case 'grenade':
                this.trailManager.setCustomColor(0x8b4513);
                break;
            case 'rocket':
                this.trailManager.setCustomColor(0xff4500);
                break;
            case 'flamethrower':
                this.trailManager.setTrailType('fire');
                break;
            case 'sword':
                this.trailManager.setCustomColor(0xc0c0c0);
                break;
        }
    }
    
    setTrailType(trailType) {
        if (this.trailManager) {
            this.trailManager.setTrailType(trailType);
        }
    }
    
    setTrailIntensity(intensity) {
        if (this.trailManager) {
            this.trailManager.setIntensity(intensity);
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
        if (this.movementTween) {
            this.movementTween.destroy();
            this.movementTween = null;
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
        
        // Clean up trail system
        if (this.trailManager) {
            this.trailManager.destroy();
            this.trailManager = null;
        }
        
        // Clean up shield sprite
        if (this.shieldSprite) {
            this.shieldSprite.destroy();
            this.shieldSprite = null;
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
        
        // Clean up reload timer display
        if (this.reloadTimerBg) {
            this.reloadTimerBg.destroy();
            this.reloadTimerBg = null;
        }
        if (this.reloadTimerBar) {
            this.reloadTimerBar.destroy();
            this.reloadTimerBar = null;
        }
        if (this.reloadTimerText) {
            this.reloadTimerText.destroy();
            this.reloadTimerText = null;
        }
    }
    
    createReloadTimer() {
        // Clean up existing reload timer elements
        if (this.reloadTimerBg) {
            this.reloadTimerBg.destroy();
        }
        if (this.reloadTimerBar) {
            this.reloadTimerBar.destroy();
        }
        if (this.reloadTimerText) {
            this.reloadTimerText.destroy();
        }
        
        // Create reload timer background (gray bar)
        this.reloadTimerBg = this.scene.add.rectangle(
            this.sprite.x, this.sprite.y + 30,
            60, 8, 0x333333
        ).setStrokeStyle(1, 0x000000);
        
        // Create reload timer progress bar (green when ready, red when reloading)
        this.reloadTimerBar = this.scene.add.rectangle(
            this.sprite.x, this.sprite.y + 30,
            60, 8, 0x00ff00
        );
        
        // Create reload timer text (shows countdown)
        this.reloadTimerText = this.scene.add.text(
            this.sprite.x, this.sprite.y + 42,
            'Ready',
            {
                fontSize: '10px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Initially hide the timer (will show when weapon is on cooldown)
        this.reloadTimerBg.setVisible(false);
        this.reloadTimerBar.setVisible(false);
        this.reloadTimerText.setVisible(false);
    }
    
    updateReloadTimer() {
        if (!this.currentWeapon || !this.reloadTimerBg || !this.reloadTimerBar || !this.reloadTimerText) {
            return;
        }
        
        const now = Date.now();
        const timeSinceLastFired = now - this.currentWeapon.lastFired;
        const cooldownTime = this.currentWeapon.config.cooldownTime;
        const timeRemaining = Math.max(0, cooldownTime - timeSinceLastFired);
        
        // Update positions to follow player
        const timerX = this.sprite.x;
        const timerY = this.sprite.y + 30;
        const textY = this.sprite.y + 42;
        
        this.reloadTimerBg.setPosition(timerX, timerY);
        this.reloadTimerBar.setPosition(timerX, timerY);
        this.reloadTimerText.setPosition(timerX, textY);
        
        if (timeRemaining > 0) {
            // Weapon is on cooldown - show timer
            this.reloadTimerBg.setVisible(true);
            this.reloadTimerBar.setVisible(true);
            this.reloadTimerText.setVisible(true);
            
            // Calculate progress (0 to 1)
            const progress = 1 - (timeRemaining / cooldownTime);
            const barWidth = 60 * progress;
            
            // Update bar width and color
            this.reloadTimerBar.setSize(barWidth, 8);
            this.reloadTimerBar.setPosition(timerX - (60 - barWidth) / 2, timerY);
            
            // Color changes from red to yellow to green as it reloads
            if (progress < 0.5) {
                this.reloadTimerBar.setFillStyle(0xff0000); // Red
            } else if (progress < 0.8) {
                this.reloadTimerBar.setFillStyle(0xffaa00); // Orange
            } else {
                this.reloadTimerBar.setFillStyle(0x00ff00); // Green
            }
            
            // Update text to show time remaining
            const secondsRemaining = Math.ceil(timeRemaining / 1000);
            this.reloadTimerText.setText(`${secondsRemaining}s`);
            this.reloadTimerText.setFill('#ffffff');
            
        } else {
            // Weapon is ready - hide timer or show ready state
            if (this.currentWeapon.ammo <= 0 && this.currentWeapon.ammo !== -1) {
                // Out of ammo - show empty state
                this.reloadTimerBg.setVisible(true);
                this.reloadTimerBar.setVisible(true);
                this.reloadTimerText.setVisible(true);
                
                this.reloadTimerBar.setSize(60, 8);
                this.reloadTimerBar.setPosition(timerX, timerY);
                this.reloadTimerBar.setFillStyle(0x666666); // Gray for empty
                this.reloadTimerText.setText('EMPTY');
                this.reloadTimerText.setFill('#ff0000');
            } else {
                // Ready to fire - hide timer
                this.reloadTimerBg.setVisible(false);
                this.reloadTimerBar.setVisible(false);
                this.reloadTimerText.setVisible(false);
            }
        }
    }
}