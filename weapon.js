class Weapon {
    constructor(scene, type, owner) {
        this.scene = scene;
        this.type = type;
        this.owner = owner;
        this.ammo = this.getMaxAmmo();
        this.cooldown = 0;
        this.lastFired = 0;
        
        this.config = this.getWeaponConfig();
    }
    
    getWeaponConfig() {
        const configs = {
            grenade: {
                name: 'Grenade',
                damage: 75,
                cooldownTime: 1500,
                maxAmmo: 3,
                range: 120,
                symbol: 'G',
                color: 0x8b4513
            },
            rocket: {
                name: 'Rocket Launcher',
                damage: 90,
                cooldownTime: 2000,
                maxAmmo: 2,
                range: 200,
                symbol: 'R',
                color: 0xff4500
            },
            flamethrower: {
                name: 'Flame Thrower',
                damage: 15,
                cooldownTime: 100,
                maxAmmo: 50,
                range: 80,
                symbol: 'F',
                color: 0xff6600
            },
            sword: {
                name: 'Sword',
                damage: 60,
                cooldownTime: 800,
                maxAmmo: -1,
                range: 50,
                symbol: 'S',
                color: 0xc0c0c0
            },
            sniper: {
                name: 'Sniper Rifle',
                damage: 120,
                cooldownTime: 3000,
                maxAmmo: 5,
                range: 350,
                symbol: 'N',
                color: 0x2c3e50
            },
            shotgun: {
                name: 'Shotgun',
                damage: 80,
                cooldownTime: 1200,
                maxAmmo: 8,
                range: 100,
                symbol: 'H',
                color: 0x8b4513
            },
            lightning: {
                name: 'Lightning Gun',
                damage: 95,
                cooldownTime: 1800,
                maxAmmo: 6,
                range: 250,
                symbol: 'L',
                color: 0x9b59b6
            }
        };
        
        return configs[this.type] || configs.grenade;
    }
    
    getMaxAmmo() {
        return this.getWeaponConfig().maxAmmo;
    }
    
    canFire() {
        const now = Date.now();
        return (this.ammo > 0 || this.ammo === -1) && (now - this.lastFired >= this.config.cooldownTime);
    }
    
    fire(targetX, targetY) {
        if (!this.canFire()) return false;
        
        this.lastFired = Date.now();
        
        if (this.ammo > 0) {
            this.ammo--;
        }
        
        // Add firing animation feedback
        this.playFiringAnimation();
        
        // Trigger combat zoom when weapon is fired
        if (window.cameraZoomManager) {
            cameraZoomManager.setCombatMode(true);
            // Reset combat mode after 2 seconds
            setTimeout(() => {
                if (window.cameraZoomManager) {
                    cameraZoomManager.setCombatMode(false);
                }
            }, 2000);
        }
        
        switch (this.type) {
            case 'grenade':
                return this.fireGrenade(targetX, targetY);
            case 'rocket':
                return this.fireRocket(targetX, targetY);
            case 'flamethrower':
                return this.fireFlamethrower(targetX, targetY);
            case 'sword':
                return this.swingSword(targetX, targetY);
            case 'sniper':
                return this.fireSniper(targetX, targetY);
            case 'shotgun':
                return this.fireShotgun(targetX, targetY);
            case 'lightning':
                return this.fireLightning(targetX, targetY);
            default:
                return false;
        }
    }
    
    fireGrenade(targetX, targetY) {
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        const grenade = new Grenade(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(grenade);
        return true;
    }
    
    fireRocket(targetX, targetY) {
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        const rocket = new Rocket(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(rocket);
        return true;
    }
    
    fireFlamethrower(targetX, targetY) {
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        const flame = new FlameStream(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.flames = this.scene.flames || [];
        this.scene.flames.push(flame);
        return true;
    }
    
    swingSword(targetX, targetY) {
        const sword = new SwordSlash(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.meleeAttacks = this.scene.meleeAttacks || [];
        this.scene.meleeAttacks.push(sword);
        return true;
    }
    
    fireSniper(targetX, targetY) {
        const sniper = new SniperBullet(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(sniper);
        return true;
    }
    
    fireShotgun(targetX, targetY) {
        // Store target coordinates for animation
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        
        const shotgun = new ShotgunBlast(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(shotgun);
        return true;
    }
    
    fireLightning(targetX, targetY) {
        const lightning = new LightningBolt(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(lightning);
        return true;
    }
    
    reload() {
        this.ammo = this.getMaxAmmo();
    }
    
    playFiringAnimation() {
        // Player recoil animation
        if (this.owner && this.owner.sprite && this.scene.tweens) {
            // Get weapon-specific animation values
            const animConfig = this.getFiringAnimationConfig();
            
            // Player recoil/kickback
            this.scene.tweens.add({
                targets: this.owner.sprite,
                scaleX: animConfig.recoilScale,
                scaleY: animConfig.recoilScale,
                duration: animConfig.recoilDuration,
                yoyo: true,
                ease: 'Back.easeOut'
            });
            
            // Weapon symbol animation
            if (this.owner.weaponSymbol) {
                this.scene.tweens.add({
                    targets: this.owner.weaponSymbol,
                    scaleX: animConfig.symbolScale,
                    scaleY: animConfig.symbolScale,
                    duration: animConfig.symbolDuration,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });
                
                // Flash effect
                this.scene.tweens.add({
                    targets: this.owner.weaponSymbol,
                    alpha: 0.3,
                    duration: animConfig.flashDuration,
                    yoyo: true,
                    ease: 'Power2'
                });
            }
            
            // Weapon sprite animation (especially for shotgun)
            this.playWeaponSpriteAnimation();
            
            // Screen shake based on weapon power
            if (this.scene.cameras && this.scene.cameras.main) {
                this.scene.cameras.main.shake(animConfig.shakeDuration, animConfig.shakeIntensity);
            }
        }
    }
    
    playWeaponSpriteAnimation() {
        if (this.type === 'shotgun') {
            this.showShotgunAnimation();
        }
        // Add other weapon sprite animations here
    }
    
    showShotgunAnimation() {
        if (!this.owner || !this.owner.sprite) return;
        
        // Calculate weapon position relative to player
        const playerX = this.owner.sprite.x;
        const playerY = this.owner.sprite.y;
        
        // Create shotgun sprite at player position
        const shotgunSprite = this.scene.add.sprite(playerX + 15, playerY - 5, 'shotgun_idle');
        shotgunSprite.setOrigin(0.5, 0.5);
        shotgunSprite.setScale(0.8);
        
        // Determine firing direction based on last input or target
        let angle = 0;
        if (this.lastTargetX !== undefined && this.lastTargetY !== undefined) {
            angle = Phaser.Math.Angle.Between(playerX, playerY, this.lastTargetX, this.lastTargetY);
        }
        shotgunSprite.setRotation(angle);
        
        // Animation sequence: idle -> fire -> idle
        this.scene.tweens.add({
            targets: shotgunSprite,
            duration: 50,
            onComplete: () => {
                // Switch to firing sprite with muzzle flash
                shotgunSprite.setTexture('shotgun_fire');
                
                this.scene.tweens.add({
                    targets: shotgunSprite,
                    duration: 100,
                    onComplete: () => {
                        // Switch back to idle
                        shotgunSprite.setTexture('shotgun_idle');
                        
                        // Fade out weapon sprite
                        this.scene.tweens.add({
                            targets: shotgunSprite,
                            alpha: 0,
                            duration: 200,
                            onComplete: () => {
                                shotgunSprite.destroy();
                            }
                        });
                    }
                });
            }
        });
        
        // Add recoil movement to weapon sprite
        this.scene.tweens.add({
            targets: shotgunSprite,
            x: playerX + 10, // Move back slightly
            duration: 80,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
    
    getFiringAnimationConfig() {
        const configs = {
            shotgun: {
                recoilScale: 0.85,
                recoilDuration: 150,
                symbolScale: 1.4,
                symbolDuration: 200,
                flashDuration: 80,
                shakeDuration: 120,
                shakeIntensity: 0.008
            },
            rocket: {
                recoilScale: 0.8,
                recoilDuration: 200,
                symbolScale: 1.5,
                symbolDuration: 250,
                flashDuration: 100,
                shakeDuration: 150,
                shakeIntensity: 0.012
            },
            flamethrower: {
                recoilScale: 0.9,
                recoilDuration: 100,
                symbolScale: 1.2,
                symbolDuration: 150,
                flashDuration: 60,
                shakeDuration: 80,
                shakeIntensity: 0.004
            },
            sniper: {
                recoilScale: 0.75,
                recoilDuration: 300,
                symbolScale: 1.6,
                symbolDuration: 300,
                flashDuration: 120,
                shakeDuration: 200,
                shakeIntensity: 0.015
            },
            lightning: {
                recoilScale: 0.88,
                recoilDuration: 120,
                symbolScale: 1.3,
                symbolDuration: 180,
                flashDuration: 90,
                shakeDuration: 100,
                shakeIntensity: 0.006
            },
            grenade: {
                recoilScale: 0.92,
                recoilDuration: 180,
                symbolScale: 1.25,
                symbolDuration: 200,
                flashDuration: 70,
                shakeDuration: 110,
                shakeIntensity: 0.005
            },
            sword: {
                recoilScale: 0.95,
                recoilDuration: 100,
                symbolScale: 1.15,
                symbolDuration: 120,
                flashDuration: 50,
                shakeDuration: 60,
                shakeIntensity: 0.002
            }
        };
        
        return configs[this.type] || configs.grenade;
    }
    
    update(delta) {
        if (this.cooldown > 0) {
            this.cooldown -= delta;
        }
    }
}

class Projectile {
    constructor(scene, x, y, targetX, targetY, owner, config) {
        this.scene = scene;
        this.owner = owner;
        this.config = config;
        this.active = true;
        this.speed = config.speed || 200;
        this.damage = config.damage || 50;
        this.blockPenetration = config.blockPenetration || 0; // How many blocks this weapon can destroy
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        
        this.sprite = scene.add.circle(x, y, config.size || 8, config.color || 0xff0000);
        scene.matter.add.gameObject(this.sprite, {
            shape: 'circle',
            isSensor: true,
            density: 0.001
        });
        
        this.sprite.setVelocity(this.velocityX, this.velocityY);
        this.sprite.projectile = this;
        
        this.travelDistance = 0;
        this.maxRange = config.range || 300;
    }
    
    update(delta) {
        if (!this.active || !this.sprite || !this.sprite.active) return;
        
        this.travelDistance += this.speed * (delta / 1000);
        
        if (this.travelDistance >= this.maxRange) {
            this.explode();
            return;
        }
        
        // For penetrating weapons, use sequential collision detection
        if (this.blockPenetration !== undefined && this.blockPenetration >= 0) {
            console.log(`${this.constructor.name}: Using sequential collision detection (penetration: ${this.blockPenetration})`);
            this.checkSequentialCollisions();
        } else {
            console.log(`${this.constructor.name}: Using simple collision detection (no penetration)`);
            // Non-penetrating weapons use simple collision detection
            this.checkWallCollisions();
            this.checkPlayerCollisions();
        }
    }
    
    checkCollisions() {
        // Legacy method - now split into separate methods for better control
        this.checkWallCollisions();
        this.checkPlayerCollisions();
    }
    
    checkSequentialCollisions() {
        // For penetrating weapons: check what's closest in the projectile's path
        // First check boundary walls
        if (!this.sprite || !this.active || !this.sprite.active || this.sprite.destroyed) {
            return;
        }
        
        const bounds = this.scene.game.config;
        const margin = 20;
        
        if (this.sprite.x < margin || this.sprite.x > bounds.width - margin ||
            this.sprite.y < margin || this.sprite.y > bounds.height - margin) {
            console.log(`${this.constructor.name}: Hit boundary wall, exploding`);
            this.explode();
            return;
        }
        
        // Find the closest collision target (block or player)
        const closestCollision = this.findClosestCollision();
        
        console.log(`${this.constructor.name}: Closest collision:`, closestCollision);
        
        if (closestCollision) {
            if (closestCollision.type === 'block') {
                // Hit a block first - destroy it if we have penetration
                if (this.blockPenetration > 0) {
                    this.destroyBlock(closestCollision.target);
                    this.blockPenetration--;
                    console.log(`${this.constructor.name} destroyed block, ${this.blockPenetration} penetration remaining`);
                    
                    // Only explode if no penetration left
                    if (this.blockPenetration <= 0) {
                        this.explode();
                    }
                } else {
                    // No penetration left - explode on contact
                    this.explode();
                }
            } else if (closestCollision.type === 'player') {
                // Hit a player - damage them
                console.log(`${this.constructor.name} hit ${closestCollision.target.playerId} at distance ${closestCollision.distance} (sequential check)`);
                this.hitTarget(closestCollision.target);
            }
        }
    }
    
    checkPlayerCollisions() {
        if (!this.scene.players || !this.sprite) {
            console.log(`${this.constructor.name}: No players or sprite for collision check`);
            return;
        }
        
        // Filter out null/undefined players before iteration
        const validPlayers = this.scene.players.filter(player => 
            player && 
            player.isAlive && 
            player !== this.owner && 
            player.sprite && 
            player.sprite.active
        );
        
        console.log(`${this.constructor.name}: Checking collisions with ${validPlayers.length} valid players`);
        
        validPlayers.forEach(player => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                player.sprite.x, player.sprite.y
            );
            
            // Increased collision radius from 25 to 35 for better hit detection
            if (distance < 35) {
                // For penetrating weapons, check if there's a clear line of sight
                if (this.blockPenetration !== undefined && this.blockPenetration >= 0) {
                    if (this.hasLineOfSight(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y)) {
                        console.log(`${this.constructor.name} hit ${player.playerId} at distance ${distance} (clear line of sight)`);
                        this.hitTarget(player);
                    } else {
                        console.log(`${this.constructor.name} blocked by obstacles, cannot hit ${player.playerId}`);
                    }
                } else {
                    // Non-penetrating weapons use simple collision detection
                    console.log(`${this.constructor.name} hit ${player.playerId} at distance ${distance}`);
                    this.hitTarget(player);
                }
            }
        });
    }
    
    checkWallCollisions() {
        if (!this.sprite || !this.active || !this.sprite.active || this.sprite.destroyed) {
            console.log(`${this.constructor.name}: No sprite or inactive for wall collision check`);
            return;
        }
        
        const bounds = this.scene.game.config;
        const margin = 20;
        
        if (this.sprite.x < margin || this.sprite.x > bounds.width - margin ||
            this.sprite.y < margin || this.sprite.y > bounds.height - margin) {
            console.log(`${this.constructor.name}: Hit boundary wall, exploding`);
            this.explode();
        }
        
        if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
            // Filter out null/undefined blocks before iteration to prevent null reference errors
            const validBlocks = this.scene.destructibleBlocks.filter(block => 
                block && 
                block.x !== undefined && 
                block.y !== undefined && 
                block.active !== false &&
                !block.destroyed
            );
            
            console.log(`${this.constructor.name}: Checking block collisions with ${validBlocks.length} valid blocks`);
            
            validBlocks.forEach(block => {
                // Enhanced safety check with more detailed validation
                if (!block || !this.sprite) return;
                if (typeof block.x !== 'number' || typeof block.y !== 'number') {
                    console.warn('Block has invalid coordinates, skipping:', block);
                    return;
                }
                if (!block.active || block.destroyed) return;
                
                const distance = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y, block.x, block.y
                );
                
                if (distance < 35) {
                    if (this.blockPenetration > 0) {
                        // Weapon can destroy blocks - destroy the block and continue
                        this.destroyBlock(block);
                        this.blockPenetration--; // Reduce penetration capacity
                        console.log(`${this.constructor.name} destroyed block, ${this.blockPenetration} penetration remaining`);
                        
                        // For penetrating weapons, don't explode immediately - continue checking for targets
                        // The weapon will only explode when it hits a target with no penetration left
                        // or when it reaches max range
                    } else {
                        // Weapon cannot destroy blocks - explode on contact
                        this.explode();
                    }
                }
            });
        }
    }
    
    hitTarget(target) {
        target.takeDamage(this.damage);
        
        // For penetrating weapons, reduce penetration but don't explode unless no penetration left
        if (this.blockPenetration > 0) {
            this.blockPenetration--; // Reduce penetration when hitting a target
            console.log(`${this.constructor.name} hit target, ${this.blockPenetration} penetration remaining`);
            
            // Only explode if no penetration left
            if (this.blockPenetration <= 0) {
                this.explode();
            }
        } else {
            // Non-penetrating weapons explode immediately on hit
            this.explode();
        }
    }
    
    explode() {
        if (!this.active) return;
        this.active = false;
        
        this.createExplosionEffect();
        this.destroy();
    }
    
    createExplosionEffect() {
        const explosion = this.scene.add.circle(this.sprite.x, this.sprite.y, 20, 0xff6b35);
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
        
        const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, 'spark', {
            speed: { min: 30, max: 100 },
            scale: { start: 0.2, end: 0 },
            lifespan: 200,
            quantity: 8
        });
        
        this.scene.time.delayedCall(300, () => particles.destroy());
    }
    
    destroyBlock(block) {
        // Safety check for block properties
        if (!block || typeof block.x === 'undefined' || typeof block.y === 'undefined') {
            console.warn('Block has invalid position properties:', block);
            return;
        }
        
        const blockX = block.x;
        const blockY = block.y;
        
        // Create block destruction effect
        const particles = this.scene.add.particles(blockX, blockY, 'spark', {
            speed: { min: 20, max: 60 },
            scale: { start: 0.2, end: 0 },
            lifespan: 300,
            quantity: 8,
            tint: [0xbdc3c7, 0x95a5a6, 0x7f8c8d]
        });
        
        // Remove particles after animation
        this.scene.time.delayedCall(400, () => {
            if (particles) particles.destroy();
        });
        
        // Remove block from game
        if (block.destroy && typeof block.destroy === 'function') {
            block.destroy();
        }
        
        // Remove from destructible blocks array
        const index = this.scene.destructibleBlocks.indexOf(block);
        if (index > -1) {
            this.scene.destructibleBlocks.splice(index, 1);
        }
        
        // Chance to spawn power-up where block was destroyed
        if (Math.random() < 0.25) {
            const powerUpTypes = ['speed', 'bombs', 'power', 'health', 'shield', 'teleport'];
            const weaponTypes = ['grenade', 'rocket', 'flamethrower', 'sword', 'sniper', 'shotgun', 'lightning'];
            
            const allTypes = Math.random() < 0.7 ? powerUpTypes : weaponTypes;
            const powerUpType = allTypes[Math.floor(Math.random() * allTypes.length)];
            const powerUp = new PowerUp(this.scene, blockX, blockY, powerUpType);
            this.scene.powerUps.push(powerUp);
        }
        
        console.log(`Block destroyed at (${blockX}, ${blockY})`);
    }
    
    findClosestCollision() {
        // Find the closest collision target (block or player) within collision range
        let closestTarget = null;
        let closestDistance = Infinity;
        let closestType = null;
        
        console.log(`${this.constructor.name}: Finding closest collision at (${this.sprite.x}, ${this.sprite.y})`);
        
        // Check blocks
        if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
            const validBlocks = this.scene.destructibleBlocks.filter(block => 
                block && 
                block.x !== undefined && 
                block.y !== undefined && 
                block.active !== false &&
                !block.destroyed
            );
            
            validBlocks.forEach(block => {
                const distance = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y, block.x, block.y
                );
                
                if (distance < 50 && distance < closestDistance) { // Increased collision radius for blocks
                    closestDistance = distance;
                    closestTarget = block;
                    closestType = 'block';
                    console.log(`${this.constructor.name}: Found block collision at distance ${distance}`);
                }
            });
        }
        
        // Check players
        if (this.scene.players && Array.isArray(this.scene.players)) {
            console.log(`${this.constructor.name}: Total players in scene: ${this.scene.players.length}`);
            
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player.isAlive && 
                player !== this.owner && 
                player.sprite && 
                player.sprite.active
            );
            
            console.log(`${this.constructor.name}: Valid target players: ${validPlayers.length}`);
            
            validPlayers.forEach((player, index) => {
                const distance = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y,
                    player.sprite.x, player.sprite.y
                );
                
                console.log(`${this.constructor.name}: Player ${player.playerId} at (${player.sprite.x}, ${player.sprite.y}), distance: ${distance}`);
                
                if (distance < 60 && distance < closestDistance) { // Further increased collision radius for players
                    closestDistance = distance;
                    closestTarget = player;
                    closestType = 'player';
                    console.log(`${this.constructor.name}: Found player collision at distance ${distance}`);
                }
            });
        } else {
            console.log(`${this.constructor.name}: No players array or empty players array`);
        }
        
        if (closestTarget) {
            console.log(`${this.constructor.name}: Returning closest ${closestType} at distance ${closestDistance}`);
            return {
                target: closestTarget,
                distance: closestDistance,
                type: closestType
            };
        }
        
        console.log(`${this.constructor.name}: No collision targets found`);
        return null;
    }
    
    hasLineOfSight(startX, startY, targetX, targetY) {
        // Check if there are any blocks between the projectile and target
        if (!this.scene.destructibleBlocks || !Array.isArray(this.scene.destructibleBlocks)) {
            return true; // No blocks to check
        }
        
        const validBlocks = this.scene.destructibleBlocks.filter(block => 
            block && 
            block.x !== undefined && 
            block.y !== undefined && 
            block.active !== false &&
            !block.destroyed
        );
        
        // Create a line from projectile to target
        const line = new Phaser.Geom.Line(startX, startY, targetX, targetY);
        
        // Check if any blocks intersect with this line
        for (let block of validBlocks) {
            // Create a rectangle for the block (assuming 48x48 size like in game.js)
            const blockRect = new Phaser.Geom.Rectangle(block.x - 24, block.y - 24, 48, 48);
            
            // Check if the line intersects with the block rectangle
            if (Phaser.Geom.Intersects.LineToRectangle(line, blockRect)) {
                console.log(`Line of sight blocked by block at (${block.x}, ${block.y})`);
                return false; // Line of sight is blocked
            }
        }
        
        return true; // Clear line of sight
    }
    
    destroy() {
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
            this.sprite = null;
        }
        
        const index = this.scene.projectiles?.indexOf(this);
        if (index > -1) {
            this.scene.projectiles.splice(index, 1);
        }
    }
}

