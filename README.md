# Desktop-Overlay 🍏⚡

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80" width="800" alt="Desktop Overlay Banner" style="border-radius: 16px;" />
</p>

<p align="center">
  <b>macOS Sonoma / Sequoia-inspired Minimalist Glass Desktop Widgets for Windows.</b><br>
  Sits strictly on your desktop wallpaper behind open windows and apps. Fully modular, size-adjustable (S / M / L), with progressive disclosure and live Windows hardware telemetry.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06b6d4?style=flat-square&logo=tailwindcss" alt="TailwindCSS v4">
  <img src="https://img.shields.io/badge/Framer_Motion-14.14-f59e0b?style=flat-square" alt="Framer Motion">
  <img src="https://img.shields.io/badge/Electron-24.22-47848f?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/Tests-17%2F17%20Passing-10b981?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

---

## 🌟 What is Desktop-Overlay?

**Desktop-Overlay** brings the beloved **macOS Sonoma / Sequoia desktop widget experience** directly to Windows 10/11.

Unlike annoying "always-on-top" floating overlays that get in the way of your code editor and browser tabs, Desktop-Overlay **lives strictly on your desktop surface** (`alwaysOnTop: false`, behind active apps and windows). When you minimize windows or peek at your desktop, your sleek frosted glass widgets are resting quietly on your wallpaper.

---

## 💎 Design Philosophy: macOS Minimalist Glass

- **Frosted Acrylic Glass:** Crafted using `.macos-glass` with `backdrop-filter: blur(28px) saturate(180%)`, deep soft shadows, and subtle `rgba(255, 255, 255, 0.09)` hairline borders. No obnoxious neon lasers or distracting cyberpunk gradients.
- **Apple Squircles:** `rounded-[24px]` continuous corner curves adhering to Apple HIG guidelines.
- **Progressive Disclosure:** Widgets show less when compact, and expand into deep diagnostic detail as you resize them from **Small (S)** to **Medium (M)** to **Large (L)**.

| Size | Dimensions | Philosophy |
|:---:|:---:|:---|
| **Small (S)** | `164px × 164px` | Minimalist glanceable status — circular radial ring, percentage, and key status. |
| **Medium (M)** | `344px × 164px` | Balanced telemetry — dual-axis metrics, live 30-second sparkline graph, and temperature/frequency. |
| **Large (L)** | `344px × 344px` | Deep cockpit view — per-core micro-heatbars, top process consumers, and multi-drive volumes. |

---

## 🧩 10 Modular Core Widgets

1. **⚡ Processor (CPU):**
   - *S:* Clean radial gauge with aggregate % load and clock frequency.
   - *M:* Real-time load %, 30-sample smooth SVG sparkline, clock GHz, package temperature, and active core count.
   - *L:* Full 8/12/16-core micro-load bars + live list of top CPU consumer processes.
2. **🎮 Graphics (GPU):**
   - *S:* Dedicated GPU load ring + VRAM allocation meter.
   - *M:* 3D graphics engine load %, VRAM bar, power draw in Watts, and junction temperature.
   - *L:* Dedicated GPU specifications, memory composition, fan speed %, and hardware model.
3. **🧠 Memory (RAM):**
   - *S:* Physical DDR4/DDR5 usage percentage ring + total GB allocation.
   - *M:* Live memory sparkline, physical used/total GB, and pagefile swap breakdown.
   - *L:* Detailed memory composition (Active, Standby, Swap, Hardware Reserved) + top RAM applications.
4. **💾 Storage Drives:**
   - *S:* Primary `C:` drive gauge with free capacity.
   - *M:* Multi-drive stacked horizontal progress bars (`C:`, `D:`, NVMe, external SSDs) with percentage and free space.
   - *L:* Exhaustive logical volume overview with read/write activity indicators.
5. **🌐 Network Radar:**
   - *S:* Download and Upload throughput badges with live network direction indicators.
   - *M:* Dual inbound/outbound bandwidth sparklines and ICMP ping latency.
   - *L:* Network interface stats, total session traffic volume, and network adapter details.
