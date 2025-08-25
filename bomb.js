class Bomb {
    constructor(scene, x, y, owner, power = 3, targetX = null, targetY = null) {
        this.scene = scene;
        this.owner = owner;
        this.power = power;
        this.baseFuseTime = 3000; // Base 3 seconds
        this.fuseTime = this.baseFuseTime;
        this.exploded = false;
        this.isMoving = false;
        this.countdownStarted = false;
        
        // Enhanced proximity detection system
        this.proximityRadius = 80; // Detection radius for enemies
        this.lastProximityCheck = 0;
        this.proximityCheckInterval = 200; // Check every 200ms
        this.hasEnemiesNearby = false;
        this.proximityStartTime = 0; // When enemies first detected
        this.lastProximityReduction = 0; // When we last reduced the timer
        this.proximityReductionInterval = 500; // Reduce timer every 500ms of sustained presence
        this.enemyCount = 0; // How many enemies are currently nearby
        
        // Magnetic homing system
        this.homingEnabled = false;
        this.homingSpeed = 15; // pixels per second
        this.homingRadius = 150; // Detection radius for homing
        this.currentTarget = null;
        this.lastHomingUpdate = 0;
        this.homingUpdateInterval = 100; // Update homing every 100ms
        this.ownerImmunityTime = 2000; // 2 seconds before owner becomes target
        this.timeSinceCreation = 0;
        
        // Trajectory settings
        this.startX = x;
        this.startY = y;
        this.targetX = targetX || x;
        this.targetY = targetY || y;
        this.shouldThrow = (targetX !== null && targetY !== null && (Math.abs(targetX - x) > 10 || Math.abs(targetY - y) > 10));
        
        // Create bomb sprite
        this.sprite = scene.add.circle(x, y, 16, 0x2c3e50);
        this.sprite.setStrokeStyle(2, 0x34495e);
        
        // Add physics - dynamic if throwing, static if not
        scene.matter.add.gameObject(this.sprite, {
            shape: 'circle',
            isStatic: !this.shouldThrow,
            isSensor: false,
            density: 0.001,
            frictionAir: 0.01
        });
        
        // Add fuse animation
        this.fuseText = scene.add.text(x, y - 30, '3', {
            fontSize: '20px',
            fill: '#e74c3c',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Add pulsing animation
        this.pulseTween = scene.tweens.add({
            targets: this.sprite,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Start trajectory if throwing
        if (this.shouldThrow) {
            this.startTrajectory();
        } else {
            // Start countdown immediately if not throwing
            this.startCountdown();
            // Enable homing immediately for non-thrown bombs
            this.homingEnabled = true;
        }
    }
    
    startTrajectory() {
        this.isMoving = true;
        
        // Calculate trajectory with arc physics
        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.targetX, this.targetY);
        const throwDuration = Math.min(800, distance * 2); // Duration based on distance
        
        // Create arc trajectory using tweens
        this.trajectoryTween = this.scene.tweens.add({
            targets: this.sprite,
            x: this.targetX,
            y: this.targetY,
            duration: throwDuration,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                // Update fuse text position to follow bomb
                if (this.fuseText) {
                    this.fuseText.setPosition(this.sprite.x, this.sprite.y - 30);
                }
            },
            onComplete: () => {
                // Bomb has landed, make it static and start countdown
                this.isMoving = false;
                if (this.sprite && this.sprite.body) {
                    this.sprite.body.isStatic = false; // Keep dynamic for homing
                }
                this.startCountdown();
                // Enable homing after landing
                this.homingEnabled = true;
            }
        });
        
        // Add vertical arc effect with separate Y tween
        const arcHeight = Math.min(60, distance * 0.3); // Arc height based on distance
        this.arcTween = this.scene.tweens.add({
            targets: this.sprite,
            y: this.startY - arcHeight,
            duration: throwDuration / 2,
            ease: 'Quad.easeOut',
            yoyo: true,
            onUpdate: () => {
                // Update fuse text position
                if (this.fuseText) {
                    this.fuseText.setPosition(this.sprite.x, this.sprite.y - 30);
                }
            }
        });
    }
    
    update(delta) {
        const currentTime = this.scene.time.now;
        this.timeSinceCreation += delta;
        
        // Update method for trajectory movement
        if (this.isMoving && this.fuseText) {
            this.fuseText.setPosition(this.sprite.x, this.sprite.y - 30);
        }
        
        // Homing system (when enabled and countdown > 1 second)
        if (this.homingEnabled && !this.exploded && this.countdownStarted && this.currentTimeLeft > 1) {
            if (currentTime - this.lastHomingUpdate > this.homingUpdateInterval) {
                this.updateHoming(delta);
                this.lastHomingUpdate = currentTime;
            }
        }
        
        // Update fuse text position if bomb is moving via homing
        if (this.fuseText && (this.isMoving || this.homingEnabled)) {
            this.fuseText.setPosition(this.sprite.x, this.sprite.y - 30);
        }
        
        // Proximity detection for smart timing (only when countdown has started)
        if (this.countdownStarted && !this.exploded) {
            if (currentTime - this.lastProximityCheck > this.proximityCheckInterval) {
                this.checkEnemyProximity();
                this.lastProximityCheck = currentTime;
            }
        }
    }
    
    updateHoming(delta) {
        if (!this.sprite || !this.scene.players) return;
        
        // Find nearest valid target
        this.currentTarget = this.findNearestTarget();
        
        if (this.currentTarget && this.currentTarget.sprite) {
            // Calculate direction to target
            const targetX = this.currentTarget.sprite.x;
            const targetY = this.currentTarget.sprite.y;
            const bombX = this.sprite.x;
            const bombY = this.sprite.y;
            
            const distance = Phaser.Math.Distance.Between(bombX, bombY, targetX, targetY);
            
            // Only home if target is within homing radius
            if (distance <= this.homingRadius && distance > 20) { // Don't home if too close
                // Calculate normalized direction vector
                const dirX = (targetX - bombX) / distance;
                const dirY = (targetY - bombY) / distance;
                
                // Apply homing velocity
                const homingVelocityX = dirX * this.homingSpeed;
                const homingVelocityY = dirY * this.homingSpeed;
                
                // Set velocity on bomb sprite
                if (this.sprite.body) {
                    this.sprite.setVelocity(homingVelocityX, homingVelocityY);
                }
                
                // Enhanced visual feedback when homing
                this.sprite.setStrokeStyle(3, 0xff6b35); // Orange outline when pursuing
                
                // Create pursuit trail effect
                this.createPursuitTrail(targetX, targetY);
            } else {
                // Stop moving if no valid target or target too close
                if (this.sprite.body) {
                    this.sprite.setVelocity(0, 0);
                }
                this.sprite.setStrokeStyle(2, 0x34495e); // Normal outline
            }
        } else {
            // No target found, stop moving
            if (this.sprite.body) {
                this.sprite.setVelocity(0, 0);
            }
            this.sprite.setStrokeStyle(2, 0x34495e); // Normal outline
        }
    }
    
    findNearestTarget() {
        if (!this.scene.players) return null;
        
        const alivePlayers = this.scene.players.filter(p => {
            if (!p || !p.isAlive || !p.sprite) return false;
            
            // Check owner immunity (first 2 seconds)
            if (p === this.owner && this.timeSinceCreation < this.ownerImmunityTime) {
                return false;
            }
            
            return true;
        });
        
        if (alivePlayers.length === 0) return null;
        
        // Find closest player within homing radius
        let nearestPlayer = null;
        let shortestDistance = this.homingRadius;
        
        alivePlayers.forEach(player => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                player.sprite.x, player.sprite.y
            );
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestPlayer = player;
            }
        });
        
        return nearestPlayer;
    }
    
    createPursuitTrail(targetX, targetY) {
        // Create a subtle trail showing the bomb's pursuit direction
        if (Math.random() < 0.3) { // Only create trail 30% of the time for performance
            const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, 'spark', {
                speed: { min: 10, max: 20 },
                scale: { start: 0.15, end: 0 },
                lifespan: 300,
                quantity: 2,
                tint: 0xff6b35,
                alpha: { start: 0.8, end: 0 }
            });
            
            // Clean up particles quickly
            this.scene.time.delayedCall(350, () => {
                if (particles) particles.destroy();
            });
        }
    }
    
    createProximityWarning() {
        // Visual warning when enemies are detected
        if (!this.proximityWarningActive) {
            this.proximityWarningActive = true;
            
            // Create warning ring around bomb
            const warningRing = this.scene.add.circle(this.sprite.x, this.sprite.y, this.proximityRadius, 0xff0000);
            warningRing.setAlpha(0.1);
            warningRing.setStrokeStyle(2, 0xff0000);
            
            // Pulsing warning effect
            this.scene.tweens.add({
                targets: warningRing,
                alpha: { from: 0.1, to: 0.3 },
                duration: 500,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                    warningRing.destroy();
                    this.proximityWarningActive = false;
                }
            });
        }
    }
    
    checkEnemyProximity() {
        if (!this.scene.players || this.exploded) return;
        
        const currentTime = Date.now();
        let currentEnemyCount = 0;
        const alivePlayers = this.scene.players.filter(p => {
            if (!p || !p.isAlive || !p.sprite) return false;
            
            // Include owner after immunity period
            if (p === this.owner && this.timeSinceCreation < this.ownerImmunityTime) {
                return false;
            }
            
            return true;
        });
        
        // Count enemies in proximity
        alivePlayers.forEach(player => {
            if (player && player.sprite) {
                const distance = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y,
                    player.sprite.x, player.sprite.y
                );
                
                if (distance < this.proximityRadius) {
                    currentEnemyCount++;
                }
            }
        });
        
        // Handle proximity state changes
        if (currentEnemyCount > 0) {
            if (!this.hasEnemiesNearby) {
                // First detection - start proximity timer
                this.hasEnemiesNearby = true;
                this.proximityStartTime = currentTime;
                this.lastProximityReduction = currentTime;
                this.triggerInitialProximityReduction();
                
                // Visual warning for proximity detection
                this.createProximityWarning();
            }
            
            // Update enemy count
            this.enemyCount = currentEnemyCount;
            
            // Escalating proximity detection based on sustained presence
            if (currentTime - this.lastProximityReduction >= this.proximityReductionInterval) {
                this.triggerSustainedProximityReduction();
                this.lastProximityReduction = currentTime;
            }
            
            // Multiple enemy bonus reduction
            if (currentEnemyCount > 1) {
                this.triggerMultipleEnemyReduction();
            }
            
        } else {
            // No enemies nearby - reset proximity state
            this.hasEnemiesNearby = false;
            this.enemyCount = 0;
            this.proximityStartTime = 0;
        }
    }
    
    triggerInitialProximityReduction() {
        // Initial proximity detection: -1 second
        this.reduceCountdown(1, 'Initial proximity detection');
    }
    
    triggerSustainedProximityReduction() {
        // Sustained presence: -0.5 seconds every 500ms
        this.reduceCountdown(0.5, 'Sustained enemy presence');
    }
    
    triggerMultipleEnemyReduction() {
        // Multiple enemies: -0.5 seconds per additional enemy (but only once per check)
        const bonusReduction = (this.enemyCount - 1) * 0.3; // 0.3s per additional enemy
        this.reduceCountdown(bonusReduction, `Multiple enemies (${this.enemyCount})`);
    }
    
    reduceCountdown(reductionSeconds, reason) {
        if (this.currentTimeLeft <= 0.5) return; // Don't reduce below 0.5 seconds
        
        const newTimeLeft = Math.max(0.5, this.currentTimeLeft - reductionSeconds);
        
        if (newTimeLeft < this.currentTimeLeft) {
            console.log(`Bomb countdown reduced by ${reductionSeconds}s (${reason}) - Now: ${newTimeLeft}s`);
            
            // Cancel existing explosion timer
            if (this.explosionTimer) {
                this.explosionTimer.destroy();
            }
            
            // Set new explosion timer
            this.explosionTimer = this.scene.time.delayedCall(newTimeLeft * 1000, () => {
                this.explode();
            });
            
            // Update current time left
            this.currentTimeLeft = newTimeLeft;
            
            // Enhanced visual feedback based on urgency
            if (this.fuseText) {
                this.fuseText.setText(Math.ceil(newTimeLeft).toString());
                
                // Color coding based on remaining time
                if (newTimeLeft <= 1) {
                    this.fuseText.setFill('#ff0000'); // Red - critical
                    this.sprite.setFillStyle(0xff0000);
                    
                    // Frantic pulsing for critical state
                    if (this.pulseTween) {
                        this.pulseTween.destroy();
                    }
                    this.pulseTween = this.scene.tweens.add({
                        targets: this.sprite,
                        scaleX: 1.4,
                        scaleY: 1.4,
                        duration: 150,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                } else if (newTimeLeft <= 2) {
                    this.fuseText.setFill('#ff6600'); // Orange - urgent
                    this.sprite.setFillStyle(0xe74c3c);
                }
            }
            
            // Screen shake for dramatic effect
            const shakeIntensity = Math.max(0.005, 0.02 - (newTimeLeft * 0.01));
            this.scene.cameras.main.shake(200, shakeIntensity);
        }
    }
    
    startCountdown() {
        this.countdownStarted = true;
        
        // Add random variation to fuse time (±0.5 seconds)
        const randomVariation = (Math.random() - 0.5) * 1000; // ±500ms
        this.fuseTime = Math.max(2000, this.baseFuseTime + randomVariation); // Minimum 2 seconds
        
        this.currentTimeLeft = Math.ceil(this.fuseTime / 1000);
        let displayTime = this.currentTimeLeft;
        
        const updateTimer = () => {
            if (this.exploded) return;
            
            // Update display time to match current time left (for proximity adjustments)
            displayTime = Math.min(displayTime, this.currentTimeLeft);
            this.fuseText.setText(displayTime.toString());
            
            // Change color as time runs out
            if (displayTime <= 1) {
                this.fuseText.setFill('#ff0000');
                this.sprite.setFillStyle(0xe74c3c);
            } else if (displayTime <= 2) {
                this.fuseText.setFill('#ff6b35');
                this.sprite.setFillStyle(0xd35400);
            }
            
            displayTime--;
            this.currentTimeLeft--;
            
            if (displayTime >= 0 && this.currentTimeLeft >= 0) {
                this.scene.time.delayedCall(1000, updateTimer);
            }
        };
        
        updateTimer();
        
        // Set up explosion timer (will be adjusted by proximity detection)
        this.explosionTimer = this.scene.time.delayedCall(this.fuseTime, () => {
            this.explode();
        });
    }
    
    explode() {
        if (this.exploded) return;
        this.exploded = true;
        
        // IMPORTANT: Stop the tween BEFORE accessing sprite properties
        if (this.pulseTween) {
            this.pulseTween.destroy();
            this.pulseTween = null;
        }
        
        const explosionX = this.sprite.x;
        const explosionY = this.sprite.y;
        
        // Create explosion effect
        this.createExplosionEffect(explosionX, explosionY);
        
        // Create cluster explosion pattern (3 phases)
        this.createClusterExplosion(explosionX, explosionY);
    }
    
    createClusterExplosion(centerX, centerY) {
        // Phase 1: Initial center explosion
        this.createExplosionPhase(centerX, centerY, 0, 1.0, [{ x: centerX, y: centerY }]);
        
        // Phase 2: Cross pattern explosion (300ms delay)
        this.scene.time.delayedCall(300, () => {
            if (this.exploded) {
                const crossExplosions = this.calculateCrossPattern(centerX, centerY);
                this.createExplosionPhase(centerX, centerY, 300, 0.8, crossExplosions);
            }
        });
        
        // Phase 3: Outer ring explosion (600ms delay)
        this.scene.time.delayedCall(600, () => {
            if (this.exploded) {
                const ringExplosions = this.calculateRingPattern(centerX, centerY);
                this.createExplosionPhase(centerX, centerY, 600, 0.6, ringExplosions);
            }
        });
    }
    
    calculateCrossPattern(centerX, centerY) {
        const directions = [
            { x: 1, y: 0 },   // Right
            { x: -1, y: 0 },  // Left
            { x: 0, y: 1 },   // Down
            { x: 0, y: -1 }   // Up
        ];
        
        const gridSize = 64;
        const explosionAreas = [];
        
        directions.forEach(dir => {
            for (let i = 1; i <= this.power; i++) {
                const checkX = centerX + (dir.x * gridSize * i);
                const checkY = centerY + (dir.y * gridSize * i);
                
                // Check bounds
                if (checkX < 50 || checkX > this.scene.game.config.width - 50 ||
                    checkY < 50 || checkY > this.scene.game.config.height - 50) {
                    break;
                }
                
                // Check for destructible blocks
                let blocked = false;
                const blocksToDestroy = [];
                
                // Filter out null/undefined blocks before iteration to prevent null reference errors
                if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
                    const validBlocks = this.scene.destructibleBlocks.filter(block => 
                        block && 
                        block.x !== undefined && 
                        block.y !== undefined && 
                        block.active !== false &&
                        !block.destroyed
                    );
                    
                    validBlocks.forEach(block => {
                        if (Math.abs(block.x - checkX) < 32 && Math.abs(block.y - checkY) < 32) {
                            blocksToDestroy.push(block);
                            blocked = true;
                        }
                    });
                }
                
                // Destroy blocks and spawn power-ups
                blocksToDestroy.forEach(block => {
                    block.destroy();
                    this.scene.destructibleBlocks = this.scene.destructibleBlocks.filter(b => b !== block);
                    
                    // Chance to spawn power-up or weapon
                    if (Math.random() < 0.3) {
                        const powerUpTypes = ['speed', 'bombs', 'power', 'health', 'shield', 'teleport'];
                        const weaponTypes = ['grenade', 'rocket', 'flamethrower', 'sword', 'sniper', 'shotgun', 'lightning'];
                        
                        const allTypes = Math.random() < 0.6 ? powerUpTypes : weaponTypes;
                        const powerUpType = allTypes[Math.floor(Math.random() * allTypes.length)];
                        const powerUp = new PowerUp(this.scene, checkX, checkY, powerUpType);
                        this.scene.powerUps.push(powerUp);
                    }
                });
                
                if (!blocked) {
                    explosionAreas.push({ x: checkX, y: checkY });
                } else {
                    break; // Stop in this direction if blocked
                }
            }
        });
        
        return explosionAreas;
    }
    
    calculateRingPattern(centerX, centerY) {
        // Create a ring of smaller explosions around the main area
        const ringExplosions = [];
        const ringRadius = 96; // Distance from center
        const angleStep = Math.PI / 4; // 8 directions
        
        for (let i = 0; i < 8; i++) {
            const angle = i * angleStep;
            const x = centerX + Math.cos(angle) * ringRadius;
            const y = centerY + Math.sin(angle) * ringRadius;
            
            // Check bounds
            if (x > 50 && x < this.scene.game.config.width - 50 &&
                y > 50 && y < this.scene.game.config.height - 50) {
                ringExplosions.push({ x, y });
            }
        }
        
        return ringExplosions;
    }
    
    createExplosionPhase(centerX, centerY, delay, scale, explosionAreas) {
        // Create explosion effects for this phase
        explosionAreas.forEach((area, index) => {
            // Small delay between each explosion in the phase for visual effect
            this.scene.time.delayedCall(index * 50, () => {
                this.createExplosionEffect(area.x, area.y, scale);
            });
        });
        
        // Handle player damage for this phase
        this.handleExplosionDamage(explosionAreas, scale);
        
        // Handle chain reactions for this phase
        this.handleChainReactions(explosionAreas);
    }
    
    handleExplosionDamage(explosionAreas, damageScale) {
        // Tiered damage system with falloff zones
        explosionAreas.forEach(area => {
            // Filter out null/undefined players before iteration
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player.isAlive && 
                player.sprite && 
                player.sprite.active
            );
            
            validPlayers.forEach(player => {
                
                const distance = Phaser.Math.Distance.Between(
                    player.sprite.x, player.sprite.y,
                    area.x, area.y
                );
                
                let damage = 0;
                let zoneHit = '';
                
                // Balanced damage zones - reduced outer range
                if (distance < 40) {
                    // Inner Zone - Lethal (close range)
                    damage = Math.floor(100 * damageScale);
                    zoneHit = 'inner';
                } else if (distance < 80) {
                    // Middle Zone - Significant damage
                    damage = Math.floor(60 * damageScale);
                    zoneHit = 'middle';
                } else if (distance < 120) {
                    // Outer Zone - Light damage (escapable range)
                    damage = Math.floor(25 * damageScale);
                    zoneHit = 'outer';
                }
                
                if (damage > 0) {
                    player.takeDamage(damage);
                    
                    // Visual feedback for different damage zones
                    this.createDamageZoneEffect(player, zoneHit, area);
                }
            });
        });
    }
    
    createDamageZoneEffect(player, zone, explosionArea) {
        if (!player.sprite) return;
        
        // Different visual effects based on damage zone
        let effectColor, effectIntensity, effectDuration;
        
        switch(zone) {
            case 'inner':
                effectColor = 0xff0000; // Red - critical damage
                effectIntensity = 0.015;
                effectDuration = 400;
                break;
            case 'middle':
                effectColor = 0xff6600; // Orange - moderate damage
                effectIntensity = 0.010;
                effectDuration = 300;
                break;
            case 'outer':
                effectColor = 0xffaa00; // Yellow - light damage
                effectIntensity = 0.005;
                effectDuration = 200;
                break;
        }
        
        // Screen flash effect
        this.scene.cameras.main.flash(effectDuration, 
            (effectColor >> 16) & 0xFF, 
            (effectColor >> 8) & 0xFF, 
            effectColor & 0xFF, 
            false, null, 0.3);
        
        // Directional knockback effect based on explosion center
        if (player.sprite.body) {
            const angle = Phaser.Math.Angle.Between(
                explosionArea.x, explosionArea.y,
                player.sprite.x, player.sprite.y
            );
            
            const knockbackForce = zone === 'inner' ? 40 : zone === 'middle' ? 25 : 15;
            const knockbackX = Math.cos(angle) * knockbackForce;
            const knockbackY = Math.sin(angle) * knockbackForce;
            
            player.sprite.setVelocity(
                player.sprite.body.velocity.x + knockbackX,
                player.sprite.body.velocity.y + knockbackY
            );
        }
    }
    
    handleChainReactions(explosionAreas) {
        // Chain reaction with other bombs (with protection against infinite loops)  
        explosionAreas.forEach(area => {
            if (this.scene.bombs && Array.isArray(this.scene.bombs)) {
                // Filter out null/undefined bombs before iteration
                const validBombs = this.scene.bombs.filter(bomb => 
                    bomb && 
                    bomb.sprite && 
                    bomb.sprite.active &&
                    !bomb.exploded
                );
                
                validBombs.forEach(otherBomb => {
                    if (otherBomb === this || otherBomb.exploded || !otherBomb.sprite) return;
                    
                    const distance = Phaser.Math.Distance.Between(
                        otherBomb.sprite.x, otherBomb.sprite.y,
                        area.x, area.y
                    );
                    
                    if (distance < 40) {
                        // Add small delay to prevent infinite recursion
                        this.scene.time.delayedCall(50, () => {
                            if (otherBomb && !otherBomb.exploded) {
                                otherBomb.explode();
                            }
                        });
                    }
                });
            }
        });
        
        // Clean up and notify owner (only do this once in the main explosion)
        if (!this.cleanedUp) {
            this.cleanedUp = true;
            
            // Remove bomb from scene
            this.destroy();
            
            // Notify owner
            if (this.owner) {
                this.owner.onBombExploded();
            }
            
            // Remove from bombs array
            const index = this.scene.bombs.indexOf(this);
            if (index > -1) {
                this.scene.bombs.splice(index, 1);
            }
        }
    }
    
    createExplosionEffect(x, y, scale = 1) {
        // Create explosion circle
        const explosion = this.scene.add.circle(x, y, 30 * scale, 0xff6b35);
        explosion.setAlpha(0.8);
        
        // Create damage zone visual indicators
        this.createDamageZoneIndicators(x, y, scale);
        
        // Explosion animation
        this.scene.tweens.add({
            targets: explosion,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Particle effect
        const particles = this.scene.add.particles(x, y, 'spark', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.3, end: 0 },
            lifespan: 300,
            quantity: 10
        });
        
        // Spark texture is created in preload now
        
        // Remove particles after animation
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
        
        // Screen shake
        this.scene.cameras.main.shake(200, 0.01);
        
        // Trigger explosion zoom effect
        if (window.cameraZoomManager) {
            cameraZoomManager.triggerExplosionZoom(scale);
        }
        
        // Play explosion sound (if you add audio later)
        // this.scene.sound.play('explosion');
    }
    
    createDamageZoneIndicators(x, y, scale = 1) {
        // Visual indicators for damage zones
        const zones = [
            { radius: 40 * scale, color: 0xff0000, alpha: 0.3, strokeColor: 0xff0000, strokeAlpha: 0.8 }, // Inner - Red (lethal)
            { radius: 80 * scale, color: 0xff6600, alpha: 0.2, strokeColor: 0xff6600, strokeAlpha: 0.6 }, // Middle - Orange (significant)
            { radius: 120 * scale, color: 0xffaa00, alpha: 0.1, strokeColor: 0xffaa00, strokeAlpha: 0.4 }  // Outer - Yellow (light)
        ];
        
        zones.forEach((zone, index) => {
            // Create zone circle with fill and stroke
            const zoneCircle = this.scene.add.circle(x, y, zone.radius);
            zoneCircle.setFillStyle(zone.color, zone.alpha);
            zoneCircle.setStrokeStyle(3, zone.strokeColor, zone.strokeAlpha);
            
            // Animate zone indicators
            this.scene.tweens.add({
                targets: zoneCircle,
                alpha: 0,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 800 + (index * 200), // Stagger animation
                ease: 'Power2.easeOut',
                onComplete: () => {
                    zoneCircle.destroy();
                }
            });
        });
    }
    
    destroy() {
        // Kill any running tweens and timers
        if (this.pulseTween) {
            this.pulseTween.destroy();
            this.pulseTween = null;
        }
        if (this.trajectoryTween) {
            this.trajectoryTween.destroy();
            this.trajectoryTween = null;
        }
        if (this.arcTween) {
            this.arcTween.destroy();
            this.arcTween = null;
        }
        if (this.explosionTimer) {
            this.explosionTimer.destroy();
            this.explosionTimer = null;
        }
        
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.fuseText && this.fuseText.active) {
            this.fuseText.destroy();
            this.fuseText = null;
        }
    }
}