class Grenade extends Projectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 150,
            damage: 75,
            size: 10,
            color: 0x8b4513,
            range: 200,
            blockPenetration: 1 // Grenade can destroy 1 block
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        
        this.fuseTime = 2500;
        this.cookTime = 0;
        this.maxCookTime = 2000;
        this.bounces = 0;
        this.maxBounces = 2;
        
        this.sprite.setStrokeStyle(2, 0x654321);
        
        this.fuseText = scene.add.text(x, y - 20, '3', {
            fontSize: '14px',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        this.startFuse();
    }
    
    startFuse() {
        let timeLeft = Math.ceil(this.fuseTime / 1000);
        
        const updateTimer = () => {
            if (!this.active) return;
            
            this.fuseText.setText(timeLeft.toString());
            this.fuseText.setPosition(this.sprite.x, this.sprite.y - 20);
            
            if (timeLeft <= 1) {
                this.fuseText.setFill('#ff0000');
            } else if (timeLeft <= 2) {
                this.fuseText.setFill('#ff6600');
            }
            
            timeLeft--;
            
            if (timeLeft >= 0 && this.active) {
                this.scene.time.delayedCall(1000, updateTimer);
            }
        };
        
        updateTimer();
        
        this.scene.time.delayedCall(this.fuseTime, () => {
            if (this.active) {
                this.explode();
            }
        });
    }
    
    checkWallCollisions() {
        const bounds = this.scene.game.config;
        const margin = 20;
        
        if (this.sprite.x < margin || this.sprite.x > bounds.width - margin ||
            this.sprite.y < margin || this.sprite.y > bounds.height - margin) {
            
            if (this.bounces < this.maxBounces) {
                this.bounce();
            } else {
                this.explode();
            }
        }
        
        super.checkWallCollisions();
    }
    
    bounce() {
        this.bounces++;
        
        const bounds = this.scene.game.config;
        const margin = 20;
        
        if (this.sprite.x < margin || this.sprite.x > bounds.width - margin) {
            this.velocityX *= -0.6;
        }
        if (this.sprite.y < margin || this.sprite.y > bounds.height - margin) {
            this.velocityY *= -0.6;
        }
        
        this.sprite.setVelocity(this.velocityX, this.velocityY);
        this.speed *= 0.6;
    }
    
    explode() {
        // Safety check for this.sprite before calling super.explode()
        if (!this.sprite || !this.sprite.active) return;
        
        const explosionX = this.sprite.x;
        const explosionY = this.sprite.y;
        
        super.explode();
        
        const explosionRadius = 60;
        // Filter out null/undefined players before iteration
        if (this.scene.players && Array.isArray(this.scene.players)) {
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player.isAlive && 
                player.sprite && 
                player.sprite.active &&
                player.sprite.x !== undefined &&
                player.sprite.y !== undefined
            );
            
            validPlayers.forEach(player => {
                // Additional safety check within the loop
                if (!player || !player.sprite) return;
                
                const distance = Phaser.Math.Distance.Between(
                    explosionX, explosionY,
                    player.sprite.x, player.sprite.y
                );
                
                if (distance < explosionRadius) {
                    const damage = Math.max(25, this.damage - (distance / 2));
                    player.takeDamage(damage);
                }
            });
        }
    }
    
    destroy() {
        if (this.fuseText && this.fuseText.active) {
            this.fuseText.destroy();
        }
        super.destroy();
    }
}

