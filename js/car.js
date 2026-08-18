/**
 * 3D Car Model and Vehicle Physics Simulator
 * Handles detailed car mesh construction, acceleration, steering, drifting, nitro, and collision responses.
 */

class Car {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.color = options.color || 0x00f0ff;
        this.name = options.name || 'Player 1';
        this.isAI = options.isAI || false;

        // Physics constants
        this.maxSpeed = options.maxSpeed || 140; // km/h
        this.acceleration = options.acceleration || 45;
        this.braking = options.braking || 65;
        this.handling = options.handling || 2.4;
        this.friction = 0.985;
        this.nitroMultiplier = 1.45;

        // Dynamic State
        this.position = new THREE.Vector3(0, 0.4, 0);
        this.velocity = new THREE.Vector3();
        this.speed = 0; // Current speed in units/sec
        this.speedKmh = 0;
        this.heading = 0; // Yaw angle (radians)
        this.steeringAngle = 0;
        this.driftFactor = 0;
        this.isDrifting = false;
        this.isBoosting = false;
        this.nitroAmount = 100;
        this.nitroMax = 100;

        // Lap & Race Progress
        this.currentLap = 1;
        this.totalLaps = 3;
        this.currentCheckpoint = 0;
        this.trackProgress = 0; // 0 to 1
        this.lapTimes = [];
        this.currentLapTime = 0;
        this.totalTime = 0;
        this.isFinished = false;

        // Mesh references
        this.mesh = null;
        this.wheels = [];
        this.frontLeftWheel = null;
        this.frontRightWheel = null;
        this.headlightLeft = null;
        this.headlightRight = null;
        this.taillightLeft = null;
        this.taillightRight = null;
        this.exhaustParticles = [];
        this.tireSmokeParticles = [];

