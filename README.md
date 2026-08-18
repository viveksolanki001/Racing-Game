# 🏎️ CYBER VELOCITY - 3D Racing Game

A high-octane, next-generation 3D Cyberpunk Racing Game built with **HTML5**, **Vanilla CSS**, **Three.js**, **Web Audio API**, and custom vehicle physics.

![Game Preview](https://raw.githubusercontent.com/viveksolanki001/Racing-Game/main/preview.png)

---

## 🌟 Key Features

- **Realistic 3D Vehicle Physics**: Realistic acceleration, top speed, steering slip-angle, handbrake drifting, and wall collision bouncing.
- **Turbo Boost System**: Collect nitro over time or drive through neon boost pads for instant speed surge.
- **Intelligent AI Racers**: 3 AI opponents (*Viper Zero*, *Cyber Phantom*, *Golden Beast*) navigating via procedural spline pathfinding, lane positioning, and dynamic corner braking.
- **Dynamic 3D Camera Modes**:
  - 🎥 **Chase Camera**: Dynamic distance & Field of View (FOV) that stretches at top speed.
  - 🏎️ **Hood / Cockpit Camera**: High-immersion first-person racing view.
  - 🛰️ **Top-Down Aerial Camera**: Bird's-eye tactical racing overview.
- **Procedural Web Audio API Engine**: Dynamic engine RPM pitch modulation, turbo whoosh, tire drift screeches, barrier impact thuds, and countdown beeps.
- **Glassmorphism HUD & Telemetry**:
  - Analog & Digital Speedometer (KM/H)
  - RPM Tachometer & Gear Indicator (`1`–`6`, `N`, `R`)
  - Live 2D Canvas Mini-Map with real-time player and AI position blips
  - Lap Counter, Timer, Best Lap Record, and Position Badge (`1ST`–`4TH`)
  - Nitro energy bar with pulse animation
- **Vehicle Garage**: Paint customizer with instant preview and specs display.
- **Mobile Touch Controls**: Responsive on-screen pedals and steering for mobile & tablet gameplay.

---

## 🎮 Controls

| Action | Keyboard | Mobile Touch |
|---|---|---|
| **Accelerate / Gas** | `W` or `Up Arrow (↑)` | `▲` Gas Button |
| **Brake / Reverse** | `S` or `Down Arrow (↓)` | `▼` Brake Button |
| **Steer Left / Right** | `A` / `D` or `←` / `→` | `◀` / `▶` Buttons |
| **Nitro Boost** | `Shift` or `N` | `⚡` Nitro Button |
| **Handbrake / Drift** | `Spacebar` | `🛑` Drift Button |
| **Switch Camera** | `C` | 📷 Camera Button |
| **Reset Car Position** | `R` | — |
| **Pause Game** | `P` or `Esc` | — |

---

## 🚀 How to Run Locally

You can run this project in any modern web browser:

### Option 1: Direct Open
Double-click [`index.html`](index.html) or open it directly in Google Chrome, Microsoft Edge, Firefox, or Safari.

### Option 2: Local HTTP Server (Recommended)
```bash
# Using Node.js npx serve
npx serve .

# Or using Python 3
python -m http.server 8000
```
Then open `http://localhost:8000` or the port shown in your terminal.

---

## 📁 Project Architecture

```
├── index.html        # Main HTML5 entrypoint & HUD overlays
├── styles.css        # Glassmorphism cyber design system
├── js/
│   ├── main.js       # Scene, camera modes, state machine & game loop
│   ├── track.js      # Procedural track, neon barriers, boost pads & scenery
│   ├── car.js        # 3D car model, vehicle physics & drift calculations
│   ├── ai.js         # AI opponents path-following & lane logic
│   ├── controls.js   # Keyboard & mobile touch input manager
│   ├── hud.js        # Speedometer, tachometer, 2D mini-map & telemetry
│   └── audio.js      # Web Audio API procedural sound synthesizer
└── README.md         # Documentation & Game Guide
```

---

## 📜 License
MIT License. Built with ❤️ for web gamers.