class Rocket extends Projectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 120, // Further reduced speed for better visibility and collision detection
            damage: 90,
            size: 18, // Even larger size for better visibility
            color: 0xff4500,
            range: 400,
            blockPenetration: 3 // Rocket launcher can destroy multiple blocks
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        
        // Make rocket more visible
        this.sprite.setStrokeStyle(3, 0xffffff);
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.sprite.setRotation(angle);
        
        // Enhanced trail particles for better visibility
        this.trailParticles = scene.add.particles(x, y, 'spark', {
            speed: { min: 40, max: 80 },
            scale: { start: 0.3, end: 0 },
            lifespan: 300,
            quantity: 5,
            tint: [0xff4500, 0xffaa00, 0xff6600]
        });
        
        this.trailParticles.startFollow(this.sprite);
        
        console.log(`Rocket created at (${x}, ${y}) heading to (${targetX}, ${targetY}): speed=${this.speed}, damage=${this.damage}`);
    }
    
    explode() {
        // Safety check for this.sprite before calling super.explode()
        if (!this.sprite || !this.sprite.active) return;
        
        const explosionX = this.sprite.x;
        const explosionY = this.sprite.y;
        
        console.log(`Rocket exploding at (${explosionX}, ${explosionY})`);
        
        super.explode();
        
        const explosionRadius = 80;
        // Filter out null/undefined players before iteration
        if (this.scene.players && Array.isArray(this.scene.players)) {
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player.isAlive && 
                player.sprite && 
                player.sprite.active &&
                player.sprite.x !== undefined &&
                player.sprite.y !== undefined
            );
            
            console.log(`Checking ${validPlayers.length} players for rocket explosion damage`);
            
            validPlayers.forEach(player => {
                // Additional safety check within the loop
                if (!player || !player.sprite) return;
                
                const distance = Phaser.Math.Distance.Between(
                    explosionX, explosionY,
                    player.sprite.x, player.sprite.y
                );
                
                console.log(`Player ${player.playerId} at distance ${distance} from rocket explosion`);
                
                if (distance < explosionRadius) {
                    const damage = Math.max(30, this.damage - distance);
                    console.log(`Applying ${damage} damage to player ${player.playerId}`);
                    player.takeDamage(damage);
                    
                    const knockbackForce = Math.max(5, 15 - distance / 10);
                    const angle = Math.atan2(
                        player.sprite.y - explosionY,
                        player.sprite.x - explosionX
                    );
                    
                    if (player.sprite && player.sprite.setVelocity) {
                        player.sprite.setVelocity(
                            Math.cos(angle) * knockbackForce,
                            Math.sin(angle) * knockbackForce
                        );
                    }
                }
            });
        }
        
        this.scene.cameras.main.shake(300, 0.02);
    }
    
    destroy() {
        if (this.trailParticles) {
            this.trailParticles.destroy();
        }
        super.destroy();
    }
}

