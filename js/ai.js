/**
 * AI Opponent Racers
 * Controls AI drivers with spline path-following, lane offsets, corner braking, and competition logic.
 */

class AIRacer {
    constructor(scene, options = {}) {
        this.name = options.name || 'AI Racer';
        this.laneOffset = options.laneOffset || (Math.random() * 8 - 4); // lateral offset from center line
        this.skill = options.skill || 0.95; // 0.85 to 1.05

        this.car = new Car(scene, {
            color: options.color || 0xff0055,
            name: this.name,
            isAI: true,
            maxSpeed: (options.maxSpeed || 135) * this.skill,
            acceleration: (options.acceleration || 42) * this.skill,
            handling: options.handling || 2.5
        });

        this.input = {
            forward: true,
            backward: false,
            left: false,
            right: false,
            brake: false,
            nitro: false
        };

        this.targetT = 0;
        this.boostCooldown = Math.random() * 5 + 3;
    }

    update(dt, track, allCars) {
        if (!track || this.car.isFinished) {
            this.car.update(dt, { forward: false, backward: false, left: false, right: false }, track);
            return;
        }

        // Find current track position
        const carPos = this.car.position;
        const currentInfo = track.getClosestPointAndDistance(carPos);

        // Look ahead along spline
        const lookAheadDistance = 0.035 + (this.car.speed / 800);
        this.targetT = (currentInfo.t + lookAheadDistance) % 1.0;

        const targetCenter = track.curve.getPointAt(this.targetT);
        const tangent = track.curve.getTangentAt(this.targetT).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        // Calculate offset target point in AI lane
        const targetPos = new THREE.Vector3().copy(targetCenter).addScaledVector(normal, this.laneOffset);

        // Angle to target
        const toTarget = new THREE.Vector3().subVectors(targetPos, carPos);
        const desiredHeading = Math.atan2(toTarget.x, toTarget.z);

        // Compute shortest angle difference
        let angleDiff = desiredHeading - this.car.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Steering commands
        const deadzone = 0.05;
        this.input.left = angleDiff > deadzone;
        this.input.right = angleDiff < -deadzone;

        // Speed management based on turn sharpness
        const turnSharpness = Math.abs(angleDiff);
        if (turnSharpness > 0.45 && this.car.speedKmh > 75) {
            // Brake slightly for sharp corners
            this.input.forward = false;
            this.input.backward = true;
            this.input.brake = turnSharpness > 0.8;
        } else {
            this.input.forward = true;
            this.input.backward = false;
            this.input.brake = false;
        }

        // AI Boost on long straights
        this.boostCooldown -= dt;
        if (turnSharpness < 0.15 && this.boostCooldown <= 0 && this.car.nitroAmount > 30) {
            this.input.nitro = true;
            if (this.car.nitroAmount < 15) {
                this.input.nitro = false;
                this.boostCooldown = Math.random() * 8 + 6;
            }
        } else {
            this.input.nitro = false;
        }

        // Avoid colliding directly into other cars in front
        if (allCars) {
            allCars.forEach(other => {
                if (other !== this.car) {
                    const toOther = new THREE.Vector3().subVectors(other.position, carPos);
                    const dist = toOther.length();
                    if (dist < 6.0) {
                        // If car is ahead, adjust lane slightly
                        const dot = toOther.dot(tangent);
                        if (dot > 0) {
                            if (this.laneOffset > 0) this.laneOffset -= dt * 3;
                            else this.laneOffset += dt * 3;
                        }
                    }
                }
            });
        }

        // Update AI Car Physics
        this.car.update(dt, this.input, track);
    }
}

window.AIRacer = AIRacer;
