/**
 * Input Controls Manager for 3D Racing Game
 * Handles keyboard (WASD / Arrows / Shift / Space / C / P / R) and Mobile On-Screen Touch Controls.
 */

class Controls {
    constructor() {
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.brake = false;
        this.nitro = false;
        this.cameraSwitch = false;
        this.pauseToggle = false;
        this.resetCar = false;

        this.keyState = {};
        this.setupKeyboardListeners();
        this.setupTouchControls();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            this.keyState[e.code] = true;
            this.updateStates();

            // Single trigger events
            if (e.code === 'KeyC') {
                this.cameraSwitch = true;
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.pauseToggle = true;
            }
            if (e.code === 'KeyR') {
                this.resetCar = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keyState[e.code] = false;
            this.updateStates();
        });
    }

    updateStates() {
        this.forward = !!(this.keyState['KeyW'] || this.keyState['ArrowUp']);
        this.backward = !!(this.keyState['KeyS'] || this.keyState['ArrowDown']);
        this.left = !!(this.keyState['KeyA'] || this.keyState['ArrowLeft']);
        this.right = !!(this.keyState['KeyD'] || this.keyState['ArrowRight']);
        this.brake = !!(this.keyState['Space']);
        this.nitro = !!(this.keyState['ShiftLeft'] || this.keyState['ShiftRight'] || this.keyState['KeyN']);
    }

    setupTouchControls() {
        const bindTouch = (elemId, onDown, onUp) => {
            const el = document.getElementById(elemId);
            if (!el) return;

            const handleStart = (e) => {
                e.preventDefault();
                onDown();
                el.classList.add('active');
            };

            const handleEnd = (e) => {
                e.preventDefault();
                onUp();
                el.classList.remove('active');
            };

            el.addEventListener('touchstart', handleStart, { passive: false });
            el.addEventListener('touchend', handleEnd, { passive: false });
            el.addEventListener('touchcancel', handleEnd, { passive: false });
            el.addEventListener('mousedown', handleStart);
            el.addEventListener('mouseup', handleEnd);
            el.addEventListener('mouseleave', handleEnd);
        };

        // Connect on DOM ready
        window.addEventListener('DOMContentLoaded', () => {
            bindTouch('btn-gas', () => { this.forward = true; }, () => { this.forward = false; });
            bindTouch('btn-brake', () => { this.backward = true; }, () => { this.backward = false; });
            bindTouch('btn-left', () => { this.left = true; }, () => { this.left = false; });
            bindTouch('btn-right', () => { this.right = true; }, () => { this.right = false; });
            bindTouch('btn-nitro', () => { this.nitro = true; }, () => { this.nitro = false; });
            bindTouch('btn-handbrake', () => { this.brake = true; }, () => { this.brake = false; });
            bindTouch('btn-cam-touch', () => { this.cameraSwitch = true; }, () => {});
        });
    }

    consumeCameraSwitch() {
        const res = this.cameraSwitch;
        this.cameraSwitch = false;
        return res;
    }

    consumePauseToggle() {
        const res = this.pauseToggle;
        this.pauseToggle = false;
        return res;
    }

    consumeResetCar() {
        const res = this.resetCar;
        this.resetCar = false;
        return res;
    }
}

window.Controls = Controls;