class FlameStream {
    constructor(scene, x, y, targetX, targetY, owner) {
        this.scene = scene;
        this.owner = owner;
        this.startX = x;
        this.startY = y;
        this.active = true;
        this.duration = 1000;
        this.damage = 15;
        this.range = 80;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.endX = x + Math.cos(angle) * this.range;
        this.endY = y + Math.sin(angle) * this.range;
        
        this.createFlameEffect();
        
        // Create flame execution progress indicator
        this.createExecutionIndicator();
        
        this.scene.time.delayedCall(this.duration, () => {
            this.destroy();
        });
        
        this.damageTimer = 0;
        this.damageInterval = 200;
        
        // Track execution time for progress indicator
        this.startTime = Date.now();
    }
    
    createFlameEffect() {
        this.flameParticles = this.scene.add.particles(this.startX, this.startY, 'spark', {
            speed: { min: 30, max: 60 },
            scale: { start: 0.3, end: 0 },
            lifespan: 300,
            quantity: 3,
            tint: [0xff0000, 0xff6600, 0xffaa00],
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Line(this.startX, this.startY, this.endX, this.endY),
                quantity: 10
            }
        });
    }
    
    update(delta) {
        if (!this.active) return;
        
        this.damageTimer += delta;
        
        if (this.damageTimer >= this.damageInterval) {
            this.checkCollisions();
            this.damageTimer = 0;
        }
        
        // Update execution progress indicator
        this.updateExecutionIndicator();
    }
    
    checkCollisions() {
        // Check player collisions
        if (this.scene.players && Array.isArray(this.scene.players)) {
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player.isAlive && 
                player !== this.owner && 
                player.sprite && 
                player.sprite.active &&
                player.sprite.x !== undefined &&
                player.sprite.y !== undefined
            );
            
            validPlayers.forEach(player => {
                // Additional safety check within the loop
                if (!player || !player.sprite) return;
                
                const distance = Phaser.Geom.Line.GetShortestDistance(
                    new Phaser.Geom.Line(this.startX, this.startY, this.endX, this.endY),
                    new Phaser.Geom.Point(player.sprite.x, player.sprite.y)
                );
                
                if (distance < 25) {
                    player.takeDamage(this.damage);
                }
            });
        }
        
        // Check block collisions for flamethrower - can destroy blocks in its path
        if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
            const validBlocks = this.scene.destructibleBlocks.filter(block => 
                block && 
                block.x !== undefined && 
                block.y !== undefined && 
                block.active !== false &&
                !block.destroyed
            );
            
            validBlocks.forEach(block => {
                // Enhanced safety check with detailed validation
                if (!block) return;
                if (typeof block.x !== 'number' || typeof block.y !== 'number') {
                    console.warn('Block has invalid coordinates for flame, skipping:', block);
                    return;
                }
                if (!block.active || block.destroyed) return;
                
                const distance = Phaser.Geom.Line.GetShortestDistance(
                    new Phaser.Geom.Line(this.startX, this.startY, this.endX, this.endY),
                    new Phaser.Geom.Point(block.x, block.y)
                );
                
                if (distance < 30) {
                    // Flamethrower destroys blocks gradually
                    if (!block.flameHitCount) block.flameHitCount = 0;
                    block.flameHitCount++;
                    
                    if (block.flameHitCount >= 3) { // Takes 3 hits to destroy a block
                        this.destroyBlockFlame(block);
                    }
                }
            });
        }
    }
    
    destroyBlockFlame(block) {
        // Safety check for block properties
        if (!block || typeof block.x === 'undefined' || typeof block.y === 'undefined') {
            console.warn('Block has invalid position properties for flame:', block);
            return;
        }
        
        const blockX = block.x;
        const blockY = block.y;
        
        // Create flame-specific block destruction effect
        const particles = this.scene.add.particles(blockX, blockY, 'spark', {
            speed: { min: 30, max: 80 },
            scale: { start: 0.25, end: 0 },
            lifespan: 400,
            quantity: 12,
            tint: [0xff0000, 0xff6600, 0xffaa00]
        });
        
        // Remove particles after animation
        this.scene.time.delayedCall(500, () => {
            if (particles) particles.destroy();
        });
        
        // Remove block from game
        if (block.destroy && typeof block.destroy === 'function') {
            block.destroy();
        }
        
        // Remove from destructible blocks array
        const index = this.scene.destructibleBlocks.indexOf(block);
        if (index > -1) {
            this.scene.destructibleBlocks.splice(index, 1);
        }
        
        console.log(`Flamethrower destroyed block at (${blockX}, ${blockY})`);
    }
    
    createExecutionIndicator() {
        // Create flame execution progress indicator above the flame start point
        const indicatorX = this.startX;
        const indicatorY = this.startY - 20;
        
        // Background bar
        this.executionBg = this.scene.add.rectangle(
            indicatorX, indicatorY,
            60, 6, 0x333333
        ).setStrokeStyle(1, 0x000000);
        
        // Progress bar (starts full and depletes)
        this.executionBar = this.scene.add.rectangle(
            indicatorX, indicatorY,
            60, 6, 0xff6600
        );
        
        // Flame duration text
        this.executionText = this.scene.add.text(
            indicatorX, indicatorY - 12,
            'FLAME',
            {
                fontSize: '10px',
                fill: '#ff6600',
                stroke: '#000000',
                strokeThickness: 1,
                align: 'center'
            }
        ).setOrigin(0.5);
    }
    
    updateExecutionIndicator() {
        if (!this.executionBg || !this.executionBar || !this.executionText) return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.max(0, 1 - (elapsed / this.duration)); // Progress goes from 1 to 0
        
        // Update bar width
        const barWidth = 60 * progress;
        this.executionBar.setSize(barWidth, 6);
        this.executionBar.setPosition(this.startX - (60 - barWidth) / 2, this.startY - 20);
        
        // Color transitions from orange to red as flame depletes
        if (progress > 0.6) {
            this.executionBar.setFillStyle(0xff6600); // Orange
        } else if (progress > 0.3) {
            this.executionBar.setFillStyle(0xff3300); // Red-Orange
        } else {
            this.executionBar.setFillStyle(0xff0000); // Red
        }
        
        // Update text to show remaining time
        const timeRemaining = Math.max(0, this.duration - elapsed);
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        this.executionText.setText(`FLAME ${secondsRemaining}s`);
        
        // Pulse effect when almost done
        if (progress < 0.2) {
            this.executionText.setAlpha(0.5 + 0.5 * Math.sin(currentTime / 100));
        }
    }
    
    destroy() {
        this.active = false;
        
        if (this.flameParticles) {
            this.flameParticles.destroy();
        }
        
        // Clean up execution indicator
        if (this.executionBg) {
            this.executionBg.destroy();
        }
        if (this.executionBar) {
            this.executionBar.destroy();
        }
        if (this.executionText) {
            this.executionText.destroy();
        }
        
        const index = this.scene.flames?.indexOf(this);
        if (index > -1) {
            this.scene.flames.splice(index, 1);
        }
    }
}