        this.buildMesh();
    }

    buildMesh() {
        this.mesh = new THREE.Group();

        // 1. Main Chassis / Body
        const bodyGeom = new THREE.BoxGeometry(2.0, 0.6, 4.2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.15,
            metalness: 0.85,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);

        // 2. Cabin / Windshield
        const cabinGeom = new THREE.BoxGeometry(1.6, 0.5, 2.2);
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0x111622,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.85
        });
        const cabin = new THREE.Mesh(cabinGeom, cabinMat);
        cabin.position.set(0, 0.95, -0.2);
        cabin.castShadow = true;
        this.mesh.add(cabin);

        // 3. Hood Scoop / Slopes
        const hoodGeom = new THREE.BoxGeometry(1.5, 0.2, 1.2);
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0x0d0f17, roughness: 0.5, metalness: 0.7 });
        const hood = new THREE.Mesh(hoodGeom, hoodMat);
        hood.position.set(0, 0.7, 1.2);
        this.mesh.add(hood);

        // 4. Rear Racing Spoiler
        const wingGeom = new THREE.BoxGeometry(2.2, 0.08, 0.5);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x111116, metalness: 0.8 });
        const wing = new THREE.Mesh(wingGeom, wingMat);
        wing.position.set(0, 1.15, -1.9);

        const strutGeom = new THREE.BoxGeometry(0.1, 0.4, 0.2);
        const leftStrut = new THREE.Mesh(strutGeom, wingMat);
        leftStrut.position.set(-0.7, 0.95, -1.9);
        const rightStrut = new THREE.Mesh(strutGeom, wingMat);
        rightStrut.position.set(0.7, 0.95, -1.9);

        this.mesh.add(wing);
        this.mesh.add(leftStrut);
        this.mesh.add(rightStrut);

        // 5. Wheels
        const wheelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 18);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });

        const createWheel = (x, z, isFront, isLeft) => {
            const wheelGroup = new THREE.Group();
            const tire = new THREE.Mesh(wheelGeom, wheelMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            // Rim center
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.36, 6), rimMat);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            wheelGroup.position.set(x, 0.42, z);
            this.mesh.add(wheelGroup);

            this.wheels.push(wheelGroup);
            if (isFront && isLeft) this.frontLeftWheel = wheelGroup;
            if (isFront && !isLeft) this.frontRightWheel = wheelGroup;
        };

        createWheel(-1.05, 1.3, true, true);   // Front Left
        createWheel(1.05, 1.3, true, false);   // Front Right
        createWheel(-1.05, -1.3, false, true); // Rear Left
        createWheel(1.05, -1.3, false, false); // Rear Right

        // 6. Headlights (Bright Xenon Lenses)
        const hlGeom = new THREE.BoxGeometry(0.35, 0.15, 0.1);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff });
        this.headlightLeft = new THREE.Mesh(hlGeom, hlMat);
        this.headlightLeft.position.set(-0.7, 0.55, 2.1);
        this.headlightRight = new THREE.Mesh(hlGeom, hlMat);
        this.headlightRight.position.set(0.7, 0.55, 2.1);
        this.mesh.add(this.headlightLeft);
        this.mesh.add(this.headlightRight);

        // 7. Taillights (Neon Red)
        const tlGeom = new THREE.BoxGeometry(0.4, 0.15, 0.1);
        this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        this.taillightLeft = new THREE.Mesh(tlGeom, this.taillightMat);
        this.taillightLeft.position.set(-0.7, 0.55, -2.1);
        this.taillightRight = new THREE.Mesh(tlGeom, this.taillightMat);
        this.taillightRight.position.set(0.7, 0.55, -2.1);
        this.mesh.add(this.taillightLeft);
        this.mesh.add(this.taillightRight);

        // 8. Dual Exhaust Pipes
        const exhaustGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
        const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
        const leftExhaust = new THREE.Mesh(exhaustGeom, exhaustMat);
        leftExhaust.rotation.x = Math.PI / 2;
        leftExhaust.position.set(-0.4, 0.3, -2.15);
        const rightExhaust = new THREE.Mesh(exhaustGeom, exhaustMat);
        rightExhaust.rotation.x = Math.PI / 2;
        rightExhaust.position.set(0.4, 0.3, -2.15);
        this.mesh.add(leftExhaust);
        this.mesh.add(rightExhaust);

        // Add to Scene
        this.scene.add(this.mesh);
    }

    setPaintColor(hexColor) {
        this.color = hexColor;
        if (this.mesh && this.mesh.children[0]) {
            this.mesh.children[0].material.color.setHex(hexColor);
        }
    }

    update(dt, input, track) {
        if (this.isFinished) {
            // Decelerate smoothly after finishing
            this.speed *= 0.95;
            this.updatePositionAndOrientation(dt);
            return;
        }

        this.totalTime += dt;
        this.currentLapTime += dt;

        // Nitro Logic
        if (input.nitro && this.nitroAmount > 0 && this.speed > 5) {
            this.isBoosting = true;
            this.nitroAmount = Math.max(0, this.nitroAmount - dt * 25);
            if (!this.isAI && window.soundEngine && Math.random() < 0.2) {
                window.soundEngine.playBoostSound();
            }
        } else {
            this.isBoosting = false;
            // Regenerate nitro slowly
            this.nitroAmount = Math.min(this.nitroMax, this.nitroAmount + dt * 6);
        }

        // Acceleration & Braking
        const effectiveMaxSpeed = this.maxSpeed * (this.isBoosting ? this.nitroMultiplier : 1.0) / 3.6; // convert kmh to m/s
        const accelRate = this.acceleration * (this.isBoosting ? 1.6 : 1.0);

        if (input.forward) {
            if (this.speed < effectiveMaxSpeed) {
                this.speed += accelRate * dt;
            }
        } else if (input.backward) {
            if (this.speed > 0) {
                this.speed -= this.braking * dt;
            } else if (this.speed > -15) {
                this.speed -= (this.braking * 0.4) * dt; // Reverse
            }
        } else {
            // Engine natural braking friction
            this.speed *= Math.pow(this.friction, dt * 60);
        }

        // Handbrake / Drift
        this.isDrifting = input.brake && Math.abs(this.speed) > 10;
        if (this.isDrifting) {
            this.speed *= Math.pow(0.97, dt * 60);
            if (!this.isAI && window.soundEngine && Math.random() < 0.3) {
                window.soundEngine.playDriftSound(0.2);
            }
        }

        // Steering Logic
        const speedRatio = Math.abs(this.speed) / (this.maxSpeed / 3.6);
        const steerSpeed = this.handling * (0.4 + speedRatio * 0.6) * (this.isDrifting ? 1.4 : 1.0);

        if (input.left) {
            this.steeringAngle = Math.min(0.6, this.steeringAngle + dt * 4);
            this.heading += steerSpeed * dt * (this.speed >= 0 ? 1 : -1);
        } else if (input.right) {
            this.steeringAngle = Math.max(-0.6, this.steeringAngle - dt * 4);
            this.heading -= steerSpeed * dt * (this.speed >= 0 ? 1 : -1);
        } else {
            this.steeringAngle *= Math.pow(0.7, dt * 60);
        }

        // Turn front wheels visually
        if (this.frontLeftWheel && this.frontRightWheel) {
            this.frontLeftWheel.rotation.y = this.steeringAngle;
            this.frontRightWheel.rotation.y = this.steeringAngle;
        }

        // Spin all wheels visually based on forward speed
        const spinDelta = (this.speed * dt) / 0.42;
        this.wheels.forEach(w => {
            w.children[0].rotation.x += spinDelta;
        });

        // Update Position & Track following
        this.updatePositionAndOrientation(dt);

        // Check Track Collisions & Boost Pads
        if (track) {
            this.checkTrackCollisions(track);
            this.checkBoostPads(track);
            this.checkProgress(track);
        }

        this.speedKmh = Math.round(this.speed * 3.6);

        // Audio update for player
        if (!this.isAI && window.soundEngine) {
            window.soundEngine.updateEngine(
                Math.abs(this.speedKmh) / this.maxSpeed,
                input.forward,
                this.isBoosting
            );
        }
    }

    updatePositionAndOrientation(dt) {
        // Forward vector in world coordinates (Z is forward along heading)
        const forward = new THREE.Vector3(
            Math.sin(this.heading),
            0,
            Math.cos(this.heading)
        );

        this.position.addScaledVector(forward, this.speed * dt);

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;

        // Subtle body roll when turning
        this.mesh.rotation.z = -this.steeringAngle * 0.15 * (this.speed / 20);
        this.mesh.rotation.x = (this.isBoosting ? -0.05 : 0);
    }

    checkTrackCollisions(track) {
        const info = track.getClosestPointAndDistance(this.position);
        const maxDistFromCenter = (track.roadWidth / 2) - 0.5;

        if (info.distance > maxDistFromCenter) {
            // Hit outer or inner barrier -> bounce and decelerate
            const toCenter = new THREE.Vector3().subVectors(info.point, this.position);
            toCenter.y = 0;
            toCenter.normalize();

            // Push car back onto track
            const penetration = info.distance - maxDistFromCenter;
            this.position.addScaledVector(toCenter, penetration * 0.8);
            this.mesh.position.copy(this.position);

            // Friction from wall scraping
            this.speed *= 0.85;

            // Trigger crash thump sound
            if (!this.isAI && window.soundEngine && Math.abs(this.speed) > 15) {
                window.soundEngine.playCrashSound(Math.abs(this.speed) / 30);
            }
        }

        // Align car elevation with track slope
        this.position.y = info.point.y + 0.4;
    }

    checkBoostPads(track) {
        track.boostPads.forEach(pad => {
            const dist = this.position.distanceTo(pad.position);
            if (dist < 4.5) {
                // Trigger Turbo Boost!
                this.speed = Math.min(this.speed + 18, (this.maxSpeed * 1.5) / 3.6);
                this.nitroAmount = Math.min(this.nitroMax, this.nitroAmount + 25);
                if (!this.isAI && window.soundEngine) {
                    window.soundEngine.playBoostSound();
                }
            }
        });
    }

    checkProgress(track) {
        const nextCpIndex = (this.currentCheckpoint + 1) % track.checkpoints.length;
        const nextCp = track.checkpoints[nextCpIndex];

        const dist = this.position.distanceTo(nextCp.position);
        if (dist < nextCp.radius + 6) {
            this.currentCheckpoint = nextCpIndex;

            // Checked lap completion at index 0
            if (nextCpIndex === 0 && this.currentCheckpoint !== 0) {
                this.lapTimes.push(this.currentLapTime);
                this.currentLapTime = 0;

                if (!this.isAI && window.soundEngine) {
                    window.soundEngine.playCheckpointSound();
                }

                if (this.currentLap < this.totalLaps) {
                    this.currentLap++;
                } else {
                    this.isFinished = true;
                }
            }
        }

        // Exact overall track progress (laps completed + fractional progress along track)
        const trackPointInfo = track.getClosestPointAndDistance(this.position);
        this.trackProgress = (this.currentLap - 1) + trackPointInfo.t;
    }

    resetToTrack(track) {
        const info = track.getClosestPointAndDistance(this.position);
        this.position.copy(info.point);
        this.position.y += 0.4;
        this.speed = 0;
        
        // Orient facing along track tangent
        const tangent = track.curve.getTangentAt(info.t).normalize();
        this.heading = Math.atan2(tangent.x, tangent.z);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
    }
}

window.Car = Car;