6. **🔋 Power & Battery:**
   - *S:* Circular battery level ring with animated charging bolt indicator.
   - *M:* Battery percentage, power source (AC Adapter vs. Battery), condition ("Normal / Good"), and hardware model.
   - *L:* Full battery diagnostics: voltage (e.g. 16.4V), discharge profile, and health condition.
7. **🤖 AI Coding Quotas:**
   - *S:* Current active AI quota ring with percentage used.
   - *M:* Dual 5-hour burst session limit and weekly allowance for **Google Antigravity** & **Claude Code**, plus real-time burn rate.
   - *L:* Multi-provider comparison matrix (Antigravity, Claude Code, OpenAI Codex) with projected depletion countdowns.
8. **🎵 Now Playing (Media):**
   - *S:* Album artwork squircle with track name and quick play/pause button.
   - *M:* Track title, artist, album name, progress scrubber, volume fader, and playback controls.
   - *L:* Expanded studio view with interactive volume slider and media queue preview.
9. **🔥 Top Processes:**
   - *S:* Total active running process count badge.
   - *M:* Top 3 CPU/RAM consumer processes on your PC with 1-click termination.
   - *L:* Mini Task Manager view showing PID, executable name, live CPU %, and RAM footprint.
10. **⏱️ Clock & World Time:**
    - *S:* Minimalist Apple-typography local time and date.
    - *M:* Local clock, system uptime (in hours), and UTC / Tokyo secondary clocks.
    - *L:* Global financial time centers (New York, London, Tokyo, Sydney) and system boot uptime.

---

## 💻 Real Hardware Telemetry (No Mock Simulations)

Desktop-Overlay connects directly to your Windows PC hardware using Node.js and `systeminformation` in the Electron background:
- **CPU:** Real aggregate load and per-core utilization (`load.cpus`).
- **GPU:** Real GPU model name (`Intel Iris Xe Graphics` / `NVIDIA RTX`) and load.
- **RAM:** Real physical memory allocated and available.
- **Disks:** Real Windows volume capacities and free space (`C:`, `D:`).
- **Network:** Real interface throughput (Mbps down/up).
- **Battery:** Real hardware battery percentage, AC adapter charging state, and voltage.
- **Processes:** Real Windows task list with idle threads filtered out.

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

### 3. Launch Desktop Widgets
Double-click `start-desktop-overlay.bat` or run:
```cmd
start-desktop-overlay.bat
```
*(Or via npm)*:
```bash
npm start
```

### 4. How It Behaves on Your Desktop:
- **Desktop Placement:** Renders directly on your desktop wallpaper. Your active browser tabs, VS Code, and other apps open freely in front of it.
- **Add / Remove / Resize Widgets:** Click **+ Add Widget** in the top toolbar to browse the gallery, or click **Edit** to resize (`S`, `M`, `L`) or remove individual tiles.
- **System Tray:** Click the tray icon to quickly show/hide, or right-click to toggle "Float Above All Windows" if you temporarily want it pinned.
- **Global Hotkey:** Press **`Ctrl+Shift+D`** anywhere in Windows to toggle visibility.

---

## 🧪 Automated Testing (Vitest)

All tests are verified and passing 100%:
```bash
npm test
```
```
 ✓ src/test/mockData.test.ts (2 tests)
 ✓ src/test/formatters.test.ts (5 tests)
 ✓ src/test/components.test.tsx (4 tests)
 ✓ src/test/TelemetryContext.test.tsx (1 test)
 ✓ src/test/widgets.test.tsx (5 tests)

 Test Files  5 passed (5)
      Tests  17 passed (17)
```

---

## 🏗️ Production Build

To compile TypeScript and bundle with Vite:
```bash
npm run build
```

---

## 📄 License

MIT © [Aar-Kay23](https://github.com/Aar-Kay23)