class SwordSlash {
    constructor(scene, x, y, targetX, targetY, owner) {
        this.scene = scene;
        this.owner = owner;
        this.active = true;
        this.damage = 60;
        this.range = 50;
        this.duration = 300;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.slashX = x + Math.cos(angle) * this.range;
        this.slashY = y + Math.sin(angle) * this.range;
        
        this.createSlashEffect(angle);
        this.checkCollisions();
        
        this.scene.time.delayedCall(this.duration, () => {
            this.destroy();
        });
    }
    
    createSlashEffect(angle) {
        this.slashSprite = this.scene.add.ellipse(
            this.slashX, this.slashY, 60, 20, 0xc0c0c0
        );
        this.slashSprite.setRotation(angle);
        this.slashSprite.setAlpha(0.8);
        
        this.scene.tweens.add({
            targets: this.slashSprite,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: this.duration,
            ease: 'Power2'
        });
    }
    
    checkCollisions() {
        // Check player collisions
        if (this.scene.players && Array.isArray(this.scene.players)) {
            const validPlayers = this.scene.players.filter(player => 
                player && 
                player.isAlive && 
                player !== this.owner && 
                player.sprite && 
                player.sprite.active &&
                player.sprite.x !== undefined &&
                player.sprite.y !== undefined
            );
            
            validPlayers.forEach(player => {
                // Additional safety check within the loop
                if (!player || !player.sprite) return;
                
                const distance = Phaser.Math.Distance.Between(
                    this.slashX, this.slashY,
                    player.sprite.x, player.sprite.y
                );
                
                if (distance < this.range) {
                    player.takeDamage(this.damage);
                    
                    const knockbackForce = 15;
                    if (this.owner && this.owner.sprite && player.sprite && player.sprite.setVelocity) {
                        const angle = Math.atan2(
                            player.sprite.y - this.owner.sprite.y,
                            player.sprite.x - this.owner.sprite.x
                        );
                        
                        player.sprite.setVelocity(
                            Math.cos(angle) * knockbackForce,
                            Math.sin(angle) * knockbackForce
                        );
                    }
                }
            });
        }
        
        // Check block collisions for sword - can destroy 1 block in range
        if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
            const validBlocks = this.scene.destructibleBlocks.filter(block => 
                block && 
                block.x !== undefined && 
                block.y !== undefined && 
                block.active !== false &&
                !block.destroyed
            );
            
            validBlocks.forEach(block => {
                // Enhanced safety check with detailed validation
                if (!block) return;
                if (typeof block.x !== 'number' || typeof block.y !== 'number') {
                    console.warn('Block has invalid coordinates for sword, skipping:', block);
                    return;
                }
                if (!block.active || block.destroyed) return;
                
                const distance = Phaser.Math.Distance.Between(
                    this.slashX, this.slashY,
                    block.x, block.y
                );
                
                if (distance < this.range) {
                    this.destroyBlockSword(block);
                }
            });
        }
    }
    
    destroyBlockSword(block) {
        // Safety check for block properties
        if (!block || typeof block.x === 'undefined' || typeof block.y === 'undefined') {
            console.warn('Block has invalid position properties for sword:', block);
            return;
        }
        
        const blockX = block.x;
        const blockY = block.y;
        
        // Create sword-specific block destruction effect with metallic sparks
        const particles = this.scene.add.particles(blockX, blockY, 'spark', {
            speed: { min: 40, max: 100 },
            scale: { start: 0.3, end: 0 },
            lifespan: 500,
            quantity: 15,
            tint: [0xc0c0c0, 0x95a5a6, 0xffffff]
        });
        
        // Remove particles after animation
        this.scene.time.delayedCall(600, () => {
            if (particles) particles.destroy();
        });
        
        // Remove block from game
        if (block.destroy && typeof block.destroy === 'function') {
            block.destroy();
        }
        
        // Remove from destructible blocks array
        const index = this.scene.destructibleBlocks.indexOf(block);
        if (index > -1) {
            this.scene.destructibleBlocks.splice(index, 1);
        }
        
        console.log(`Sword destroyed block at (${blockX}, ${blockY})`);
    }
    
    destroy() {
        this.active = false;
        
        if (this.slashSprite && this.slashSprite.active) {
            this.slashSprite.destroy();
        }
        
        const index = this.scene.meleeAttacks?.indexOf(this);
        if (index > -1) {
            this.scene.meleeAttacks.splice(index, 1);
        }
    }
}

class SniperBullet extends Projectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 250, // Much slower speed for better collision detection
            damage: 120,
            size: 10, // Even larger size for better visibility
            color: 0x2c3e50,
            range: 450,
            blockPenetration: 3 // Sniper rifle can penetrate through 3 blocks and still hit targets
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        
        // Make bullet more visible
        this.sprite.setStrokeStyle(2, 0xffffff);
        
        // Calculate bullet trajectory angle for visual rotation
        const angle = Math.atan2(targetY - y, targetX - x);
        this.sprite.setRotation(angle);
        
        // Create enhanced visible bullet trail
        this.trailParticles = scene.add.particles(x, y, 'spark', {
            speed: { min: 15, max: 30 },
            scale: { start: 0.15, end: 0 },
            lifespan: 200,
            quantity: 4,
            tint: [0x2c3e50, 0x3498db, 0xffffff]
        });
        
        this.trailParticles.startFollow(this.sprite);
        
        // Create laser sight line for visual feedback
        this.createLaserSight(x, y, targetX, targetY);
        
        // Screen shake on fire
        scene.cameras.main.shake(80, 0.003);
        
        console.log(`Sniper bullet created at (${x}, ${y}) heading to (${targetX}, ${targetY}): speed=${this.speed}, damage=${this.damage}, blockPenetration=${this.blockPenetration}`);
    }
    
    createLaserSight(startX, startY, targetX, targetY) {
        // Create a more visible laser sight line
        const laserLine = this.scene.add.graphics();
        laserLine.lineStyle(3, 0xff0000, 0.9);
        laserLine.moveTo(startX, startY);
        laserLine.lineTo(targetX, targetY);
        laserLine.strokePath();
        
        // Add a second, brighter inner line
        laserLine.lineStyle(1, 0xffffff, 1.0);
        laserLine.moveTo(startX, startY);
        laserLine.lineTo(targetX, targetY);
        laserLine.strokePath();
        
        // Make laser sight fade more slowly for better visibility
        this.scene.tweens.add({
            targets: laserLine,
            alpha: 0,
            duration: 400,
            onComplete: () => laserLine.destroy()
        });
    }
    
    hitTarget(target) {
        // Sniper does extra damage with headshot chance
        const headshotChance = Math.random();
        const finalDamage = headshotChance < 0.2 ? this.damage * 1.5 : this.damage;
        
        target.takeDamage(finalDamage);
        
        // Create impact effect
        const impact = this.scene.add.circle(target.sprite.x, target.sprite.y, 15, 0xff0000);
        impact.setAlpha(0.8);
        
        this.scene.tweens.add({
            targets: impact,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => impact.destroy()
        });
        
        // Sniper bullet can penetrate - use base class penetration logic
        if (this.blockPenetration > 0) {
            this.blockPenetration--; // Reduce penetration when hitting a target
            console.log(`Sniper hit target, ${this.blockPenetration} penetration remaining`);
            
            // Only explode if no penetration left
            if (this.blockPenetration <= 0) {
                this.explode();
            }
        } else {
            // No penetration left - explode
            this.explode();
        }
    }
    
    destroy() {
        if (this.trailParticles) {
            this.trailParticles.destroy();
        }
        super.destroy();
    }
}

