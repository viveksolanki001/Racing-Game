/**
 * HUD & Telemetry Interface Manager
 * Handles animated speedometer, tachometer, 2D mini-map, position rankings, lap timing, and toast alerts.
 */

class HUD {
    constructor() {
        // DOM Elements
        this.speedDigital = document.getElementById('hud-speed-digital');
        this.speedNeedle = document.getElementById('hud-speed-needle');
        this.rpmBar = document.getElementById('hud-rpm-bar');
        this.gearDisplay = document.getElementById('hud-gear');
        this.nitroBar = document.getElementById('hud-nitro-bar');
        this.lapDisplay = document.getElementById('hud-lap-text');
        this.posDisplay = document.getElementById('hud-pos-text');
        this.timeDisplay = document.getElementById('hud-time-text');
        this.bestTimeDisplay = document.getElementById('hud-best-time');
        this.toastBox = document.getElementById('hud-toast');
        this.miniMapCanvas = document.getElementById('hud-minimap');
        this.miniMapCtx = this.miniMapCanvas ? this.miniMapCanvas.getContext('2d') : null;

        this.toastTimeout = null;
        this.bestLapTime = Infinity;
    }

    formatTime(seconds) {
        if (!seconds || seconds === Infinity || isNaN(seconds)) return '--:--.--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }

    update(playerCar, allCars, track) {
        if (!playerCar) return;

        const speedKmh = Math.max(0, playerCar.speedKmh);
        const maxKmh = playerCar.maxSpeed * (playerCar.isBoosting ? 1.45 : 1.0);

        // 1. Digital Speedometer
        if (this.speedDigital) {
            this.speedDigital.textContent = speedKmh.toString();
        }

        // 2. Analog Speedometer Needle (-120deg to +120deg)
        if (this.speedNeedle) {
            const ratio = Math.min(1.0, speedKmh / 220);
            const deg = -120 + (ratio * 240);
            this.speedNeedle.style.transform = `rotate(${deg}deg)`;
        }

        // 3. Simulated RPM & Gear
        let gear = 'N';
        let rpm = 0;
        if (playerCar.speed < -0.5) {
            gear = 'R';
            rpm = Math.min(1.0, Math.abs(playerCar.speed) / 10);
        } else if (speedKmh < 1) {
            gear = 'N';
            rpm = 0.1;
        } else if (speedKmh < 40) {
            gear = '1';
            rpm = speedKmh / 40;
        } else if (speedKmh < 80) {
            gear = '2';
            rpm = (speedKmh - 30) / 50;
        } else if (speedKmh < 120) {
            gear = '3';
            rpm = (speedKmh - 70) / 50;
        } else if (speedKmh < 160) {
            gear = '4';
            rpm = (speedKmh - 110) / 50;
        } else if (speedKmh < 200) {
            gear = '5';
            rpm = (speedKmh - 150) / 50;
        } else {
            gear = '6';
            rpm = Math.min(1.0, (speedKmh - 190) / 50);
        }

        if (this.gearDisplay) this.gearDisplay.textContent = gear;
        if (this.rpmBar) {
            this.rpmBar.style.width = `${Math.min(100, Math.max(5, rpm * 100))}%`;
            if (rpm > 0.85) {
                this.rpmBar.style.background = 'linear-gradient(90deg, #ffb703, #ff0055)';
            } else {
                this.rpmBar.style.background = 'linear-gradient(90deg, #00f0ff, #7000ff)';
            }
        }

        // 4. Nitro Bar
        if (this.nitroBar) {
            const nitroPct = (playerCar.nitroAmount / playerCar.nitroMax) * 100;
            this.nitroBar.style.width = `${nitroPct}%`;
            if (playerCar.isBoosting) {
                this.nitroBar.classList.add('pulse-nitro');
            } else {
                this.nitroBar.classList.remove('pulse-nitro');
            }
        }

        // 5. Lap Display
        if (this.lapDisplay) {
            this.lapDisplay.textContent = `${Math.min(playerCar.currentLap, playerCar.totalLaps)} / ${playerCar.totalLaps}`;
        }

        // 6. Race Standings / Position
        if (allCars && allCars.length > 0 && this.posDisplay) {
            // Sort cars by track progress descending
            const sorted = [...allCars].sort((a, b) => b.trackProgress - a.trackProgress);
            const rank = sorted.findIndex(c => c === playerCar) + 1;
            
            const suffixes = ['ST', 'ND', 'RD', 'TH'];
            const suffix = rank <= 3 ? suffixes[rank - 1] : 'TH';
            this.posDisplay.innerHTML = `<span class="pos-num">${rank}</span><span class="pos-suf">${suffix}</span>`;
        }

        // 7. Timer & Best Lap
        if (this.timeDisplay) {
            this.timeDisplay.textContent = this.formatTime(playerCar.currentLapTime);
        }

        if (playerCar.lapTimes.length > 0) {
            const currentBest = Math.min(...playerCar.lapTimes);
            if (currentBest < this.bestLapTime) {
                this.bestLapTime = currentBest;
                if (this.bestTimeDisplay) {
                    this.bestTimeDisplay.textContent = `BEST: ${this.formatTime(this.bestLapTime)}`;
                }
            }
        }

        // 8. 2D Mini-Map
        this.drawMiniMap(playerCar, allCars, track);
    }

    drawMiniMap(playerCar, allCars, track) {
        if (!this.miniMapCtx || !track || !track.curve) return;

        const ctx = this.miniMapCtx;
        const w = this.miniMapCanvas.width;
        const h = this.miniMapCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Track bounds normalization
        // Track extends approx -350 to +300 in X and -350 to +200 in Z
        const mapX = (worldX) => ((worldX + 360) / 720) * (w - 30) + 15;
        const mapY = (worldZ) => ((worldZ + 360) / 600) * (h - 30) + 15;

        // Draw circuit path
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const segments = 120;
        for (let i = 0; i <= segments; i++) {
            const pt = track.curve.getPointAt(i / segments);
            const sx = mapX(pt.x);
            const sy = mapY(pt.z);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw Start/Finish point
        const startPt = track.curve.getPointAt(0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mapX(startPt.x) - 3, mapY(startPt.z) - 3, 6, 6);

        // Draw AI cars (Red/Orange/Purple dots)
        if (allCars) {
            allCars.forEach(car => {
                if (car !== playerCar) {
                    const cx = mapX(car.position.x);
                    const cy = mapY(car.position.z);
                    ctx.fillStyle = '#ff0055';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Draw Player Car (Bright Cyan Glowing Dot + Heading Indicator)
        if (playerCar) {
            const px = mapX(playerCar.position.x);
            const py = mapY(playerCar.position.z);

            // Glow ring
            ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fill();

            // Player dot
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Heading pointer
            const hx = px + Math.sin(playerCar.heading) * 8;
            const hy = py + Math.cos(playerCar.heading) * 8;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(hx, hy);
            ctx.stroke();
        }
    }

    showToast(message, duration = 2500) {
        if (!this.toastBox) return;
        this.toastBox.textContent = message;
        this.toastBox.classList.add('visible');

        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.toastBox.classList.remove('visible');
        }, duration);
    }
}

window.HUD = HUD;
