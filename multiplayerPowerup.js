class MultiplayerPowerUp {
    constructor(scene, powerUpData) {
        this.scene = scene;
        this.id = powerUpData.id;
        this.type = powerUpData.type;
        this.x = powerUpData.x;
        this.y = powerUpData.y;
        this.collected = false;
        
        // Power-up configurations
        this.config = {
            speed: { color: 0x3498db, symbol: 'S', name: 'Speed Boost' },
            bombs: { color: 0xe74c3c, symbol: 'B', name: 'Extra Bomb' },
            power: { color: 0xf39c12, symbol: 'P', name: 'Bomb Power' },
            health: { color: 0x2ecc71, symbol: 'H', name: 'Health Pack' }
        };
        
        const config = this.config[this.type];
        
        // Create power-up sprite
        this.sprite = scene.add.circle(this.x, this.y, 20, config.color);
        this.sprite.setStrokeStyle(2, 0xffffff);
        this.sprite.setAlpha(0.9);
        
        // Add symbol text
        this.symbolText = scene.add.text(this.x, this.y, config.symbol, {
            fontSize: '18px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Add physics sensor
        scene.matter.add.gameObject(this.sprite, {
            shape: 'circle',
            isSensor: true,
            isStatic: true
        });
        
        this.sprite.powerUp = this;
        
        // Floating animation
        this.floatTween = scene.tweens.add({
            targets: [this.sprite, this.symbolText],
            y: this.y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Glow effect
        this.glowTween = scene.tweens.add({
            targets: this.sprite,
            alpha: 0.6,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Spawn effect
        this.createSpawnEffect();
    }
    
    createSpawnEffect() {
        const spawnEffect = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0xffffff);
        spawnEffect.setAlpha(0.5);
        
        this.scene.tweens.add({
            targets: spawnEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                spawnEffect.destroy();
            }
        });
    }
    
    checkCollision(player) {
        if (this.collected || !player.isAlive) return;
        
        // Critical null checks to prevent crashes
        if (!this.sprite || !player.sprite) return;
        if (this.sprite.x === undefined || this.sprite.y === undefined) return;
        if (player.sprite.x === undefined || player.sprite.y === undefined) return;
        
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            player.sprite.x, player.sprite.y
        );
        
        if (distance < 35) {
            this.collect(player);
        }
    }
    
    collect(player) {
        if (this.collected) return;
        this.collected = true;
        
        // Stop any running animations and timers FIRST
        if (this.floatTween) {
            this.floatTween.destroy();
            this.floatTween = null;
        }
        if (this.glowTween) {
            this.glowTween.destroy();
            this.glowTween = null;
        }
        
        // Send collection to server
        if (networkManager && networkManager.isConnected) {
            networkManager.collectPowerUp(this.id);
        }
        
        // Create collection effect
        this.createCollectionEffect(player);
        
        // Show power-up message
        this.showPowerUpMessage(player);
        
        // Destroy the power-up
        this.destroy();
    }
    
    createCollectionEffect(player) {
        const config = this.config[this.type];
        
        // Create collection particles
        const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, 'spark', {
            speed: { min: 30, max: 80 },
            scale: { start: 0.2, end: 0 },
            lifespan: 200,
            quantity: 8,
            tint: config.color
        });
        
        // Move particles toward player
        this.scene.tweens.add({
            targets: particles,
            x: player.sprite.x,
            y: player.sprite.y,
            duration: 200,
            onComplete: () => {
                particles.destroy();
            }
        });
        
        // Player flash effect
        if (player.sprite) {
            const originalColor = player.color;
            player.sprite.setFillStyle(config.color);
            
            this.scene.time.delayedCall(100, () => {
                if (player.sprite) {
                    player.sprite.setFillStyle(originalColor);
                }
            });
        }
    }
    
    showPowerUpMessage(player) {
        const config = this.config[this.type];
        
        // Create floating text
        const messageText = this.scene.add.text(
            player.sprite.x, 
            player.sprite.y - 40, 
            config.name, 
            {
                fontSize: '14px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: { x: 8, y: 4 }
            }
        ).setOrigin(0.5);
        
        // Animate the message
        this.scene.tweens.add({
            targets: messageText,
            y: messageText.y - 30,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                messageText.destroy();
            }
        });
    }
    
    destroy() {
        // Kill any running tweens and timers
        if (this.floatTween) {
            this.floatTween.destroy();
            this.floatTween = null;
        }
        if (this.glowTween) {
            this.glowTween.destroy();
            this.glowTween = null;
        }
        
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.symbolText && this.symbolText.active) {
            this.symbolText.destroy();
            this.symbolText = null;
        }
        
        this.collected = true; // Mark as collected to prevent further processing
    }
}