class ShotgunBlast extends Projectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 200,
            damage: 80,
            size: 8,
            color: 0x8b4513,
            range: 100,
            blockPenetration: 1 // Shotgun can destroy 1 block
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        
        // Create multiple pellets for shotgun spread
        this.pellets = [];
        const angle = Math.atan2(targetY - y, targetX - x);
        const spreadAngle = Math.PI / 6; // 30 degree spread
        
        for (let i = 0; i < 5; i++) {
            const pelletAngle = angle + (Math.random() - 0.5) * spreadAngle;
            const pelletVelX = Math.cos(pelletAngle) * this.speed;
            const pelletVelY = Math.sin(pelletAngle) * this.speed;
            
            const pellet = scene.add.sprite(x, y, 'shotgun_pellet');
            pellet.setScale(1.2);
            scene.matter.add.gameObject(pellet, {
                shape: 'circle',
                isSensor: true,
                density: 0.001
            });
            
            pellet.setVelocity(pelletVelX, pelletVelY);
            pellet.projectile = this;
            this.pellets.push({
                sprite: pellet,
                velX: pelletVelX,
                velY: pelletVelY,
                distance: 0
            });
        }
        
        // Remove main sprite since we use pellets
        this.sprite.destroy();
        this.sprite = null;
    }
    
    update(delta) {
        if (!this.active) return;
        
        this.pellets = this.pellets.filter(pellet => {
            if (!pellet.sprite || !pellet.sprite.active) return false;
            
            pellet.distance += this.speed * (delta / 1000);
            
            if (pellet.distance >= this.maxRange) {
                pellet.sprite.destroy();
                return false;
            }
            
            return true;
        });
        
        if (this.pellets.length === 0) {
            this.destroy();
            return;
        }
        
        this.checkCollisions();
    }
    
    checkCollisions() {
        if (!this.scene.players) return;
        
        // Filter out null/undefined pellets and players before iteration
        const validPellets = this.pellets.filter(pellet => 
            pellet && 
            pellet.sprite && 
            pellet.sprite.active
        );
        
        const validPlayers = this.scene.players.filter(player => 
            player && 
            player.isAlive && 
            player !== this.owner && 
            player.sprite && 
            player.sprite.active
        );
        
        validPellets.forEach(pellet => {
            // Check player collisions
            validPlayers.forEach(player => {
                const distance = Phaser.Math.Distance.Between(
                    pellet.sprite.x, pellet.sprite.y,
                    player.sprite.x, player.sprite.y
                );
                
                if (distance < 20) {
                    // Damage decreases with distance
                    const damageFalloff = Math.max(0.3, 1 - (pellet.distance / this.maxRange));
                    const finalDamage = Math.floor(this.damage * damageFalloff * 0.4); // Each pellet does 40% damage
                    
                    console.log(`Shotgun pellet hit ${player.playerId} for ${finalDamage} damage`);
                    player.takeDamage(finalDamage);
                    pellet.sprite.destroy();
                }
            });
            
            // Check block collisions for shotgun pellets
            if (this.scene.destructibleBlocks && Array.isArray(this.scene.destructibleBlocks)) {
                const validBlocks = this.scene.destructibleBlocks.filter(block => 
                    block && 
                    block.x !== undefined && 
                    block.y !== undefined && 
                    block.active !== false &&
                    !block.destroyed
                );
                
                validBlocks.forEach(block => {
                    if (!pellet.sprite || !pellet.sprite.active) return;
                    
                    const distance = Phaser.Math.Distance.Between(
                        pellet.sprite.x, pellet.sprite.y,
                        block.x, block.y
                    );
                    
                    if (distance < 30) {
                        // Shotgun can destroy blocks (1 penetration per pellet)
                        if (this.blockPenetration > 0) {
                            this.destroyBlockShotgun(block);
                            this.blockPenetration--;
                            console.log(`Shotgun pellet destroyed block, ${this.blockPenetration} penetration remaining`);
                        }
                        pellet.sprite.destroy();
                    }
                });
            }
        });
    }
    
    destroyBlockShotgun(block) {
        // Safety check for block properties
        if (!block || typeof block.x === 'undefined' || typeof block.y === 'undefined') {
            console.warn('Block has invalid position properties for shotgun:', block);
            return;
        }
        
        const blockX = block.x;
        const blockY = block.y;
        
        // Create shotgun-specific block destruction effect with pellet sparks
        const particles = this.scene.add.particles(blockX, blockY, 'spark', {
            speed: { min: 30, max: 70 },
            scale: { start: 0.2, end: 0 },
            lifespan: 300,
            quantity: 6,
            tint: [0x8b4513, 0x654321, 0xa0522d]
        });
        
        // Remove particles after animation
        this.scene.time.delayedCall(400, () => {
            if (particles) particles.destroy();
        });
        
        // Remove block from game
        if (block.destroy && typeof block.destroy === 'function') {
            block.destroy();
        }
        
        // Remove from destructible blocks array
        const index = this.scene.destructibleBlocks.indexOf(block);
        if (index > -1) {
            this.scene.destructibleBlocks.splice(index, 1);
        }
        
        console.log(`Shotgun destroyed block at (${blockX}, ${blockY})`);
    }
    
    destroy() {
        this.active = false;
        
        // Filter out null/undefined pellets before iteration
        const validPellets = this.pellets.filter(pellet => pellet);
        
        validPellets.forEach(pellet => {
            if (pellet.sprite && pellet.sprite.active) {
                pellet.sprite.destroy();
            }
        });
        
        const index = this.scene.projectiles?.indexOf(this);
        if (index > -1) {
            this.scene.projectiles.splice(index, 1);
        }
    }
}

