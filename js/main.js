/**
 * Main 3D Game Controller & Loop
 * Orchestrates Three.js scene, camera modes, game state transitions, AI management, and particle systems.
 */

class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Game Components
        this.track = null;
        this.player = null;
        this.aiRacers = [];
        this.controls = null;
        this.hud = null;

        // Camera views: 0 = Chase, 1 = Cockpit/Hood, 2 = Top-Down
        this.cameraMode = 0;
        this.cameraOffsetChase = new THREE.Vector3(0, 3.5, -7.5);
        this.cameraOffsetCockpit = new THREE.Vector3(0, 1.2, 0.4);
        this.cameraOffsetTop = new THREE.Vector3(0, 22, -10);

        // State: 'MENU', 'GARAGE', 'COUNTDOWN', 'RACING', 'PAUSED', 'FINISHED'
        this.state = 'MENU';
        this.countdownTimer = 3.99;

        // Particle Emitter System
        this.particleGroup = null;
        this.particles = [];

        this.init();
    }

    init() {
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060814);
        this.scene.fog = new THREE.FogExp2(0x060814, 0.0035);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(
            65,
            window.innerWidth / window.innerHeight,
            0.1,
            1500
        );
        this.camera.position.set(0, 15, -25);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        // 4. Lighting
        this.setupLights();

        // 5. Track Builder
        this.track = new RaceTrack(this.scene);

        // 6. Player Car
        this.player = new Car(this.scene, {
            color: 0x00f0ff,
            name: 'Player 1',
            isAI: false,
            maxSpeed: 165,
            acceleration: 52,
            handling: 2.6
        });

        // 7. AI Opponents (Grid positions behind/alongside player)
        this.createAIOpponents();

        // 8. Systems
        this.controls = new Controls();
        this.hud = new HUD();
        this.setupParticles();

        // 9. Position Grid for Starting Line
        this.resetGridPositions();

        // 10. Event Listeners & UI Binding
        this.setupUIEvents();
        window.addEventListener('resize', () => this.onWindowResize());

        // Start Animation Loop
        this.animate();
    }

    setupLights() {
        // Hemisphere ambient glow
        const hemiLight = new THREE.HemisphereLight(0x405580, 0x111625, 0.7);
        this.scene.add(hemiLight);

        // Cyber Sunlight / Moon
        const dirLight = new THREE.DirectionalLight(0xddeeff, 1.2);
        dirLight.position.set(100, 200, 100);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 500;
        const d = 150;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.scene.add(dirLight);

        // Ambient cyber tint
        const ambient = new THREE.AmbientLight(0x1a2638, 0.4);
        this.scene.add(ambient);
    }

    createAIOpponents() {
        const aiConfigs = [
            { name: 'Viper Zero', color: 0xff0055, maxSpeed: 160, skill: 0.96, laneOffset: -3.5 },
            { name: 'Cyber Phantom', color: 0x9d00ff, maxSpeed: 168, skill: 1.02, laneOffset: 3.5 },
            { name: 'Golden Beast', color: 0xffb703, maxSpeed: 158, skill: 0.94, laneOffset: 0.0 }
        ];

        this.aiRacers = aiConfigs.map(cfg => new AIRacer(this.scene, cfg));
    }

    resetGridPositions() {
        const startPt = this.track.curve.getPointAt(0);
        const tangent = this.track.curve.getTangentAt(0).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const baseHeading = Math.atan2(tangent.x, tangent.z);

        // Player starting spot (Pole Position)
        this.player.position.copy(startPt).addScaledVector(normal, -2.5).addScaledVector(tangent, 5);
        this.player.position.y += 0.4;
        this.player.heading = baseHeading;
        this.player.speed = 0;
        this.player.currentLap = 1;
        this.player.currentCheckpoint = 0;
        this.player.currentLapTime = 0;
        this.player.totalTime = 0;
        this.player.isFinished = false;
        this.player.lapTimes = [];
        this.player.updatePositionAndOrientation(0);

        // AI grid placements staggered behind player
        const offsets = [
            { back: -5, side: 2.5 },
            { back: -15, side: -2.5 },
            { back: -25, side: 2.5 }
        ];

        this.aiRacers.forEach((ai, idx) => {
            const off = offsets[idx];
            ai.car.position.copy(startPt).addScaledVector(normal, off.side).addScaledVector(tangent, off.back);
            ai.car.position.y += 0.4;
            ai.car.heading = baseHeading;
            ai.car.speed = 0;
            ai.car.currentLap = 1;
            ai.car.currentCheckpoint = 0;
            ai.car.isFinished = false;
            ai.car.updatePositionAndOrientation(0);
        });
    }

    setupParticles() {
        // Particle pool for nitro exhaust and tire smoke
        const count = 200;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -100;
            positions[i * 3 + 2] = 0;

            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0.9;
            colors[i * 3 + 2] = 1;

            sizes[i] = 1.0;
            this.particles.push({
                index: i,
                life: 0,
                maxLife: 0.4,
                velocity: new THREE.Vector3()
            });
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particlePoints = new THREE.Points(geom, mat);
        this.scene.add(this.particlePoints);
    }

    spawnExhaustParticles(car, isNitro) {
        if (!this.particlePoints) return;
        const posAttr = this.particlePoints.geometry.attributes.position;
        const colAttr = this.particlePoints.geometry.attributes.color;

        const forward = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
        const spawnPos = new THREE.Vector3().copy(car.position).addScaledVector(forward, -2.1);
        spawnPos.y += 0.3;

        // Find dead particle
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.life <= 0) {
                p.life = isNitro ? 0.35 : 0.15;
                p.maxLife = p.life;
                p.velocity.copy(forward).multiplyScalar(-car.speed * 0.4 - (isNitro ? 15 : 5));
                p.velocity.x += (Math.random() - 0.5) * 2;
                p.velocity.y += Math.random() * 1.5;
                p.velocity.z += (Math.random() - 0.5) * 2;

                posAttr.setXYZ(p.index, spawnPos.x, spawnPos.y, spawnPos.z);

                if (isNitro) {
                    colAttr.setXYZ(p.index, 0.0, 0.95, 1.0); // Cyan plasma
                } else {
                    colAttr.setXYZ(p.index, 1.0, 0.4, 0.0); // Orange ember
                }
                break;
            }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }

    updateParticles(dt) {
        if (!this.particlePoints) return;
        const posAttr = this.particlePoints.geometry.attributes.position;

        this.particles.forEach(p => {
            if (p.life > 0) {
                p.life -= dt;
                const x = posAttr.getX(p.index) + p.velocity.x * dt;
                const y = posAttr.getY(p.index) + p.velocity.y * dt;
                const z = posAttr.getZ(p.index) + p.velocity.z * dt;
                posAttr.setXYZ(p.index, x, y, z);
            } else {
                posAttr.setXYZ(p.index, 0, -100, 0);
            }
        });
        posAttr.needsUpdate = true;
    }

    setupUIEvents() {
        // Start Game Button
        const btnStart = document.getElementById('btn-start-race');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                window.soundEngine.unlockAudio();
                this.startCountdown();
            });
        }

        // Garage Button
        const btnGarage = document.getElementById('btn-garage');
        if (btnGarage) {
            btnGarage.addEventListener('click', () => {
                this.showScreen('screen-garage');
                this.state = 'GARAGE';
            });
        }

        // Back from Garage
        const btnBackGarage = document.getElementById('btn-back-garage');
        if (btnBackGarage) {
            btnBackGarage.addEventListener('click', () => {
                this.showScreen('screen-menu');
                this.state = 'MENU';
            });
        }

        // Car Color Palette Picker
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                const hex = parseInt(swatch.getAttribute('data-color'), 16);
                this.player.setPaintColor(hex);
            });
        });

        // Resume Button
        const btnResume = document.getElementById('btn-resume');
        if (btnResume) {
            btnResume.addEventListener('click', () => this.togglePause());
        }

        // Restart Buttons
        const restartButtons = document.querySelectorAll('.btn-restart-game');
        restartButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.resetGridPositions();
                this.startCountdown();
            });
        });

        // Main Menu Buttons
        const menuButtons = document.querySelectorAll('.btn-to-menu');
        menuButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.resetGridPositions();
                this.showScreen('screen-menu');
                this.state = 'MENU';
            });
        });

        // Camera Switch Button in HUD
        const btnCam = document.getElementById('btn-cam-switch');
        if (btnCam) {
            btnCam.addEventListener('click', () => this.switchCamera());
        }

        // Audio Mute Button in HUD
        const btnAudio = document.getElementById('btn-audio-toggle');
        if (btnAudio) {
            btnAudio.addEventListener('click', () => {
                const muted = window.soundEngine.toggleMute();
                btnAudio.textContent = muted ? '🔇' : '🔊';
            });
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.ui-screen').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(screenId);
        if (target) target.classList.remove('hidden');
    }

    startCountdown() {
        this.showScreen('screen-racing');
        this.state = 'COUNTDOWN';
        this.countdownTimer = 3.99;
        this.hud.showToast('GET READY!');
        window.soundEngine.playCountdownBeep(false);
    }

    togglePause() {
        if (this.state === 'RACING') {
            this.state = 'PAUSED';
            document.getElementById('screen-pause').classList.remove('hidden');
            window.soundEngine.stopEngine();
        } else if (this.state === 'PAUSED') {
            this.state = 'RACING';
            document.getElementById('screen-pause').classList.add('hidden');
        }
    }

    switchCamera() {
        this.cameraMode = (this.cameraMode + 1) % 3;
        const names = ['CHASE CAM', 'HOOD CAM', 'AERIAL CAM'];
        this.hud.showToast(names[this.cameraMode], 1200);
    }

    updateCamera(dt) {
        if (!this.player || !this.player.mesh) return;

        const pMesh = this.player.mesh;
        const forward = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading));
        const up = new THREE.Vector3(0, 1, 0);

        if (this.state === 'MENU' || this.state === 'GARAGE') {
            // Smooth Cinematic Orbit Camera around the car
            const time = this.clock.getElapsedTime() * 0.4;
            const radius = 12;
            this.camera.position.x = this.player.position.x + Math.sin(time) * radius;
            this.camera.position.z = this.player.position.z + Math.cos(time) * radius;
            this.camera.position.y = this.player.position.y + 4 + Math.sin(time * 0.5) * 1.5;
            this.camera.lookAt(new THREE.Vector3(this.player.position.x, this.player.position.y + 1.2, this.player.position.z));
            return;
        }

        let targetPos = new THREE.Vector3();
        let lookTarget = new THREE.Vector3();

        if (this.cameraMode === 0) {
            // Chase Camera (Dynamic lag & FOV based on speed)
            const chaseDist = 7.5 + (this.player.speed / 40);
            targetPos.copy(this.player.position)
                .addScaledVector(forward, -chaseDist)
                .addScaledVector(up, 3.2);

            lookTarget.copy(this.player.position).addScaledVector(forward, 8).addScaledVector(up, 1.2);

            // Dynamic FOV for speed sensation
            const targetFov = 65 + (Math.abs(this.player.speedKmh) / 10);
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 4);
            this.camera.updateProjectionMatrix();

            // Smooth camera lerp
            this.camera.position.lerp(targetPos, Math.min(1.0, dt * 10));
            this.camera.lookAt(lookTarget);
        } else if (this.cameraMode === 1) {
            // Cockpit / Hood Camera
            targetPos.copy(this.player.position).addScaledVector(forward, 0.4).addScaledVector(up, 1.1);
            lookTarget.copy(this.player.position).addScaledVector(forward, 25).addScaledVector(up, 1.1);

            this.camera.position.copy(targetPos);
            this.camera.lookAt(lookTarget);
        } else {
            // Top-Down Aerial Camera
            targetPos.copy(this.player.position).addScaledVector(forward, -5).addScaledVector(up, 28);
            lookTarget.copy(this.player.position).addScaledVector(forward, 6);

            this.camera.position.lerp(targetPos, Math.min(1.0, dt * 6));
            this.camera.lookAt(lookTarget);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.1);

        // Check Input Actions
        if (this.controls.consumeCameraSwitch()) {
            this.switchCamera();
        }
        if (this.controls.consumePauseToggle()) {
            this.togglePause();
        }
        if (this.controls.consumeResetCar()) {
            this.player.resetToTrack(this.track);
            this.hud.showToast('CAR RESET', 1000);
        }

        const allCars = [this.player, ...this.aiRacers.map(a => a.car)];

        // State Machine Loop
        if (this.state === 'COUNTDOWN') {
            const prevTimer = Math.ceil(this.countdownTimer);
            this.countdownTimer -= dt;
            const curTimer = Math.ceil(this.countdownTimer);

            const countElem = document.getElementById('hud-countdown');
            if (countElem) {
                if (curTimer > 0) {
                    countElem.textContent = curTimer.toString();
                    countElem.classList.add('pulse-number');
                    if (curTimer !== prevTimer) {
                        window.soundEngine.playCountdownBeep(false);
                    }
                } else {
                    countElem.textContent = 'GO!';
                    countElem.classList.add('pulse-number');
                    window.soundEngine.playCountdownBeep(true);
                }
            }

            if (this.countdownTimer <= 0) {
                this.state = 'RACING';
                if (countElem) countElem.textContent = '';
            }

            // Keep cars steady during countdown
            this.player.update(dt, { forward: false, backward: false, left: false, right: false }, this.track);
            this.aiRacers.forEach(ai => ai.car.update(dt, { forward: false, backward: false, left: false, right: false }, this.track));
        } else if (this.state === 'RACING') {
            // Update Player
            this.player.update(dt, this.controls, this.track);

            // Spawn Particles
            if (this.player.speed > 5) {
                this.spawnExhaustParticles(this.player, this.player.isBoosting);
            }

            // Update AI Opponents
            this.aiRacers.forEach(ai => {
                ai.update(dt, this.track, allCars);
                if (ai.car.speed > 5 && ai.car.isBoosting) {
                    this.spawnExhaustParticles(ai.car, true);
                }
            });

            // Update HUD
            this.hud.update(this.player, allCars, this.track);

            // Check Finish Line
            if (this.player.isFinished) {
                this.onRaceFinished(allCars);
            }
        }

        this.updateParticles(dt);
        this.updateCamera(dt);

        this.renderer.render(this.scene, this.camera);
    }

    onRaceFinished(allCars) {
        this.state = 'FINISHED';
        window.soundEngine.stopEngine();

        // Determine final position
        const sorted = [...allCars].sort((a, b) => b.trackProgress - a.trackProgress);
        const rank = sorted.findIndex(c => c === this.player) + 1;

        const screenFinish = document.getElementById('screen-finish');
        const posText = document.getElementById('finish-pos');
        const timeText = document.getElementById('finish-time');
        const bestText = document.getElementById('finish-best');
        const rankTitle = document.getElementById('finish-title');

        if (rank === 1) {
            rankTitle.textContent = '🏆 VICTORY! 1ST PLACE';
            rankTitle.style.color = '#ffd700';
        } else if (rank === 2) {
            rankTitle.textContent = '🥈 2ND PLACE';
            rankTitle.style.color = '#c0c0c0';
        } else if (rank === 3) {
            rankTitle.textContent = '🥉 3RD PLACE';
            rankTitle.style.color = '#cd7f32';
        } else {
            rankTitle.textContent = 'RACE COMPLETED';
            rankTitle.style.color = '#00f0ff';
        }

        if (posText) posText.textContent = `${rank} / ${allCars.length}`;
        if (timeText) timeText.textContent = this.hud.formatTime(this.player.totalTime);
        if (bestText) bestText.textContent = this.hud.formatTime(Math.min(...this.player.lapTimes));

        if (screenFinish) screenFinish.classList.remove('hidden');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Instantiate Game on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
});
