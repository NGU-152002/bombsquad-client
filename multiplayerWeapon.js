// COMPLETE OFFLINE WEAPON SYSTEM REPLICATION FOR MULTIPLAYER
// This file contains the exact same weapon system as weapon.js but adapted for multiplayer

class MultiplayerWeapon {
    constructor(scene, type, owner) {
        this.scene = scene;
        this.type = type;
        this.owner = owner;
        this.ammo = this.getMaxAmmo();
        this.cooldown = 0;
        this.lastFired = 0;
        
        this.config = this.getWeaponConfig();
        console.log(`🔫 MultiplayerWeapon created: ${type}`, this.config);
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
    
    reload() {
        this.ammo = this.getMaxAmmo();
        console.log(`🔄 Weapon reloaded: ${this.type}, ammo: ${this.ammo}`);
    }
    
    update(delta) {
        if (this.cooldown > 0) {
            this.cooldown -= delta;
        }
    }
    
    fire(targetX, targetY) {
        console.log(`🔥 MultiplayerWeapon.fire() called: ${this.type}`);
        
        if (!this.canFire()) {
            console.log(`❌ Cannot fire ${this.type} - cooldown or no ammo`);
            return false;
        }
        
        this.lastFired = Date.now();
        
        if (this.ammo > 0) {
            this.ammo--;
            console.log(`📦 Ammo reduced to: ${this.ammo}`);
        }
        
        // Add firing animation feedback - same as offline
        this.playFiringAnimation();
        
        // Trigger combat zoom when weapon is fired (if available)
        if (window.cameraZoomManager) {
            cameraZoomManager.setCombatMode(true);
            setTimeout(() => {
                if (window.cameraZoomManager) {
                    cameraZoomManager.setCombatMode(false);
                }
            }, 2000);
        }
        
        // Fire the specific weapon type - EXACT same as offline
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
        const grenade = new MultiplayerGrenade(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(grenade);
        console.log(`🔥 Grenade fired from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    fireRocket(targetX, targetY) {
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        const rocket = new MultiplayerRocket(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(rocket);
        console.log(`🔥 Rocket fired from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    fireFlamethrower(targetX, targetY) {
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        const flame = new MultiplayerFlameStream(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.flames = this.scene.flames || [];
        this.scene.flames.push(flame);
        console.log(`🔥 Flamethrower fired from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    swingSword(targetX, targetY) {
        const sword = new MultiplayerSwordSlash(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.meleeAttacks = this.scene.meleeAttacks || [];
        this.scene.meleeAttacks.push(sword);
        console.log(`🔥 Sword swung from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    fireSniper(targetX, targetY) {
        const sniper = new MultiplayerSniperBullet(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(sniper);
        console.log(`🔥 Sniper fired from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    fireShotgun(targetX, targetY) {
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        
        const shotgun = new MultiplayerShotgunBlast(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(shotgun);
        console.log(`🔥 Shotgun fired from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    fireLightning(targetX, targetY) {
        const lightning = new MultiplayerLightningBolt(this.scene, this.owner.sprite.x, this.owner.sprite.y, targetX, targetY, this.owner);
        this.scene.projectiles = this.scene.projectiles || [];
        this.scene.projectiles.push(lightning);
        console.log(`🔥 Lightning fired from (${this.owner.sprite.x}, ${this.owner.sprite.y}) to (${targetX}, ${targetY})`);
        return true;
    }
    
    playFiringAnimation() {
        console.log(`🎬 Playing firing animation for ${this.type}`);
        
        // Player recoil animation - same as offline
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
            
            // Screen shake based on weapon power
            if (this.scene.cameras && this.scene.cameras.main) {
                this.scene.cameras.main.shake(animConfig.shakeDuration, animConfig.shakeIntensity);
            }
        }
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
}

// EXACT REPLICATION OF OFFLINE PROJECTILE CLASSES FOR MULTIPLAYER

class MultiplayerProjectile {
    constructor(scene, x, y, targetX, targetY, owner, config) {
        this.scene = scene;
        this.owner = owner;
        this.config = config;
        this.active = true;
        this.speed = config.speed || 200;
        this.damage = config.damage || 50;
        this.blockPenetration = config.blockPenetration || 0;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        
        this.sprite = scene.add.circle(x, y, config.size || 8, config.color || 0xff0000);
        
        // Add physics body if available
        if (scene.matter) {
            scene.matter.add.gameObject(this.sprite, {
                shape: 'circle',
                isSensor: true,
                density: 0.001
            });
            this.sprite.setVelocity(this.velocityX, this.velocityY);
        }
        
        this.sprite.projectile = this;
        this.travelDistance = 0;
        this.maxRange = config.range || 300;
        
        console.log(`🚀 ${this.constructor.name} created at (${x}, ${y}) -> (${targetX}, ${targetY})`);
    }
    
    update(delta) {
        if (!this.active || !this.sprite || !this.sprite.active) return;
        
        // Update position if no physics
        if (!this.scene.matter || !this.sprite.body) {
            this.sprite.x += this.velocityX * (delta / 1000);
            this.sprite.y += this.velocityY * (delta / 1000);
        }
        
        this.travelDistance += this.speed * (delta / 1000);
        
        if (this.travelDistance >= this.maxRange) {
            this.explode();
            return;
        }
        
        this.checkCollisions();
    }
    
    checkCollisions() {
        this.checkBoundaryCollisions();
        this.checkPlayerCollisions();
        this.checkBlockCollisions();
    }
    
    checkBoundaryCollisions() {
        if (!this.sprite || !this.active) return;
        
        const bounds = this.scene.game.config;
        const margin = 20;
        
        if (this.sprite.x < margin || this.sprite.x > bounds.width - margin ||
            this.sprite.y < margin || this.sprite.y > bounds.height - margin) {
            console.log(`${this.constructor.name}: Hit boundary, exploding`);
            this.explode();
        }
    }
    
    checkPlayerCollisions() {
        if (!this.scene || !this.sprite) return;
        
        // Get players from multiplayer system
        const players = [];
        if (typeof multiplayerPlayers !== 'undefined') {
            multiplayerPlayers.forEach(player => {
                if (player && player.isAlive && player !== this.owner && player.sprite && player.sprite.active) {
                    players.push(player);
                }
            });
        }
        
        console.log(`${this.constructor.name}: Checking ${players.length} players for collision`);
        
        players.forEach(player => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                player.sprite.x, player.sprite.y
            );
            
            if (distance < 35) {
                console.log(`${this.constructor.name} hit player ${player.playerId} at distance ${distance}`);
                this.hitTarget(player);
            }
        });
    }
    
    checkBlockCollisions() {
        if (!this.scene.destructibleBlocks || !Array.isArray(this.scene.destructibleBlocks)) return;
        
        const validBlocks = this.scene.destructibleBlocks.filter(block => 
            block && block.x !== undefined && block.y !== undefined && block.active !== false && !block.destroyed
        );
        
        validBlocks.forEach(block => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y, block.x, block.y
            );
            
            if (distance < 35) {
                if (this.blockPenetration > 0) {
                    this.destroyBlock(block);
                    this.blockPenetration--;
                    if (this.blockPenetration <= 0) {
                        this.explode();
                    }
                } else {
                    this.explode();
                }
            }
        });
    }
    
    hitTarget(target) {
        target.takeDamage(this.damage);
        this.explode();
    }
    
    explode() {
        if (!this.active) return;
        this.active = false;
        
        this.createExplosionEffect();
        this.destroy();
    }
    
    createExplosionEffect() {
        if (!this.sprite) return;
        
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
    }
    
    destroyBlock(block) {
        if (!block || typeof block.x === 'undefined' || typeof block.y === 'undefined') return;
        
        const blockX = block.x;
        const blockY = block.y;
        
        // Remove block from game
        if (block.destroy && typeof block.destroy === 'function') {
            block.destroy();
        }
        
        // Remove from destructible blocks array
        const index = this.scene.destructibleBlocks.indexOf(block);
        if (index > -1) {
            this.scene.destructibleBlocks.splice(index, 1);
        }
        
        console.log(`Block destroyed at (${blockX}, ${blockY})`);
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

// EXACT REPLICATIONS OF ALL WEAPON PROJECTILES

class MultiplayerGrenade extends MultiplayerProjectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 150,
            damage: 75,
            size: 10,
            color: 0x8b4513,
            range: 200,
            blockPenetration: 1
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        this.sprite.setStrokeStyle(2, 0x654321);
        
        this.fuseTime = 2500;
        this.startFuse();
    }
    
    startFuse() {
        let timeLeft = Math.ceil(this.fuseTime / 1000);
        
        this.fuseText = this.scene.add.text(this.sprite.x, this.sprite.y - 20, timeLeft.toString(), {
            fontSize: '14px',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        const updateTimer = () => {
            if (!this.active || !this.fuseText) return;
            
            this.fuseText.setText(timeLeft.toString());
            this.fuseText.setPosition(this.sprite.x, this.sprite.y - 20);
            
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
    
    destroy() {
        if (this.fuseText && this.fuseText.active) {
            this.fuseText.destroy();
        }
        super.destroy();
    }
}

class MultiplayerRocket extends MultiplayerProjectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 120,
            damage: 90,
            size: 18,
            color: 0xff4500,
            range: 400,
            blockPenetration: 3
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        this.sprite.setStrokeStyle(3, 0xffffff);
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.sprite.setRotation(angle);
    }
}

class MultiplayerFlameStream {
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
        
        this.scene.time.delayedCall(this.duration, () => {
            this.destroy();
        });
        
        this.damageTimer = 0;
        this.damageInterval = 200;
    }
    
    createFlameEffect() {
        this.flameGraphics = this.scene.add.graphics();
        this.flameGraphics.lineStyle(8, 0xff6600, 0.8);
        this.flameGraphics.moveTo(this.startX, this.startY);
        this.flameGraphics.lineTo(this.endX, this.endY);
        this.flameGraphics.strokePath();
        
        // Fade out flame
        this.scene.tweens.add({
            targets: this.flameGraphics,
            alpha: 0,
            duration: this.duration,
            onComplete: () => {
                if (this.flameGraphics) this.flameGraphics.destroy();
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
    }
    
    checkCollisions() {
        // Get players from multiplayer system
        const players = [];
        if (typeof multiplayerPlayers !== 'undefined') {
            multiplayerPlayers.forEach(player => {
                if (player && player.isAlive && player !== this.owner && player.sprite && player.sprite.active) {
                    players.push(player);
                }
            });
        }
        
        players.forEach(player => {
            const distance = Phaser.Geom.Line.GetShortestDistance(
                new Phaser.Geom.Line(this.startX, this.startY, this.endX, this.endY),
                new Phaser.Geom.Point(player.sprite.x, player.sprite.y)
            );
            
            if (distance < 25) {
                player.takeDamage(this.damage);
            }
        });
    }
    
    destroy() {
        this.active = false;
        if (this.flameGraphics) {
            this.flameGraphics.destroy();
        }
        
        const index = this.scene.flames?.indexOf(this);
        if (index > -1) {
            this.scene.flames.splice(index, 1);
        }
    }
}

class MultiplayerSwordSlash {
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
        // Get players from multiplayer system
        const players = [];
        if (typeof multiplayerPlayers !== 'undefined') {
            multiplayerPlayers.forEach(player => {
                if (player && player.isAlive && player !== this.owner && player.sprite && player.sprite.active) {
                    players.push(player);
                }
            });
        }
        
        players.forEach(player => {
            const distance = Phaser.Math.Distance.Between(
                this.slashX, this.slashY,
                player.sprite.x, player.sprite.y
            );
            
            if (distance < this.range) {
                player.takeDamage(this.damage);
            }
        });
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

class MultiplayerSniperBullet extends MultiplayerProjectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 250,
            damage: 120,
            size: 10,
            color: 0x2c3e50,
            range: 450,
            blockPenetration: 3
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        this.sprite.setStrokeStyle(2, 0xffffff);
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.sprite.setRotation(angle);
        
        this.createLaserSight(x, y, targetX, targetY);
        scene.cameras.main.shake(80, 0.003);
    }
    
    createLaserSight(startX, startY, targetX, targetY) {
        const laserLine = this.scene.add.graphics();
        laserLine.lineStyle(3, 0xff0000, 0.9);
        laserLine.moveTo(startX, startY);
        laserLine.lineTo(targetX, targetY);
        laserLine.strokePath();
        
        this.scene.tweens.add({
            targets: laserLine,
            alpha: 0,
            duration: 400,
            onComplete: () => laserLine.destroy()
        });
    }
}

class MultiplayerShotgunBlast extends MultiplayerProjectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 200,
            damage: 80,
            size: 8,
            color: 0x8b4513,
            range: 100,
            blockPenetration: 1
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        
        // Create multiple pellets
        this.pellets = [];
        const angle = Math.atan2(targetY - y, targetX - x);
        const spreadAngle = Math.PI / 6;
        
        for (let i = 0; i < 5; i++) {
            const pelletAngle = angle + (Math.random() - 0.5) * spreadAngle;
            const pelletVelX = Math.cos(pelletAngle) * this.speed;
            const pelletVelY = Math.sin(pelletAngle) * this.speed;
            
            const pellet = scene.add.circle(x, y, 4, 0x8b4513);
            if (scene.matter) {
                scene.matter.add.gameObject(pellet, {
                    shape: 'circle',
                    isSensor: true,
                    density: 0.001
                });
                pellet.setVelocity(pelletVelX, pelletVelY);
            }
            
            this.pellets.push({
                sprite: pellet,
                velX: pelletVelX,
                velY: pelletVelY,
                distance: 0
            });
        }
        
        // Remove main sprite
        this.sprite.destroy();
        this.sprite = null;
    }
    
    update(delta) {
        if (!this.active) return;
        
        this.pellets = this.pellets.filter(pellet => {
            if (!pellet.sprite || !pellet.sprite.active) return false;
            
            // Update position if no physics
            if (!this.scene.matter || !pellet.sprite.body) {
                pellet.sprite.x += pellet.velX * (delta / 1000);
                pellet.sprite.y += pellet.velY * (delta / 1000);
            }
            
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
        
        this.checkPelletCollisions();
    }
    
    checkPelletCollisions() {
        // Get players from multiplayer system
        const players = [];
        if (typeof multiplayerPlayers !== 'undefined') {
            multiplayerPlayers.forEach(player => {
                if (player && player.isAlive && player !== this.owner && player.sprite && player.sprite.active) {
                    players.push(player);
                }
            });
        }
        
        this.pellets.forEach(pellet => {
            players.forEach(player => {
                const distance = Phaser.Math.Distance.Between(
                    pellet.sprite.x, pellet.sprite.y,
                    player.sprite.x, player.sprite.y
                );
                
                if (distance < 20) {
                    const damageFalloff = Math.max(0.3, 1 - (pellet.distance / this.maxRange));
                    const finalDamage = Math.floor(this.damage * damageFalloff * 0.4);
                    
                    player.takeDamage(finalDamage);
                    pellet.sprite.destroy();
                }
            });
        });
    }
    
    destroy() {
        this.active = false;
        
        this.pellets.forEach(pellet => {
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

class MultiplayerLightningBolt extends MultiplayerProjectile {
    constructor(scene, x, y, targetX, targetY, owner) {
        const config = {
            speed: 600,
            damage: 95,
            size: 8,
            color: 0x9b59b6,
            range: 280,
            blockPenetration: 4
        };
        
        super(scene, x, y, targetX, targetY, owner, config);
        this.sprite.setStrokeStyle(2, 0xffffff);
        
        scene.cameras.main.flash(100, 100, 50, 150, false, null, 0.3);
    }
    
    hitTarget(target) {
        target.takeDamage(this.damage);
        this.chainLightning(target);
        this.explode();
    }
    
    chainLightning(hitPlayer) {
        const chainRange = 80;
        const chainDamage = Math.floor(this.damage * 0.4);
        
        // Get players from multiplayer system
        const players = [];
        if (typeof multiplayerPlayers !== 'undefined') {
            multiplayerPlayers.forEach(player => {
                if (player && player.isAlive && player !== this.owner && player !== hitPlayer && player.sprite && player.sprite.active) {
                    players.push(player);
                }
            });
        }
        
        players.forEach(player => {
            const distance = Phaser.Math.Distance.Between(
                hitPlayer.sprite.x, hitPlayer.sprite.y,
                player.sprite.x, player.sprite.y
            );
            
            if (distance < chainRange) {
                player.takeDamage(chainDamage);
                
                // Visual chain effect
                const chainEffect = this.scene.add.graphics();
                chainEffect.lineStyle(3, 0x9b59b6, 0.9);
                chainEffect.moveTo(hitPlayer.sprite.x, hitPlayer.sprite.y);
                chainEffect.lineTo(player.sprite.x, player.sprite.y);
                chainEffect.strokePath();
                
                this.scene.time.delayedCall(200, () => {
                    chainEffect.destroy();
                });
            }
        });
    }
}

// MultiplayerWeaponSystem class specifically for multiplayer
class MultiplayerWeaponSystem {
    constructor(scene) {
        this.scene = scene;
        this.owner = null;
        this.weapons = new Map();
        this.currentWeapon = null;
        this.weaponTypes = ['grenade', 'rocket', 'flamethrower', 'sword', 'sniper', 'shotgun', 'lightning'];
        this.currentWeaponIndex = 0;
        
        console.log('🔫 MultiplayerWeaponSystem created');
    }
    
    setOwner(player) {
        console.log(`🎯 Setting MultiplayerWeaponSystem owner to player ${player.playerId}`);
        this.owner = player;
        
        // Auto-equip first weapon for the player with error handling
        try {
            const defaultWeapon = this.weaponTypes[0];
            console.log(`🔫 Auto-equipping default weapon: ${defaultWeapon}`);
            const success = this.equipWeapon(defaultWeapon);
            
            if (success) {
                console.log(`✅ Successfully equipped ${defaultWeapon} for player ${player.playerId}`);
                console.log(`🎯 Current weapon after setOwner:`, this.getCurrentWeapon()?.type || 'none');
            } else {
                console.error(`❌ Failed to auto-equip weapon ${defaultWeapon} for player ${player.playerId}`);
            }
        } catch (error) {
            console.error(`❌ Error during auto-equip for player ${player.playerId}:`, error);
        }
        
        console.log(`🎯 MultiplayerWeaponSystem setup complete for player ${player.playerId}`);
    }
    
    getCurrentWeapon() {
        return this.currentWeapon;
    }
    
    cycleWeapon() {
        console.log(`🔄 MultiplayerWeaponSystem.cycleWeapon called`);
        console.log(`🔄 Current owner:`, this.owner?.playerId || 'none');
        console.log(`🔄 Current weapon index:`, this.currentWeaponIndex);
        console.log(`🔄 Current weapon:`, this.currentWeapon?.type || 'none');
        
        if (!this.owner) {
            console.warn('❌ Cannot cycle weapon - no owner set');
            return;
        }
        
        const previousIndex = this.currentWeaponIndex;
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponTypes.length;
        const nextWeaponType = this.weaponTypes[this.currentWeaponIndex];
        
        console.log(`🔄 Cycling from index ${previousIndex} to ${this.currentWeaponIndex}`);
        console.log(`🔄 Cycling to weapon: ${nextWeaponType} (${this.currentWeaponIndex + 1}/${this.weaponTypes.length})`);
        
        const success = this.equipWeapon(nextWeaponType);
        
        if (success) {
            console.log(`✅ Successfully cycled to ${nextWeaponType}`);
        } else {
            console.error(`❌ Failed to cycle to ${nextWeaponType}`);
        }
    }
    
    equipWeapon(weaponType) {
        if (!this.owner) {
            console.warn('❌ Cannot equip weapon - no owner set');
            return false;
        }
        
        // Create weapon if it doesn't exist
        if (!this.weapons.has(weaponType)) {
            try {
                const weapon = new MultiplayerWeapon(this.scene, weaponType, this.owner);
                this.weapons.set(weaponType, weapon);
                weapon.reload(); // Start with full ammo
                console.log(`✅ Created new multiplayer weapon: ${weaponType}`);
            } catch (error) {
                console.error(`❌ Failed to create multiplayer weapon ${weaponType}:`, error);
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
        console.log(`🔥 MultiplayerWeaponSystem.fireWeapon called`);
        console.log(`🔥 Current weapon:`, this.currentWeapon?.type || 'none');
        console.log(`🔥 Owner:`, this.owner?.playerId || 'none');
        console.log(`🔥 Target: (${targetX}, ${targetY})`);
        
        if (!this.currentWeapon) {
            console.warn('❌ Cannot fire weapon - no current weapon equipped');
            console.log('🔧 Available weapons:', Array.from(this.weapons.keys()));
            return false;
        }
        
        if (!this.owner) {
            console.warn('❌ Cannot fire weapon - no owner set');
            return false;
        }
        
        if (!this.currentWeapon.canFire()) {
            console.warn('❌ Weapon cannot fire - cooldown or no ammo');
            console.log(`🔥 Weapon ammo:`, this.currentWeapon.ammo);
            console.log(`🔥 Weapon last fired:`, this.currentWeapon.lastFired);
            console.log(`🔥 Current time:`, Date.now());
            return false;
        }
        
        const success = this.currentWeapon.fire(targetX, targetY);
        if (success) {
            console.log(`✅ Multiplayer weapon fired successfully: ${this.currentWeapon.type}`);
            
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
                console.log('📡 Multiplayer weapon fire sent to server:', weaponData);
            } else {
                console.warn('⚠️ Network manager not available - weapon fire not sent to server');
            }
        } else {
            console.warn('❌ Weapon fire failed');
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
        console.log(`🎬 Creating remote multiplayer weapon effect: ${weaponType}`);
        
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
        
        console.log('🔫 MultiplayerWeaponSystem destroyed');
    }
}