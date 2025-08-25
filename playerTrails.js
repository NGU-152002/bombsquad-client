class PlayerTrailManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.enabled = true;
        this.trailType = 'sparkle'; // Default trail
        this.intensity = 'normal'; // minimal, normal, maximum
        this.maxTrailLength = 20;
        this.trailPositions = [];
        this.lastPosition = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.speed = 0;
        
        // Trail effect instances
        this.activeEffects = [];
        this.trailElements = [];
        
        // Performance settings
        this.updateInterval = 50; // ms
        this.lastUpdate = 0;
        
        // Color settings
        this.usePlayerColor = true;
        this.customColor = null;
        this.rainbowMode = false;
        this.colorHue = 0;
        
        this.initializeTrail();
    }
    
    initializeTrail() {
        // Initialize based on trail type
        switch (this.trailType) {
            case 'sparkle':
                this.initializeSparkleTrail();
                break;
            case 'neon':
                this.initializeNeonTrail();
                break;
            case 'fire':
                this.initializeFireTrail();
                break;
            case 'lightning':
                this.initializeLightningTrail();
                break;
            case 'rainbow':
                this.initializeRainbowTrail();
                break;
            case 'shadow':
                this.initializeShadowTrail();
                break;
            case 'plasma':
                this.initializePlasmaTrail();
                break;
        }
    }
    
    update(time, delta) {
        if (!this.enabled || !this.player.sprite) return;
        
        // Throttle updates for performance
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;
        
        // Calculate velocity and speed
        const currentPos = { x: this.player.sprite.x, y: this.player.sprite.y };
        this.velocity.x = currentPos.x - this.lastPosition.x;
        this.velocity.y = currentPos.y - this.lastPosition.y;
        this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        
        // Only add trail if player is moving
        if (this.speed > 0.5) {
            this.addTrailPosition(currentPos);
            this.updateTrailEffect(time, delta);
        }
        
        this.lastPosition = { ...currentPos };
        
        // Update rainbow color cycling
        if (this.rainbowMode) {
            this.colorHue = (this.colorHue + 2) % 360;
        }
        
        this.cleanupOldTrails();
    }
    
    addTrailPosition(position) {
        this.trailPositions.push({
            x: position.x,
            y: position.y,
            time: Date.now(),
            velocity: { ...this.velocity },
            speed: this.speed
        });
        
        // Keep trail length manageable
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.shift();
        }
    }
    
    updateTrailEffect(time, delta) {
        switch (this.trailType) {
            case 'sparkle':
                this.updateSparkleTrail(time, delta);
                break;
            case 'neon':
                this.updateNeonTrail(time, delta);
                break;
            case 'fire':
                this.updateFireTrail(time, delta);
                break;
            case 'lightning':
                this.updateLightningTrail(time, delta);
                break;
            case 'rainbow':
                this.updateRainbowTrail(time, delta);
                break;
            case 'shadow':
                this.updateShadowTrail(time, delta);
                break;
            case 'plasma':
                this.updatePlasmaTrail(time, delta);
                break;
        }
    }
    
    // Sparkle Trail Implementation
    initializeSparkleTrail() {
        this.sparkleParticles = null;
    }
    
    updateSparkleTrail(time, delta) {
        if (this.speed > 0.5) {
            const intensity = this.getIntensityMultiplier();
            const color = this.getCurrentColor();
            
            // Create sparkle particles at current position
            const sparkles = this.scene.add.particles(this.player.sprite.x, this.player.sprite.y, 'spark', {
                speed: { min: 10, max: 30 * intensity },
                scale: { start: 0.2 * intensity, end: 0 },
                lifespan: 300 + (200 * intensity),
                quantity: Math.floor(2 * intensity),
                tint: color,
                alpha: { start: 0.8, end: 0 },
                blendMode: 'ADD'
            });
            
            this.activeEffects.push(sparkles);
            
            // Auto-cleanup sparkles
            this.scene.time.delayedCall(500, () => {
                if (sparkles) {
                    sparkles.destroy();
                    const index = this.activeEffects.indexOf(sparkles);
                    if (index > -1) this.activeEffects.splice(index, 1);
                }
            });
        }
    }
    
    // Neon Glow Trail Implementation
    initializeNeonTrail() {
        this.neonSegments = [];
    }
    
    updateNeonTrail(time, delta) {
        if (this.speed > 0.5) {
            const intensity = this.getIntensityMultiplier();
            const color = this.getCurrentColor();
            
            // Create neon rectangle at current position
            const segment = this.scene.add.rectangle(
                this.player.sprite.x, 
                this.player.sprite.y, 
                32 * intensity, 
                32 * intensity, 
                color
            );
            
            segment.setAlpha(0.4 * intensity);
            segment.setStrokeStyle(2, color);
            segment.setBlendMode('ADD');
            
            this.neonSegments.push(segment);
            this.trailElements.push(segment);
            
            // Fade out effect
            this.scene.tweens.add({
                targets: segment,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    segment.destroy();
                    const index = this.neonSegments.indexOf(segment);
                    if (index > -1) this.neonSegments.splice(index, 1);
                }
            });
        }
    }
    
    // Fire Trail Implementation
    initializeFireTrail() {
        this.fireParticles = [];
    }
    
    updateFireTrail(time, delta) {
        if (this.speed > 0.5) {
            const intensity = this.getIntensityMultiplier();
            
            // Create fire particles
            const fire = this.scene.add.particles(this.player.sprite.x, this.player.sprite.y, 'spark', {
                speed: { min: 20, max: 50 * intensity },
                scale: { start: 0.3 * intensity, end: 0.1 },
                lifespan: 400 + (300 * intensity),
                quantity: Math.floor(3 * intensity),
                tint: [0xff4500, 0xff6600, 0xff8800, 0xffaa00],
                alpha: { start: 0.8, end: 0 },
                gravityY: -20,
                emitZone: {
                    type: 'random',
                    source: new Phaser.Geom.Circle(0, 0, 8)
                }
            });
            
            this.fireParticles.push(fire);
            this.activeEffects.push(fire);
            
            // Auto-cleanup
            this.scene.time.delayedCall(700, () => {
                if (fire) {
                    fire.destroy();
                    const index = this.fireParticles.indexOf(fire);
                    if (index > -1) this.fireParticles.splice(index, 1);
                }
            });
        }
    }
    
    // Lightning Trail Implementation
    initializeLightningTrail() {
        this.lightningBolts = [];
    }
    
    updateLightningTrail(time, delta) {
        if (this.speed > 1 && Math.random() < 0.3) {
            const intensity = this.getIntensityMultiplier();
            
            // Create lightning effect
            const lightning = this.scene.add.particles(this.player.sprite.x, this.player.sprite.y, 'spark', {
                speed: { min: 80, max: 150 * intensity },
                scale: { start: 0.15, end: 0.05 },
                lifespan: 100 + (50 * intensity),
                quantity: Math.floor(5 * intensity),
                tint: [0x00ffff, 0x0080ff, 0x4080ff],
                alpha: { start: 1, end: 0 },
                blendMode: 'ADD',
                emitZone: {
                    type: 'edge',
                    source: new Phaser.Geom.Line(-16, -16, 16, 16),
                    quantity: Math.floor(8 * intensity)
                }
            });
            
            this.lightningBolts.push(lightning);
            this.activeEffects.push(lightning);
            
            // Screen flash effect for high intensity
            if (intensity > 1.5) {
                this.scene.cameras.main.flash(50, 200, 200, 255, false);
            }
            
            // Auto-cleanup
            this.scene.time.delayedCall(200, () => {
                if (lightning) {
                    lightning.destroy();
                    const index = this.lightningBolts.indexOf(lightning);
                    if (index > -1) this.lightningBolts.splice(index, 1);
                }
            });
        }
    }
    
    // Rainbow Trail Implementation
    initializeRainbowTrail() {
        this.rainbowMode = true;
        this.rainbowSegments = [];
    }
    
    updateRainbowTrail(time, delta) {
        if (this.speed > 0.5) {
            const intensity = this.getIntensityMultiplier();
            
            // Create rainbow arc effect
            for (let i = 0; i < Math.floor(5 * intensity); i++) {
                const hue = (this.colorHue + i * 60) % 360;
                const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1).color;
                
                const segment = this.scene.add.circle(
                    this.player.sprite.x + (Math.random() - 0.5) * 20,
                    this.player.sprite.y + (Math.random() - 0.5) * 20,
                    4 * intensity,
                    color
                );
                
                segment.setAlpha(0.7);
                this.rainbowSegments.push(segment);
                this.trailElements.push(segment);
                
                // Fade out
                this.scene.tweens.add({
                    targets: segment,
                    alpha: 0,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => segment.destroy()
                });
            }
        }
    }
    
    // Shadow Trail Implementation
    initializeShadowTrail() {
        this.shadowClones = [];
        this.maxShadows = 5;
    }
    
    updateShadowTrail(time, delta) {
        if (this.speed > 0.5) {
            // Create shadow clone
            const shadow = this.scene.add.rectangle(
                this.player.sprite.x,
                this.player.sprite.y,
                32, 32,
                0x000000
            );
            
            shadow.setAlpha(0.3);
            shadow.setBlendMode('MULTIPLY');
            this.shadowClones.push(shadow);
            this.trailElements.push(shadow);
            
            // Limit number of shadows
            if (this.shadowClones.length > this.maxShadows) {
                const oldShadow = this.shadowClones.shift();
                if (oldShadow) oldShadow.destroy();
            }
            
            // Fade out shadow
            this.scene.tweens.add({
                targets: shadow,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    shadow.destroy();
                    const index = this.shadowClones.indexOf(shadow);
                    if (index > -1) this.shadowClones.splice(index, 1);
                }
            });
        }
    }
    
    // Plasma Trail Implementation
    initializePlasmaTrail() {
        this.plasmaStream = null;
    }
    
    updatePlasmaTrail(time, delta) {
        if (this.speed > 0.5) {
            const intensity = this.getIntensityMultiplier();
            const color = this.getCurrentColor();
            
            // Create plasma stream
            const plasma = this.scene.add.particles(this.player.sprite.x, this.player.sprite.y, 'spark', {
                speed: { min: 5, max: 20 * intensity },
                scale: { start: 0.4 * intensity, end: 0.1 },
                lifespan: 600 + (400 * intensity),
                quantity: Math.floor(4 * intensity),
                tint: [color, Phaser.Display.Color.Interpolate.ColorWithColor(color, 0xffffff, 255, 0.3)],
                alpha: { start: 0.9, end: 0 },
                blendMode: 'ADD',
                follow: this.player.sprite,
                followOffset: { x: -this.velocity.x * 2, y: -this.velocity.y * 2 }
            });
            
            this.activeEffects.push(plasma);
            
            // Auto-cleanup
            this.scene.time.delayedCall(800, () => {
                if (plasma) {
                    plasma.destroy();
                    const index = this.activeEffects.indexOf(plasma);
                    if (index > -1) this.activeEffects.splice(index, 1);
                }
            });
        }
    }
    
    // Utility Methods
    getCurrentColor() {
        if (this.rainbowMode) {
            return Phaser.Display.Color.HSVToRGB(this.colorHue / 360, 1, 1).color;
        } else if (this.customColor) {
            return this.customColor;
        } else if (this.usePlayerColor) {
            return this.player.color;
        } else {
            return 0xffffff;
        }
    }
    
    getIntensityMultiplier() {
        const baseMultiplier = {
            'minimal': 0.5,
            'normal': 1.0,
            'maximum': 1.2
        }[this.intensity] || 1.0;
        
        // Scale with speed for dynamic effect
        const speedMultiplier = Math.min(this.speed / 5, 2);
        
        return baseMultiplier * speedMultiplier;
    }
    
    cleanupOldTrails() {
        const now = Date.now();
        this.trailPositions = this.trailPositions.filter(pos => now - pos.time < 2000);
    }
    
    // Configuration Methods
    setTrailType(type) {
        this.destroy(); // Clean up current trail
        this.trailType = type;
        this.rainbowMode = false;
        this.initializeTrail();
    }
    
    setIntensity(intensity) {
        this.intensity = intensity;
        this.maxTrailLength = {
            'minimal': 10,
            'normal': 20,
            'maximum': 40
        }[intensity] || 20;
    }
    
    setCustomColor(color) {
        this.usePlayerColor = false;
        this.customColor = color;
        this.rainbowMode = false;
    }
    
    enableRainbowMode() {
        this.rainbowMode = true;
        this.usePlayerColor = false;
        this.customColor = null;
    }
    
    disable() {
        this.enabled = false;
        this.destroy();
    }
    
    enable() {
        this.enabled = true;
        this.initializeTrail();
    }
    
    destroy() {
        // Clean up all active effects
        this.activeEffects.forEach(effect => {
            if (effect && effect.destroy) {
                effect.destroy();
            }
        });
        this.activeEffects = [];
        
        // Clean up all trail elements
        this.trailElements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.trailElements = [];
        
        // Clean up specific trail arrays
        this.neonSegments = [];
        this.fireParticles = [];
        this.lightningBolts = [];
        this.rainbowSegments = [];
        this.shadowClones = [];
        
        this.trailPositions = [];
    }
}

// Global trail configuration
class TrailConfig {
    static trailTypes = [
        { id: 'sparkle', name: 'Sparkle Trail', description: 'Glittering particles' },
        { id: 'neon', name: 'Neon Glow', description: 'Glowing geometric shapes' },
        { id: 'fire', name: 'Fire Trail', description: 'Burning flame effect' },
        { id: 'lightning', name: 'Lightning Trail', description: 'Electric sparks' },
        { id: 'rainbow', name: 'Rainbow Bridge', description: 'Multi-colored arc' },
        { id: 'shadow', name: 'Shadow Clone', description: 'Dark silhouettes' },
        { id: 'plasma', name: 'Plasma Stream', description: 'Flowing energy ribbon' }
    ];
    
    static intensityLevels = [
        { id: 'minimal', name: 'Minimal', description: 'Subtle effects' },
        { id: 'normal', name: 'Normal', description: 'Balanced visual impact' },
        { id: 'maximum', name: 'Maximum', description: 'Spectacular display' }
    ];
    
    static getRandomTrailType() {
        return this.trailTypes[Math.floor(Math.random() * this.trailTypes.length)].id;
    }
}