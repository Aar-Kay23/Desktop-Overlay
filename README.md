# Desktop-Overlay ⚡

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80" width="800" alt="Desktop Overlay Banner" style="border-radius: 12px;" />
</p>

<p align="center">
  <b>A modernized, scalable, cyberpunk glassmorphic Desktop Overlay HUD & Widget System for Windows.</b><br>
  Real-time PC Hardware Vitals, AI Coding Quotas (Antigravity, Claude Code, Codex), Media Studio, Interactive Claude Approvals & StreamDeck Controls.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06b6d4?style=flat-square&logo=tailwindcss" alt="TailwindCSS v4">
  <img src="https://img.shields.io/badge/Framer_Motion-14.14-f59e0b?style=flat-square" alt="Framer Motion">
  <img src="https://img.shields.io/badge/Tests-12%2F12%20Passing-10b981?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

---

## 🌟 Overview

**Desktop-Overlay** is an ultra-modern, glassmorphic desktop HUD inspired by **21st.dev**, Aceternity, and Apple Dynamic Island. It translates the rich telemetry and automation ecosystem of [PhoneBox](https://github.com/ersinkoc/phonebox) directly onto your primary or secondary Windows PC desktop.

### 📐 Four Versatile Presentation Modes

1. **Sidebar Dock (380px–420px):** Vertical docked panel matching the Windows AppBar pattern. Perfect for snapping to the screen edge or on a secondary monitor.
2. **Dynamic HUD (Apple Dynamic Island):** Compact floating status pill anchored at the top of your screen that smoothly expands into an interactive glass cockpit on hover or click.
3. **Full Grid Dashboard:** Comprehensive multi-column telemetry cockpit with high-density sparklines, circular gauges, and resource heatmaps.
4. **Mini Bar:** Minimalist horizontal status pill (~36px height) designed for gamers, streamers, or minimalists.

---

## 🚀 Key Modules & Capabilities

- **⚡ Hardware Vitals & Telemetry:**
  - **CPU:** Real-time load %, live frequency, core-by-core micro-meters, package temperatures, and SVG sparkline history.
  - **GPU:** Dedicated GPU load, VRAM allocation bar, junction hotspot temp, power draw in Watts, and fan speed.
  - **Memory & Storage:** Physical DDR5 RAM usage, swap/pagefile allocation, and NVMe Gen5 drive fill meters.
  - **Network Radar:** Live Download/Upload Mbps bandwidth sparklines, ping latency indicator with health thresholds.
- **🤖 AI Coding Quota Cockpit:**
  - **Google Antigravity:** Real-time monitoring of session limits, weekly pools, active model (e.g., Gemini 3.8 Flash), and burn rate.
  - **Claude Code:** 5-hour rate limits, weekly token pools, and live burn-rate forecasting (tokens/min).
  - **OpenAI Codex:** Hourly TPM pools and monthly allowance.
- **🛡️ Interactive Claude Code Approvals:**
  - Intercepts incoming `PermissionRequest` hooks from Claude Code (bash commands, file writes).
  - Allows single-click **Allow** or **Deny** directly from the desktop overlay with interactive confetti confirmation!
- **🎵 Media Studio & Audio:**
  - Live now-playing track, artist, album art with ambient background glow, scrub bar, playback controls, and volume faders.
- **🔥 Top Process Heatmap:**
  - Real-time monitor of heaviest CPU/RAM processes with instant **End Process** termination actions.
- **🎛️ StreamDeck Quick Actions:**
  - One-tap triggers for Mic Mute/Unmute, RAM Cache Trim, Lock PC, and launching VS Code or Terminal.

---

## 🏗️ Architecture & DRY Engineering

Built with strict adherence to **DRY (Don't Repeat Yourself)** principles and clean modular architecture:

```
src/
├── types/
│   └── telemetry.ts           # Exhaustive TypeScript models for all hardware & AI domains
├── lib/
│   ├── utils.ts               # Byte/Megabyte formatters, duration helpers, threshold colors
│   └── mockData.ts            # Realistic undulating simulation generator for standalone use
├── services/
│   └── agentConnector.ts      # Native Server-Sent Events (SSE) connector to PhoneBox Agent
├── context/
│   └── TelemetryContext.tsx   # Centralized state provider, live vs. simulation source toggle
├── components/
│   ├── ui/                    # 21st.dev-inspired primitives (MetricCard, CircularGauge, Sparkline, ProgressBar, GlassBadge)
│   ├── modules/               # Domain widgets (SystemVitals, AIQuotaCockpit, ClaudeApprovals, MediaStudio, etc.)
│   ├── layout/                # Display form factors (SidebarDock, FloatingHUD, FullDashboard, MiniBar)
│   └── settings/              # SettingsModal for host endpoints and thresholds
```

### Dual-Engine Connectivity
- **Live PhoneBox Mode:** Connects to `http://127.0.0.1:8765/api/stream` via native SSE, reading live hardware performance counters, NVML GPU metrics, WASAPI volume, and Antigravity language server quotas.
- **Simulation Mode:** Enables instant standalone testing and demonstrations out-of-the-box without requiring any local daemons or background agents.

---

## 🛠️ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+ or v22+
- npm v10+

### 2. Installation
```bash
git clone https://github.com/Aar-Kay23/Desktop-Overlay.git
cd Desktop-Overlay
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run as an Integrated Native Windows Desktop Dock
Launch the included batch script or run `npm start`:
```cmd
start-desktop-overlay.bat
```
*(Or via npm)*:
```bash
npm start
```
This launches a **true frameless, transparent desktop widget dock** that:
- Docks firmly to the right side of your desktop screen.
- Has zero window borders or titlebars.
- Does not clutter the taskbar (`skipTaskbar: true`).
- Stays accessible and clickable like a native widget alongside your open code or apps.
- Toggle visibility at any time with global hotkey: **`Ctrl+Shift+D`**.
- Switch dock side (Left or Right) or toggle "Always on Top" via the Windows System Tray menu.

### 5. Automated Testing (Vitest)
```bash
npm test
```
Runs 12 unit and integration tests across data formatters, simulation physics, context state transitions, and component rendering.

### 6. Production Build
```bash
npm run build
```

---

## 📄 License

MIT © [Aar-Kay23](https://github.com/Aar-Kay23)