class LightningBolt extends Projectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 600,
            damage: 95,
            size: 8,
            color: 0x9b59b6,
            range: 280,
            blockPenetration: 4 // Lightning gun can destroy multiple blocks with electrical power
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        
        // Make lightning projectile visible and animated
        this.sprite.setStrokeStyle(2, 0xffffff);
        
        // Lightning particle trail
        this.lightningTrail = scene.add.particles(x, y, 'spark', {
            speed: { min: 20, max: 40 },
            scale: { start: 0.15, end: 0 },
            lifespan: 200,
            quantity: 2,
            tint: [0x9b59b6, 0xffffff, 0x3498db]
        });
        
        this.lightningTrail.startFollow(this.sprite);
        
        // Crackling effect around the projectile
        this.crackleTimer = 0;
        this.crackleInterval = 100;
        
        // Lightning flash effect
        scene.cameras.main.flash(100, 100, 50, 150, false, null, 0.3);
    }
    
    update(delta) {
        if (!this.active) return;
        
        super.update(delta);
        
        // Add crackling visual effects as it travels
        this.crackleTimer += delta;
        if (this.crackleTimer >= this.crackleInterval && this.sprite) {
            this.createCrackleEffect();
            this.crackleTimer = 0;
        }
    }
    
    createCrackleEffect() {
        const crackle = this.scene.add.graphics();
        crackle.lineStyle(1, 0x9b59b6, 0.8);
        
        // Draw small lightning bolts around the projectile
        for (let i = 0; i < 3; i++) {
            const startX = this.sprite.x + (Math.random() - 0.5) * 20;
            const startY = this.sprite.y + (Math.random() - 0.5) * 20;
            const endX = startX + (Math.random() - 0.5) * 15;
            const endY = startY + (Math.random() - 0.5) * 15;
            
            crackle.moveTo(startX, startY);
            crackle.lineTo(endX, endY);
        }
        
        crackle.strokePath();
        
        // Remove crackle effect quickly
        this.scene.time.delayedCall(50, () => {
            crackle.destroy();
        });
    }
    
    hitTarget(target) {
        target.takeDamage(this.damage);
        
        // Chain lightning effect to nearby players
        this.chainLightning(target);
        
        // Create impact effect
        const impact = this.scene.add.circle(target.sprite.x, target.sprite.y, 20, 0x9b59b6);
        impact.setAlpha(0.8);
        
        this.scene.tweens.add({
            targets: impact,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => impact.destroy()
        });
        
        this.explode();
    }
    
    chainLightning(hitPlayer) {
        const chainRange = 80;
        const chainDamage = Math.floor(this.damage * 0.4);
        
        // Filter out null/undefined players before iteration
        const validPlayers = this.scene.players.filter(player => 
            player && 
            player.isAlive && 
            player !== this.owner && 
            player !== hitPlayer && 
            player.sprite && 
            player.sprite.active
        );
        
        validPlayers.forEach(player => {
            const distance = Phaser.Math.Distance.Between(
                hitPlayer.sprite.x, hitPlayer.sprite.y,
                player.sprite.x, player.sprite.y
            );
            
            if (distance < chainRange) {
                player.takeDamage(chainDamage);
                
                // Visual chain effect with zigzag pattern
                const chainEffect = this.scene.add.graphics();
                chainEffect.lineStyle(3, 0x9b59b6, 0.9);
                
                // Create zigzag chain lightning
                const segments = 4;
                const segmentLength = distance / segments;
                const angle = Math.atan2(
                    player.sprite.y - hitPlayer.sprite.y,
                    player.sprite.x - hitPlayer.sprite.x
                );
                
                let currentX = hitPlayer.sprite.x;
                let currentY = hitPlayer.sprite.y;
                
                chainEffect.moveTo(currentX, currentY);
                
                for (let i = 0; i < segments; i++) {
                    const zigzagOffset = (Math.random() - 0.5) * 15;
                    const nextX = currentX + Math.cos(angle) * segmentLength + Math.cos(angle + Math.PI/2) * zigzagOffset;
                    const nextY = currentY + Math.sin(angle) * segmentLength + Math.sin(angle + Math.PI/2) * zigzagOffset;
                    
                    chainEffect.lineTo(nextX, nextY);
                    currentX = nextX;
                    currentY = nextY;
                }
                
                // Final connection to target
                chainEffect.lineTo(player.sprite.x, player.sprite.y);
                chainEffect.strokePath();
                
                this.scene.time.delayedCall(200, () => {
                    chainEffect.destroy();
                });
            }
        });
    }
    
    destroy() {
        this.active = false;
        
        if (this.lightningTrail) {
            this.lightningTrail.destroy();
        }
        
        super.destroy();
    }
}

// WeaponSystem class to manage multiple weapons for a player
class WeaponSystem {
    constructor(scene) {
        this.scene = scene;
        this.owner = null;
        this.weapons = new Map();
        this.currentWeapon = null;
        this.weaponTypes = ['grenade', 'rocket', 'flamethrower', 'sword', 'sniper', 'shotgun', 'lightning'];
        this.currentWeaponIndex = 0;
        
        console.log('🔫 WeaponSystem created');
    }
    
    setOwner(player) {
        this.owner = player;
        // Auto-equip first weapon for the player
        this.equipWeapon(this.weaponTypes[0]);
        console.log(`🎯 WeaponSystem owner set to player ${player.playerId}`);
    }
    
    getCurrentWeapon() {
        return this.currentWeapon;
    }
    
    cycleWeapon() {
        if (!this.owner) return;
        
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponTypes.length;
        const nextWeaponType = this.weaponTypes[this.currentWeaponIndex];
        
        console.log(`🔄 Cycling to weapon: ${nextWeaponType} (${this.currentWeaponIndex + 1}/${this.weaponTypes.length})`);
        this.equipWeapon(nextWeaponType);
    }
    
    equipWeapon(weaponType) {
        if (!this.owner) {
            console.warn('❌ Cannot equip weapon - no owner set');
            return false;
        }
        
        // Create weapon if it doesn't exist
        if (!this.weapons.has(weaponType)) {
            try {
                const weapon = new Weapon(this.scene, weaponType, this.owner);
                this.weapons.set(weaponType, weapon);
                weapon.reload(); // Start with full ammo
                console.log(`✅ Created new weapon: ${weaponType}`);
            } catch (error) {
                console.error(`❌ Failed to create weapon ${weaponType}:`, error);
                return false;
            }
        }
        
        this.currentWeapon = this.weapons.get(weaponType);
        
        // Update weapon index to match current weapon
        const index = this.weaponTypes.indexOf(weaponType);
        if (index !== -1) {
            this.currentWeaponIndex = index;
        }
        
        // Show weapon info to player
        this.showWeaponInfo(weaponType);
        
        return true;
    }
    
    fireWeapon(targetX, targetY) {
        if (!this.currentWeapon || !this.owner) {
            console.warn('❌ Cannot fire weapon - no current weapon or owner');
            return false;
        }
        
        const success = this.currentWeapon.fire(targetX, targetY);
        if (success) {
            console.log(`🔥 Weapon fired: ${this.currentWeapon.type}`);
            
            // For multiplayer, emit weapon fire event to server
            if (typeof networkManager !== 'undefined' && networkManager.socket) {
                const weaponData = {
                    weaponType: this.currentWeapon.type,
                    playerX: this.owner.sprite.x,
                    playerY: this.owner.sprite.y,
                    targetX: targetX,
                    targetY: targetY,
                    timestamp: Date.now()
                };
                
                networkManager.socket.emit('fireWeapon', weaponData);
                console.log('📡 Weapon fire sent to server:', weaponData);
            }
        }
        
        return success;
    }
    
    handleRemoteWeaponFire(data) {
        // Handle weapon effects from remote players
        console.log(`🎆 Handling remote weapon fire:`, data);
        
        if (!data.weapon || !this.scene) return;
        
        const { weapon } = data;
        const { type, startX, startY, targetX, targetY } = weapon;
        
        // Create visual effects for remote weapon firing
        this.createRemoteWeaponEffect(type, startX, startY, targetX, targetY);
    }
    
    createRemoteWeaponEffect(weaponType, startX, startY, targetX, targetY) {
        console.log(`🎬 Creating remote weapon effect: ${weaponType}`);
        
        // Create appropriate visual effect based on weapon type
        switch (weaponType) {
            case 'grenade':
                this.createRemoteGrenadeEffect(startX, startY, targetX, targetY);
                break;
            case 'rocket':
                this.createRemoteRocketEffect(startX, startY, targetX, targetY);
                break;
            case 'flamethrower':
                this.createRemoteFlamethrowerEffect(startX, startY, targetX, targetY);
                break;
            case 'sword':
                this.createRemoteSwordEffect(startX, startY, targetX, targetY);
                break;
            case 'sniper':
                this.createRemoteSniperEffect(startX, startY, targetX, targetY);
                break;
            case 'shotgun':
                this.createRemoteShotgunEffect(startX, startY, targetX, targetY);
                break;
            case 'lightning':
                this.createRemoteLightningEffect(startX, startY, targetX, targetY);
                break;
            default:
                console.warn(`❌ Unknown weapon type for remote effect: ${weaponType}`);
        }
    }
    
