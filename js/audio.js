/**
 * Web Audio API Sound Synthesizer for 3D Racing Game
 * Provides procedural engine sounds, tire screech, turbo boost, crash sounds, countdown beeps, and music.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;
        this.subOsc = null;
        this.subGain = null;
        this.isEngineRunning = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
            this.setupEngineSound();
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
        }
    }

    unlockAudio() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.initialized) {
            this.init();
        }
    }

    setupEngineSound() {
        if (!this.ctx) return;

        // Main engine oscillator (sawtooth for rich harmonic rumble)
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

        // Lowpass filter for engine tone
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
        this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

        // Sub oscillator for bass roar
        this.subOsc = this.ctx.createOscillator();
        this.subOsc.type = 'triangle';
        this.subOsc.frequency.setValueAtTime(30, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        this.subGain = this.ctx.createGain();
        this.subGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        // Wiring
        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.subOsc.connect(this.subGain);
        this.subGain.connect(this.ctx.destination);

        this.engineOsc.start();
        this.subOsc.start();
        this.isEngineRunning = true;
    }

    updateEngine(speedRatio, isAccelerating, isBoosting) {
        if (!this.initialized || !this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const clampedRatio = Math.max(0, Math.min(1, speedRatio));

        // Frequency pitch shifts with speed and throttle
        const baseFreq = 40 + (clampedRatio * 180) + (isAccelerating ? 25 : 0) + (isBoosting ? 60 : 0);
        const filterFreq = 180 + (clampedRatio * 900) + (isAccelerating ? 300 : 0);
        
        let targetGain = 0.08 + (clampedRatio * 0.15);
        if (isAccelerating) targetGain += 0.05;
        if (isBoosting) targetGain += 0.08;

        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
        this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
        this.subGain.gain.setTargetAtTime(targetGain * 0.7, now, 0.08);
    }

    stopEngine() {
        if (!this.initialized || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this.engineGain) this.engineGain.gain.setTargetAtTime(0.0001, now, 0.1);
        if (this.subGain) this.subGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }

    playBoostSound() {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Whoosh noise / high-pitch turbo sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.5);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
    }

    playDriftSound(volume = 0.2) {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // White noise squeal for tire drift
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200 + Math.random() * 400, now);
        filter.Q.setValueAtTime(5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(Math.min(0.25, volume), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    playCrashSound(intensity = 1.0) {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Thump impact
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

        gain.gain.setValueAtTime(0.3 * Math.min(1.5, intensity), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    playCountdownBeep(isFinal = false) {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freq = isFinal ? 880 : 440; // High A vs Middle A
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.6 : 0.25));

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + (isFinal ? 0.6 : 0.25));
    }

    playCheckpointSound() {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopEngine();
        }
        return this.isMuted;
    }
}

window.soundEngine = new SoundEngine();
