class CameraZoomManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Zoom settings (SIMPLIFIED)
        this.baseZoom = 1.1;           // Slightly zoomed in when stationary (player visible)
        this.movementZoom = 0.7;       // Zoom out when moving (full map view)
        this.fastMovementZoom = 0.7;   // Same as movement zoom - simplified
        this.currentZoom = this.baseZoom;
        this.targetZoom = this.baseZoom;
        
        // Movement detection
        this.movementThreshold = 1.0;     // Minimum speed to trigger zoom
        this.fastMovementThreshold = 4.0; // Speed for maximum zoom out
        this.isAnyPlayerMoving = false;
        this.averagePlayerSpeed = 0;
        
        // Smooth transition settings
        this.zoomTransitionSpeed = 0.05;  // How fast zoom changes (lower = smoother)
        this.smoothingFactor = 0.1;       // Speed smoothing
        
        // Timing
        this.lastMovementTime = 0;
        this.movementStopDelay = 500;     // ms to wait before zooming back in
        this.lastUpdate = 0;
        this.updateInterval = 50;         // Update every 50ms for performance
        
        // Enhanced zoom effects (adjusted for reversed logic)
        this.combatZoom = 0.7;            // Zoom out during combat for better view
        this.explosionZoom = 0.5;         // Maximum zoom out during explosions
        this.isCombatActive = false;
        this.explosionZoomTimer = 0;
        
        // Multi-player considerations
        this.playerSpeeds = [];
        this.playerPositions = [];
        this.boundingBoxPadding = 100;
        
        // Initialize
        this.camera.setZoom(this.baseZoom);
    }
    
    update(time, delta) {
        // Throttle updates for performance
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;
        
        // Calculate player movement data
        this.updatePlayerMovementData();
        
        // Determine target zoom based on game state
        this.calculateTargetZoom(time);
        
        // Smooth zoom transition
        this.updateCameraZoom(delta);
        
        // Update camera position for better framing
        this.updateCameraPosition();
    }
    
    updatePlayerMovementData() {
        if (!this.scene.players || this.scene.players.length === 0) return;
        
        const alivePlayers = this.scene.players.filter(p => p && p.isAlive && p.sprite);
        if (alivePlayers.length === 0) return;
        
        this.playerSpeeds = [];
        this.playerPositions = [];
        let totalSpeed = 0;
        let movingPlayers = 0;
        
        alivePlayers.forEach(player => {
            // For continuous movement, get actual velocity
            const velocityX = player.sprite.body ? player.sprite.body.velocity.x : 0;
            const velocityY = player.sprite.body ? player.sprite.body.velocity.y : 0;
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            
            this.playerSpeeds.push(speed);
            this.playerPositions.push({ x: player.sprite.x, y: player.sprite.y });
            totalSpeed += speed;
            
            if (speed > this.movementThreshold) {
                movingPlayers++;
            }
        });
        
        this.averagePlayerSpeed = alivePlayers.length > 0 ? totalSpeed / alivePlayers.length : 0;
        this.isAnyPlayerMoving = movingPlayers > 0;
        
        // Update movement time whenever any player is detected as moving
        if (this.isAnyPlayerMoving) {
            this.lastMovementTime = Date.now();
        }
    }
    
    calculateTargetZoom(time) {
        let newTargetZoom = this.baseZoom;
        
        // Handle explosion zoom (highest priority)
        if (this.explosionZoomTimer > 0) {
            newTargetZoom = this.explosionZoom;
            this.explosionZoomTimer -= 50; // Decay timer
            this.targetZoom = newTargetZoom;
            return;
        }
        
        // Check if movement has recently stopped
        const timeSinceMovement = Date.now() - this.lastMovementTime;
        const shouldZoomForMovement = this.isAnyPlayerMoving || timeSinceMovement < this.movementStopDelay;
        
        if (shouldZoomForMovement) {
            // Calculate zoom based on average movement speed
            const speedRatio = Math.min(this.averagePlayerSpeed / this.fastMovementThreshold, 1);
            
            if (this.isCombatActive) {
                // Combat zoom (weapons firing, explosions nearby)
                newTargetZoom = this.combatZoom;
            } else if (this.averagePlayerSpeed > this.fastMovementThreshold) {
                // Fast movement zoom
                newTargetZoom = this.fastMovementZoom;
            } else if (this.averagePlayerSpeed > this.movementThreshold) {
                // Regular movement zoom - interpolate between base and movement zoom
                const zoomDiff = this.baseZoom - this.movementZoom;
                newTargetZoom = this.baseZoom - (zoomDiff * speedRatio);
            }
        } else {
            // No movement - return to base zoom
            newTargetZoom = this.baseZoom;
        }
        
        // Smooth target zoom changes to avoid jittery behavior
        this.targetZoom += (newTargetZoom - this.targetZoom) * this.smoothingFactor;
    }
    
    updateCameraZoom(delta) {
        // Smooth zoom transition
        const zoomDiff = this.targetZoom - this.currentZoom;
        
        if (Math.abs(zoomDiff) > 0.001) {
            this.currentZoom += zoomDiff * this.zoomTransitionSpeed;
            this.camera.setZoom(this.currentZoom);
        }
    }
    
    updateCameraPosition() {
        if (!this.scene.players || this.scene.players.length === 0) return;
        
        const alivePlayers = this.scene.players.filter(p => p && p.isAlive && p.sprite);
        if (alivePlayers.length === 0) return;
        
        // Calculate center point of all alive players
        let centerX = 0;
        let centerY = 0;
        
        alivePlayers.forEach(player => {
            centerX += player.sprite.x;
            centerY += player.sprite.y;
        });
        
        centerX /= alivePlayers.length;
        centerY /= alivePlayers.length;
        
        // Improved camera centering with smoother following
        const followSpeed = 0.12; // Increased for more responsive centering
        
        // Use lerp for smoother camera movement
        const currentCenterX = this.camera.scrollX + this.camera.width / 2;
        const currentCenterY = this.camera.scrollY + this.camera.height / 2;
        
        const targetCenterX = centerX;
        const targetCenterY = centerY;
        
        // Smooth interpolation to target position
        const newCenterX = Phaser.Math.Linear(currentCenterX, targetCenterX, followSpeed);
        const newCenterY = Phaser.Math.Linear(currentCenterY, targetCenterY, followSpeed);
        
        // Center camera directly on the calculated position
        this.camera.centerOn(newCenterX, newCenterY);
    }
    
    // Special effect triggers
    triggerExplosionZoom(intensity = 1.0) {
        this.explosionZoomTimer = 800 * intensity; // Duration based on intensity
        const zoomAmount = 0.1 * intensity;
        this.explosionZoom = Math.max(0.4, this.baseZoom - zoomAmount);
    }
    
    setCombatMode(active) {
        this.isCombatActive = active;
    }
    
    // Manual zoom controls (for power-ups or special events)
    setTemporaryZoom(zoom, duration) {
        const originalTarget = this.targetZoom;
        this.targetZoom = zoom;
        
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                this.targetZoom = originalTarget;
            });
        }
    }
    
    
    // Configuration methods
    setZoomLevels(base, movement, fastMovement) {
        this.baseZoom = base;
        this.movementZoom = movement;
        this.fastMovementZoom = fastMovement;
    }
    
    setTransitionSpeed(speed) {
        this.zoomTransitionSpeed = Math.max(0.01, Math.min(0.2, speed));
    }
    
    setMovementThresholds(normal, fast) {
        this.movementThreshold = normal;
        this.fastMovementThreshold = fast;
    }
    
    // Reset to default state
    reset() {
        this.currentZoom = this.baseZoom;
        this.targetZoom = this.baseZoom;
        this.camera.setZoom(this.baseZoom);
        this.isCombatActive = false;
        this.explosionZoomTimer = 0;
        this.lastMovementTime = 0;
    }
    
    // Debug information
    getZoomInfo() {
        return {
            currentZoom: this.currentZoom.toFixed(3),
            targetZoom: this.targetZoom.toFixed(3),
            averageSpeed: this.averagePlayerSpeed.toFixed(2),
            isMoving: this.isAnyPlayerMoving,
            isCombat: this.isCombatActive,
            explosionTimer: this.explosionZoomTimer
        };
    }
}