    createRemoteGrenadeEffect(startX, startY, targetX, targetY) {
        // Visual-only grenade for remote players
        const grenade = this.scene.add.circle(startX, startY, 10, 0x8b4513);
        grenade.setStrokeStyle(2, 0x654321);
        
        // Animate grenade trajectory
        this.scene.tweens.add({
            targets: grenade,
            x: targetX,
            y: targetY,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                // Explosion effect
                const explosion = this.scene.add.circle(targetX, targetY, 20, 0xff6b35);
                explosion.setAlpha(0.8);
                
                this.scene.tweens.add({
                    targets: explosion,
                    scaleX: 3,
                    scaleY: 3,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => {
                        explosion.destroy();
                        grenade.destroy();
                    }
                });
            }
        });
    }
    
    createRemoteRocketEffect(startX, startY, targetX, targetY) {
        // Visual-only rocket for remote players
        const rocket = this.scene.add.circle(startX, startY, 18, 0xff4500);
        rocket.setStrokeStyle(3, 0xffffff);
        
        const angle = Math.atan2(targetY - startY, targetX - startX);
        rocket.setRotation(angle);
        
        // Animate rocket trajectory
        this.scene.tweens.add({
            targets: rocket,
            x: targetX,
            y: targetY,
            duration: 1200,
            ease: 'Power1',
            onComplete: () => {
                // Large explosion effect
                const explosion = this.scene.add.circle(targetX, targetY, 25, 0xff4500);
                explosion.setAlpha(0.8);
                
                this.scene.tweens.add({
                    targets: explosion,
                    scaleX: 4,
                    scaleY: 4,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        explosion.destroy();
                        rocket.destroy();
                    }
                });
                
                // Screen shake for big explosion
                this.scene.cameras.main.shake(200, 0.01);
            }
        });
    }
    
    createRemoteFlamethrowerEffect(startX, startY, targetX, targetY) {
        // Visual flame stream
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const range = 80;
        const endX = startX + Math.cos(angle) * range;
        const endY = startY + Math.sin(angle) * range;
        
        const flame = this.scene.add.graphics();
        flame.lineStyle(12, 0xff6600, 0.8);
        flame.moveTo(startX, startY);
        flame.lineTo(endX, endY);
        flame.strokePath();
        
        // Fade out flame
        this.scene.tweens.add({
            targets: flame,
            alpha: 0,
            duration: 1000,
            onComplete: () => flame.destroy()
        });
    }
    
    createRemoteSwordEffect(startX, startY, targetX, targetY) {
        // Visual sword slash
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const range = 50;
        const slashX = startX + Math.cos(angle) * range;
        const slashY = startY + Math.sin(angle) * range;
        
        const slash = this.scene.add.ellipse(slashX, slashY, 60, 20, 0xc0c0c0);
        slash.setRotation(angle);
        slash.setAlpha(0.8);
        
        this.scene.tweens.add({
            targets: slash,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => slash.destroy()
        });
    }
    
    createRemoteSniperEffect(startX, startY, targetX, targetY) {
        // Laser sight line
        const laser = this.scene.add.graphics();
        laser.lineStyle(3, 0xff0000, 0.9);
        laser.moveTo(startX, startY);
        laser.lineTo(targetX, targetY);
        laser.strokePath();
        
        // Brighter inner line
        laser.lineStyle(1, 0xffffff, 1.0);
        laser.moveTo(startX, startY);
        laser.lineTo(targetX, targetY);
        laser.strokePath();
        
        this.scene.tweens.add({
            targets: laser,
            alpha: 0,
            duration: 400,
            onComplete: () => laser.destroy()
        });
        
        // Screen shake for sniper
        this.scene.cameras.main.shake(80, 0.003);
    }
    
    createRemoteShotgunEffect(startX, startY, targetX, targetY) {
        // Multiple pellet effects
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const spreadAngle = Math.PI / 6;
        
        for (let i = 0; i < 5; i++) {
            const pelletAngle = angle + (Math.random() - 0.5) * spreadAngle;
            const range = 80 + Math.random() * 20;
            const pelletTargetX = startX + Math.cos(pelletAngle) * range;
            const pelletTargetY = startY + Math.sin(pelletAngle) * range;
            
            const pellet = this.scene.add.circle(startX, startY, 4, 0x8b4513);
            
            this.scene.tweens.add({
                targets: pellet,
                x: pelletTargetX,
                y: pelletTargetY,
                duration: 300 + Math.random() * 200,
                onComplete: () => pellet.destroy()
            });
        }
    }
    
    createRemoteLightningEffect(startX, startY, targetX, targetY) {
        // Lightning bolt effect
        const lightning = this.scene.add.graphics();
        lightning.lineStyle(4, 0x9b59b6, 0.9);
        
        // Create zigzag lightning
        const segments = 6;
        const segmentLength = Phaser.Math.Distance.Between(startX, startY, targetX, targetY) / segments;
        const angle = Math.atan2(targetY - startY, targetX - startX);
        
        let currentX = startX;
        let currentY = startY;
        
        lightning.moveTo(currentX, currentY);
        
        for (let i = 0; i < segments; i++) {
            const zigzagOffset = (Math.random() - 0.5) * 20;
            const nextX = currentX + Math.cos(angle) * segmentLength + Math.cos(angle + Math.PI/2) * zigzagOffset;
            const nextY = currentY + Math.sin(angle) * segmentLength + Math.sin(angle + Math.PI/2) * zigzagOffset;
            
            lightning.lineTo(nextX, nextY);
            currentX = nextX;
            currentY = nextY;
        }
        
        // Final connection to target
        lightning.lineTo(targetX, targetY);
        lightning.strokePath();
        
        this.scene.tweens.add({
            targets: lightning,
            alpha: 0,
            duration: 300,
            onComplete: () => lightning.destroy()
        });
        
        // Lightning flash
        this.scene.cameras.main.flash(100, 100, 50, 150, false, null, 0.3);
    }
    
    showWeaponInfo(weaponType) {
        if (!this.owner) return;
        
        const config = this.currentWeapon?.config;
        if (!config) return;
        
        const damage = config.damage;
        const ammo = this.currentWeapon.ammo === -1 ? '∞' : this.currentWeapon.ammo;
        
        // Remove previous weapon info
        if (this.owner.weaponInfoText) {
            this.owner.weaponInfoText.destroy();
        }
        
        // Create weapon info display
        this.owner.weaponInfoText = this.scene.add.text(
            this.owner.sprite.x, this.owner.sprite.y - 60,
            `${config.name}\n${damage}DMG | ${ammo} ammo`,
            {
                fontSize: '12px',
                fill: '#' + config.color.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Fade out weapon info after a delay
        this.scene.tweens.add({
            targets: this.owner.weaponInfoText,
            alpha: 0,
            delay: 2000,
            duration: 500,
            onComplete: () => {
                if (this.owner.weaponInfoText) {
                    this.owner.weaponInfoText.destroy();
                    this.owner.weaponInfoText = null;
                }
            }
        });
        
        // Update weapon symbol
        this.updateWeaponSymbol();
    }
    
    updateWeaponSymbol() {
        if (!this.owner || !this.currentWeapon) return;
        
        const config = this.currentWeapon.config;
        const ammo = this.currentWeapon.ammo === -1 ? '∞' : this.currentWeapon.ammo;
        
        // Remove old weapon symbol
        if (this.owner.weaponSymbol) {
            this.owner.weaponSymbol.destroy();
        }
        
        // Create new weapon symbol
        this.owner.weaponSymbol = this.scene.add.text(
            this.owner.sprite.x + 20, this.owner.sprite.y - 20,
            `${config.symbol}:${ammo}`,
            {
                fontSize: '14px',
                fill: '#' + config.color.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);
    }
    
    update(delta) {
        // Update all weapons
        this.weapons.forEach(weapon => {
            weapon.update(delta);
        });
        
        // Update weapon symbol position
        if (this.owner && this.owner.weaponSymbol && this.owner.sprite) {
            this.owner.weaponSymbol.setPosition(
                this.owner.sprite.x + 20,
                this.owner.sprite.y - 20
            );
        }
    }
    
    destroy() {
        // Clean up all weapons
        this.weapons.forEach(weapon => {
            // Weapons don't have destroy methods, but we can clear them
        });
        this.weapons.clear();
        
        // Clean up UI elements
        if (this.owner) {
            if (this.owner.weaponInfoText) {
                this.owner.weaponInfoText.destroy();
                this.owner.weaponInfoText = null;
            }
            if (this.owner.weaponSymbol) {
                this.owner.weaponSymbol.destroy();
                this.owner.weaponSymbol = null;
            }
        }
        
        this.currentWeapon = null;
        this.owner = null;
        
        console.log('🔫 WeaponSystem destroyed');
    }
}