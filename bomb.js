class Bomb {
    constructor(scene, x, y, owner, power = 3) {
        this.scene = scene;
        this.owner = owner;
        this.power = power;
        this.fuseTime = 3000; // 3 seconds
        this.exploded = false;
        
        // Create bomb sprite
        this.sprite = scene.add.circle(x, y, 16, 0x2c3e50);
        this.sprite.setStrokeStyle(2, 0x34495e);
        
        // Add physics
        scene.matter.add.gameObject(this.sprite, {
            shape: 'circle',
            isStatic: true,
            isSensor: false
        });
        
        // Add fuse animation
        this.fuseText = scene.add.text(x, y - 30, '3', {
            fontSize: '20px',
            fill: '#e74c3c',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Start countdown
        this.startCountdown();
        
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
    }
    
    startCountdown() {
        let timeLeft = Math.ceil(this.fuseTime / 1000);
        
        const updateTimer = () => {
            if (this.exploded) return;
            
            this.fuseText.setText(timeLeft.toString());
            
            // Change color as time runs out
            if (timeLeft <= 1) {
                this.fuseText.setFill('#ff0000');
                this.sprite.setFillStyle(0xe74c3c);
            } else if (timeLeft <= 2) {
                this.fuseText.setFill('#ff6b35');
                this.sprite.setFillStyle(0xd35400);
            }
            
            timeLeft--;
            
            if (timeLeft >= 0) {
                this.scene.time.delayedCall(1000, updateTimer);
            }
        };
        
        updateTimer();
        
        // Explode after fuse time
        this.scene.time.delayedCall(this.fuseTime, () => {
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
        
        // Create explosion areas in 4 directions
        const directions = [
            { x: 1, y: 0 },   // Right
            { x: -1, y: 0 },  // Left
            { x: 0, y: 1 },   // Down
            { x: 0, y: -1 }   // Up
        ];
        
        const gridSize = 64;
        const explosionAreas = [{ x: explosionX, y: explosionY }]; // Center explosion
        
        directions.forEach(dir => {
            for (let i = 1; i <= this.power; i++) {
                const checkX = explosionX + (dir.x * gridSize * i);
                const checkY = explosionY + (dir.y * gridSize * i);
                
                // Check bounds
                if (checkX < 50 || checkX > this.scene.game.config.width - 50 ||
                    checkY < 50 || checkY > this.scene.game.config.height - 50) {
                    break;
                }
                
                // Check for destructible blocks (safe array iteration)
                let blocked = false;
                const blocksToDestroy = [];
                
                this.scene.destructibleBlocks.forEach(block => {
                    if (Math.abs(block.x - checkX) < 32 && Math.abs(block.y - checkY) < 32) {
                        blocksToDestroy.push(block);
                        blocked = true;
                    }
                });
                
                // Safely destroy blocks and spawn power-ups
                blocksToDestroy.forEach(block => {
                    block.destroy();
                    this.scene.destructibleBlocks = this.scene.destructibleBlocks.filter(b => b !== block);
                    
                    // Chance to spawn power-up
                    if (Math.random() < 0.3) {
                        const powerUpTypes = ['speed', 'bombs', 'power', 'health'];
                        const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        const powerUp = new PowerUp(this.scene, checkX, checkY, powerUpType);
                        this.scene.powerUps.push(powerUp);
                    }
                });
                
                if (!blocked) {
                    explosionAreas.push({ x: checkX, y: checkY });
                    this.createExplosionEffect(checkX, checkY, 0.7);
                }
            }
        });
        
        // Damage players in explosion areas
        explosionAreas.forEach(area => {
            this.scene.players.forEach(player => {
                if (!player.isAlive) return;
                
                const distance = Phaser.Math.Distance.Between(
                    player.sprite.x, player.sprite.y,
                    area.x, area.y
                );
                
                if (distance < 40) {
                    player.takeDamage(50);
                }
            });
            
            // Chain reaction with other bombs (with protection against infinite loops)  
            if (this.scene.bombs) {
                this.scene.bombs.forEach(otherBomb => {
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
    
    createExplosionEffect(x, y, scale = 1) {
        // Create explosion circle
        const explosion = this.scene.add.circle(x, y, 30 * scale, 0xff6b35);
        explosion.setAlpha(0.8);
        
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
        
        // Play explosion sound (if you add audio later)
        // this.scene.sound.play('explosion');
    }
    
    destroy() {
        // Kill any running tweens
        if (this.pulseTween) {
            this.pulseTween.destroy();
            this.pulseTween = null;
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