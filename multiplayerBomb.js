class MultiplayerBomb {
    constructor(scene, bombData) {
        this.scene = scene;
        this.id = bombData.id;
        this.x = bombData.x;
        this.y = bombData.y;
        this.owner = bombData.owner;
        this.power = bombData.power;
        this.fuseTime = 3000;
        this.exploded = false;
        this.placedAt = bombData.placedAt || Date.now();
        
        // Create bomb sprite
        this.sprite = scene.add.circle(this.x, this.y, 16, 0x2c3e50);
        this.sprite.setStrokeStyle(2, 0x34495e);
        
        // Add physics
        scene.matter.add.gameObject(this.sprite, {
            shape: 'circle',
            isStatic: true,
            isSensor: false
        });
        
        // Calculate remaining time
        const elapsed = Date.now() - this.placedAt;
        const remainingTime = Math.max(0, this.fuseTime - elapsed);
        
        // Add fuse animation
        this.fuseText = scene.add.text(this.x, this.y - 30, Math.ceil(remainingTime / 1000).toString(), {
            fontSize: '20px',
            fill: '#e74c3c',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Start countdown with remaining time
        this.startCountdown(remainingTime);
        
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
    
    startCountdown(remainingTime = this.fuseTime) {
        let timeLeft = Math.ceil(remainingTime / 1000);
        
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
        
        // Note: Explosion will be handled by server, not client
    }
    
    explode(explosionData) {
        if (this.exploded) return;
        this.exploded = true;
        
        // IMPORTANT: Stop the tween BEFORE accessing sprite properties
        if (this.pulseTween) {
            this.pulseTween.destroy();
            this.pulseTween = null;
        }
        
        const explosionX = this.sprite.x;
        const explosionY = this.sprite.y;
        
        // Create explosion effects based on server data
        if (explosionData && explosionData.explosionAreas) {
            explosionData.explosionAreas.forEach((area, index) => {
                const scale = index === 0 ? 1 : 0.7; // Center explosion is larger
                this.createExplosionEffect(area.x, area.y, scale);
            });
        } else {
            // Fallback single explosion
            this.createExplosionEffect(explosionX, explosionY);
        }
        
        // Remove bomb from scene
        this.destroy();
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
        
        // Remove particles after animation
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
        
        // Screen shake
        this.scene.cameras.main.shake(200, 0.01);
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