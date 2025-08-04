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
    }
    
    setupControls() {
        const cursors = this.scene.input.keyboard.createCursorKeys();
        const wasd = this.scene.input.keyboard.addKeys('W,S,A,D,SPACE');
        const ijkl = this.scene.input.keyboard.addKeys('I,K,J,L,U');
        const numpad = this.scene.input.keyboard.addKeys('NUMPAD_EIGHT,NUMPAD_FIVE,NUMPAD_FOUR,NUMPAD_SIX,NUMPAD_ZERO');
        
        switch(this.playerId) {
            case 1:
                this.keys = {
                    up: wasd.W,
                    down: wasd.S,
                    left: wasd.A,
                    right: wasd.D,
                    bomb: wasd.SPACE
                };
                break;
            case 2:
                this.keys = {
                    up: cursors.up,
                    down: cursors.down,
                    left: cursors.left,
                    right: cursors.right,
                    bomb: this.scene.input.keyboard.addKey('ENTER')
                };
                break;
            case 3:
                this.keys = {
                    up: ijkl.I,
                    down: ijkl.K,
                    left: ijkl.J,
                    right: ijkl.L,
                    bomb: ijkl.U
                };
                break;
            case 4:
                this.keys = {
                    up: numpad.NUMPAD_EIGHT,
                    down: numpad.NUMPAD_FIVE,
                    left: numpad.NUMPAD_FOUR,
                    right: numpad.NUMPAD_SIX,
                    bomb: numpad.NUMPAD_ZERO
                };
                break;
        }
    }
    
    update() {
        if (!this.isAlive || !this.sprite) return;
        
        // Handle movement
        let velocityX = 0;
        let velocityY = 0;
        
        if (this.keys.left.isDown) {
            velocityX = -this.speed * this.powerUps.speed;
        } else if (this.keys.right.isDown) {
            velocityX = this.speed * this.powerUps.speed;
        }
        
        if (this.keys.up.isDown) {
            velocityY = -this.speed * this.powerUps.speed;
        } else if (this.keys.down.isDown) {
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
        
        // Handle bomb placement
        if (Phaser.Input.Keyboard.JustDown(this.keys.bomb)) {
            this.placeBomb();
        }
        
        // Update player text position
        if (this.playerText && this.sprite) {
            this.playerText.setPosition(this.sprite.x, this.sprite.y);
        }
        
        // Update UI
        this.updateUI();
        
        // Handle invulnerability
        if (this.sprite) {
            if (this.invulnerable) {
                this.sprite.alpha = Math.sin(this.scene.time.now * 0.01) * 0.5 + 0.5;
            } else {
                this.sprite.alpha = 1;
            }
        }
    }
    
    placeBomb() {
        if (this.bombCount >= this.bombCapacity) return;
        
        // Snap to grid
        const gridSize = 64;
        const bombX = Math.round(this.sprite.x / gridSize) * gridSize;
        const bombY = Math.round(this.sprite.y / gridSize) * gridSize;
        
        // Check if there's already a bomb at this position
        let bombExists = false;
        this.scene.bombs.forEach(bomb => {
            if (Math.abs(bomb.sprite.x - bombX) < 32 && Math.abs(bomb.sprite.y - bombY) < 32) {
                bombExists = true;
            }
        });
        
        if (bombExists) return;
        
        const bomb = new Bomb(this.scene, bombX, bombY, this, this.bombPower);
        this.scene.bombs.push(bomb);
        this.bombCount++;
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
    
    onBombExploded() {
        this.bombCount--;
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
    }
}