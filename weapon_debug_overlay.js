// Weapon Debug Overlay - Add this to multiplayer.html for visual debugging
class WeaponDebugOverlay {
    constructor() {
        this.createOverlay();
        this.setupKeyListeners();
        this.startStatusUpdater();
    }
    
    createOverlay() {
        // Create debug overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'weapon-debug-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            min-width: 200px;
            border: 2px solid #3498db;
        `;
        
        this.overlay.innerHTML = `
            <div style="color: #3498db; font-weight: bold; margin-bottom: 10px;">WEAPON DEBUG</div>
            <div id="debug-keys">Keys: None pressed</div>
            <div id="debug-weapon">Weapon: Checking...</div>
            <div id="debug-player">Player: Not found</div>
            <div id="debug-scene">Scene: Not ready</div>
            <div style="margin-top: 10px;">
                <button onclick="window.checkWeaponStatus()" style="background: #27ae60; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 10px;">Check Status</button>
                <button onclick="window.forceEquipWeapon('grenade')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px; font-size: 10px;">Force Equip</button>
            </div>
            <div style="margin-top: 5px;">
                <button onclick="window.testWeaponCycle()" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 10px;">Test Cycle</button>
                <button onclick="window.testWeaponFire()" style="background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px; font-size: 10px;">Test Fire</button>
            </div>
            <div style="margin-top: 5px;">
                <button onclick="window.forceCreateWeaponSystem()" style="background: #9b59b6; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 10px;">Force Create</button>
                <button onclick="window.debugAllPlayers()" style="background: #34495e; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px; font-size: 10px;">Debug All</button>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    setupKeyListeners() {
        let pressedKeys = new Set();
        
        document.addEventListener('keydown', (event) => {
            pressedKeys.add(event.code);
            this.updateKeyDisplay(pressedKeys);
            
            // Log all key presses for debugging
            console.log(`🎹 Key pressed: ${event.code} (${event.key})`);
            
            if (event.code === 'KeyQ') {
                this.flashMessage('Q KEY DETECTED!', '#00ff00');
            } else if (event.code === 'Space') {
                this.flashMessage('SPACE KEY DETECTED!', '#ff6600');
            } else if (event.code === 'KeyE') {
                this.flashMessage('E KEY DETECTED!', '#ffff00');
            }
        });
        
        document.addEventListener('keyup', (event) => {
            pressedKeys.delete(event.code);
            this.updateKeyDisplay(pressedKeys);
        });
    }
    
    updateKeyDisplay(pressedKeys) {
        const keysElement = document.getElementById('debug-keys');
        if (keysElement) {
            if (pressedKeys.size === 0) {
                keysElement.textContent = 'Keys: None pressed';
                keysElement.style.color = '#999';
            } else {
                keysElement.textContent = `Keys: ${Array.from(pressedKeys).join(', ')}`;
                keysElement.style.color = '#00ff00';
            }
        }
    }
    
    flashMessage(message, color) {
        // Create flash message
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${color};
            color: black;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            animation: flashAnimation 1s ease-out;
        `;
        flash.textContent = message;
        
        // Add CSS animation
        if (!document.getElementById('flash-animation-style')) {
            const style = document.createElement('style');
            style.id = 'flash-animation-style';
            style.textContent = `
                @keyframes flashAnimation {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(flash);
        
        // Remove after animation
        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 1000);
    }
    
    startStatusUpdater() {
        setInterval(() => {
            this.updateStatus();
        }, 1000);
    }
    
    updateStatus() {
        // Update weapon status
        const weaponElement = document.getElementById('debug-weapon');
        const playerElement = document.getElementById('debug-player');
        const sceneElement = document.getElementById('debug-scene');
        
        if (typeof multiplayerPlayers !== 'undefined' && typeof localPlayerId !== 'undefined') {
            const localPlayer = multiplayerPlayers.get(localPlayerId);
            
            if (localPlayer) {
                playerElement.textContent = `Player: Found (ID: ${localPlayerId})`;
                playerElement.style.color = '#00ff00';
                
                if (localPlayer.scene) {
                    sceneElement.textContent = 'Scene: Ready';
                    sceneElement.style.color = '#00ff00';
                } else {
                    sceneElement.textContent = 'Scene: Not ready';
                    sceneElement.style.color = '#ff6600';
                }
                
                // Check weapon system and current weapon
                if (localPlayer.weaponSystem) {
                    const currentWeapon = localPlayer.weaponSystem.getCurrentWeapon();
                    if (currentWeapon) {
                        weaponElement.textContent = `Weapon: ${currentWeapon.config.name} (${currentWeapon.ammo})`;
                        weaponElement.style.color = '#00ff00';
                    } else {
                        weaponElement.textContent = 'Weapon: System OK, No weapon equipped';
                        weaponElement.style.color = '#ff6600';
                    }
                } else {
                    weaponElement.textContent = 'Weapon: None equipped';
                    weaponElement.style.color = '#ff6600';
                }
            } else {
                playerElement.textContent = 'Player: Not found';
                playerElement.style.color = '#ff0000';
                weaponElement.textContent = 'Weapon: No player';
                weaponElement.style.color = '#ff0000';
                sceneElement.textContent = 'Scene: No player';
                sceneElement.style.color = '#ff0000';
            }
        } else {
            playerElement.textContent = 'Player: Game not loaded';
            playerElement.style.color = '#999';
            weaponElement.textContent = 'Weapon: Game not loaded';
            weaponElement.style.color = '#999';
            sceneElement.textContent = 'Scene: Game not loaded';
            sceneElement.style.color = '#999';
        }
    }
}

// Global helper functions for debugging
window.checkWeaponStatus = function() {
    console.log('🔧 Manual weapon status check triggered');
    
    if (typeof multiplayerPlayers !== 'undefined' && typeof localPlayerId !== 'undefined') {
        const localPlayer = multiplayerPlayers.get(localPlayerId);
        if (localPlayer) {
            console.log('🎯 Local Player:', localPlayer.playerId, '(isLocal:', localPlayer.isLocal + ')');
            console.log('🎯 Weapon System exists:', !!localPlayer.weaponSystem);
            if (localPlayer.weaponSystem) {
                console.log('🎯 Current Weapon:', localPlayer.weaponSystem.getCurrentWeapon()?.type || 'none');
                console.log('🎯 Available Weapons:', Array.from(localPlayer.weaponSystem.weapons.keys()));
                console.log('🎯 Current Weapon Index:', localPlayer.weaponSystem.currentWeaponIndex);
                console.log('🎯 Weapon System Owner:', localPlayer.weaponSystem.owner?.playerId || 'none');
            }
            // Try to fix weapon system
            if (localPlayer.validateAndFixWeaponSystem) {
                const result = localPlayer.validateAndFixWeaponSystem();
                console.log('🎯 Validation result:', result);
            }
        } else {
            console.warn('❌ Local player not found');
        }
    } else {
        console.warn('❌ Game not loaded or players not available');
    }
};

window.forceEquipWeapon = function(weaponType = 'grenade') {
    console.log(`🔧 Force equipping weapon: ${weaponType}`);
    
    if (typeof multiplayerPlayers !== 'undefined' && typeof localPlayerId !== 'undefined') {
        const localPlayer = multiplayerPlayers.get(localPlayerId);
        if (localPlayer && localPlayer.weaponSystem) {
            const success = localPlayer.weaponSystem.equipWeapon(weaponType);
            if (success) {
                console.log(`✅ Successfully force-equipped ${weaponType}`);
            } else {
                console.error(`❌ Failed to force-equip ${weaponType}`);
            }
        } else {
            console.warn('❌ Local player or weapon system not available');
        }
    } else {
        console.warn('❌ Game not loaded');
    }
};

// Additional debug commands
window.forceCreateWeaponSystem = function() {
    console.log('🆘 Force creating weapon system...');
    
    if (typeof multiplayerPlayers !== 'undefined' && typeof localPlayerId !== 'undefined') {
        const localPlayer = multiplayerPlayers.get(localPlayerId);
        if (localPlayer) {
            if (localPlayer.createFallbackWeaponSystem) {
                const result = localPlayer.createFallbackWeaponSystem();
                console.log('🆘 Fallback weapon system result:', result);
            } else {
                console.error('❌ createFallbackWeaponSystem method not available');
            }
        } else {
            console.warn('❌ Local player not found');
        }
    } else {
        console.warn('❌ Game not loaded');
    }
};

window.testWeaponCycle = function() {
    console.log('🔄 Testing weapon cycling...');
    
    if (typeof multiplayerPlayers !== 'undefined' && typeof localPlayerId !== 'undefined') {
        const localPlayer = multiplayerPlayers.get(localPlayerId);
        if (localPlayer && localPlayer.weaponSystem) {
            console.log('🔄 Before cycle:', localPlayer.weaponSystem.getCurrentWeapon()?.type || 'none');
            localPlayer.weaponSystem.cycleWeapon();
            console.log('🔄 After cycle:', localPlayer.weaponSystem.getCurrentWeapon()?.type || 'none');
        } else {
            console.warn('❌ Local player or weapon system not available');
        }
    } else {
        console.warn('❌ Game not loaded');
    }
};

window.testWeaponFire = function() {
    console.log('🔥 Testing weapon fire...');
    
    if (typeof multiplayerPlayers !== 'undefined' && typeof localPlayerId !== 'undefined') {
        const localPlayer = multiplayerPlayers.get(localPlayerId);
        if (localPlayer && localPlayer.weaponSystem) {
            const currentWeapon = localPlayer.weaponSystem.getCurrentWeapon();
            console.log('🔥 Current weapon before fire:', currentWeapon?.type || 'none');
            if (currentWeapon) {
                const success = localPlayer.weaponSystem.fireWeapon(100, 100);
                console.log('🔥 Fire result:', success);
            } else {
                console.warn('🔥 No weapon to fire');
            }
        } else {
            console.warn('❌ Local player or weapon system not available');
        }
    } else {
        console.warn('❌ Game not loaded');
    }
};

window.debugAllPlayers = function() {
    console.log('👥 Debug all players...');
    
    if (typeof multiplayerPlayers !== 'undefined') {
        console.log('👥 Total players:', multiplayerPlayers.size);
        console.log('👥 Local player ID:', typeof localPlayerId !== 'undefined' ? localPlayerId : 'undefined');
        
        multiplayerPlayers.forEach((player, playerId) => {
            console.log(`👤 Player ${playerId}:`, {
                isLocal: player.isLocal,
                hasWeaponSystem: !!player.weaponSystem,
                currentWeapon: player.weaponSystem?.getCurrentWeapon()?.type || 'none',
                hasKeys: !!player.keys && Object.keys(player.keys).length > 0
            });
        });
    } else {
        console.warn('❌ No players available');
    }
};

window.forceValidateAllLocalPlayers = function() {
    console.log('🔧 Force validating all local players...');
    
    if (typeof multiplayerPlayers !== 'undefined') {
        multiplayerPlayers.forEach((player, playerId) => {
            if (player.isLocal) {
                console.log(`🔧 Validating local player ${playerId}...`);
                if (player.validateAndFixWeaponSystem) {
                    const result = player.validateAndFixWeaponSystem();
                    console.log(`🔧 Validation result for player ${playerId}:`, result);
                }
            }
        });
    } else {
        console.warn('❌ No players available');
    }
};

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            new WeaponDebugOverlay();
            console.log('🔧 Weapon Debug Overlay initialized');
        }, 1000);
    });
} else {
    setTimeout(() => {
        new WeaponDebugOverlay();
        console.log('🔧 Weapon Debug Overlay initialized');
    }, 1000);
}