const electron = require('electron');

// Auto-fallback: If executed by Node directly instead of Electron binary
if (typeof electron === 'string') {
  const { spawn } = require('child_process');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.electron_run_as_node;
  const child = spawn(electron, [projectRoot], { env, stdio: 'ignore', windowsHide: false, detached: true });
  child.unref();
  process.exit(0);
}

delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.electron_run_as_node;

const { app, BrowserWindow, screen, Tray, Menu, globalShortcut, ipcMain, nativeImage } = electron;
const path = require('path');

// Single-instance lock: prevents zombie duplicate instances from multiple launcher clicks
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const koffi = require('koffi');
const { getSystemTelemetry } = require('./telemetry.cjs');
const { sendMediaControl, setMasterVolume, toggleMasterMute, stopMediaDaemon } = require('./media.cjs');

// ─────────────────────────────────────────────────────────────────────────────
// Win32 API Bindings (koffi — zero build step, 0ms latency)
// ─────────────────────────────────────────────────────────────────────────────
const user32 = koffi.load('user32.dll');

const FindWindowA          = user32.func('intptr_t FindWindowA(const char *lpClassName, const char *lpWindowName)');
const FindWindowExA        = user32.func('intptr_t FindWindowExA(intptr_t hWndParent, intptr_t hWndChildAfter, const char *lpszClass, const char *lpszWindow)');
const SendMessageTimeoutA  = user32.func('intptr_t SendMessageTimeoutA(intptr_t hWnd, uint32_t Msg, intptr_t wParam, intptr_t lParam, uint32_t fuFlags, uint32_t uTimeout, _Out_ intptr_t *lpdwResult)');
const SetParent            = user32.func('intptr_t SetParent(intptr_t hWndChild, intptr_t hWndNewParent)');
const GetForegroundWindow  = user32.func('intptr_t GetForegroundWindow()');
const GetClassNameW        = user32.func('int GetClassNameW(intptr_t hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)');
const GetClassNameA        = user32.func('int GetClassNameA(intptr_t hWnd, _Out_ char *lpClassName, int nMaxCount)');
const GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *lpdwProcessId)');
const SetWindowPos         = user32.func('bool SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)');
const ShowWindow           = user32.func('bool ShowWindow(intptr_t hWnd, int nCmdShow)');
const IsWindow             = user32.func('bool IsWindow(intptr_t hWnd)');

// ─────────────────────────────────────────────────────────────────────────────
// Shell Z-Order State
// ─────────────────────────────────────────────────────────────────────────────
let workerWHwnd = 0n;       // The WorkerW that hosts our widget window
let isShellPinned = false;  // True after successful SetParent → WorkerW
let isAlwaysOnTop = false;  // User manual "Float Above Apps" toggle (overrides shell-pin mode)

/**
 * getWindowClassA — ASCII class name lookup (reliable for shell windows)
 */
function getWindowClassA(hwnd) {
  try {
    const buf = Buffer.alloc(256);
    GetClassNameA(hwnd, buf, 256);
    return buf.toString('ascii').replace(/\0.*$/, '');
  } catch {
    return '';
  }
}

/**
 * findWorkerW — Implements the canonical Rainmeter/Wallpaper Engine technique:
 *   1. Find Progman
 *   2. Send 0x052C to spawn a WorkerW behind desktop icons
 *   3. Find the WorkerW that owns SHELLDLL_DefView
 *
 * Returns WorkerW HWND as BigInt, or 0n on failure.
 */
function findWorkerW() {
  try {
    // Step 1: Get Progman handle
    const hProgman = FindWindowA('Progman', null);
    if (!hProgman || hProgman === 0n || hProgman === 0) {
      console.warn('[Shell] FindWindowA("Progman") returned 0 — shell not ready');
      return 0n;
    }
    const hProgmanBig = BigInt(hProgman);

    // Step 2: Send 0x052C to Progman — forces Explorer to spawn/split WorkerW
    const resultBuf = Buffer.alloc(8, 0);
    SendMessageTimeoutA(hProgmanBig, 0x052C, 0n, 0n, 0x0002 /* SMTO_NORMAL */, 1000, resultBuf);

    // Step 3: Enumerate sibling WorkerW windows to find the one with SHELLDLL_DefView
    // We walk the sibling chain: FindWindowExA(0, prev, "WorkerW", null)
    let hWorker = 0n;
    let hCursor = 0n;
    let attempts = 0;
    while (attempts < 64) {
      attempts++;
      const raw = FindWindowExA(0n, hCursor, 'WorkerW', null);
      if (!raw || raw === 0n || raw === 0) break;
      hCursor = BigInt(raw);

      // Check if this WorkerW has SHELLDLL_DefView as a direct child
      const hDefView = FindWindowExA(hCursor, 0n, 'SHELLDLL_DefView', null);
      if (hDefView && hDefView !== 0n && hDefView !== 0) {
        hWorker = hCursor;
        break;
      }
    }

    if (hWorker === 0n) {
      // Fallback: Some Windows builds put SHELLDLL_DefView directly under Progman
      // In that case, use Progman itself as parent
      const hDefViewUnderProgman = FindWindowExA(hProgmanBig, 0n, 'SHELLDLL_DefView', null);
      if (hDefViewUnderProgman && hDefViewUnderProgman !== 0n && hDefViewUnderProgman !== 0) {
        console.warn('[Shell] WorkerW not found — using Progman as parent (older Windows build)');
        hWorker = hProgmanBig;
      }
    }

    console.log(`[Shell] WorkerW found: ${hWorker}`);
    return hWorker;
  } catch (err) {
    console.error('[Shell] findWorkerW error:', err);
    return 0n;
  }
}

/**
 * pinDesktopToShell — Embeds desktopWin into the WorkerW shell layer.
 * After this call:
 *   • Win+D does NOT hide the window (it's inside the shell, not a top-level app)
 *   • Window can NEVER float above normal apps (it's behind SHELLDLL_DefView / icons)
 *   • Click-through on transparent areas still works via setIgnoreMouseEvents
 */
function pinDesktopToShell() {
  if (!desktopWin || desktopWin.isDestroyed()) return false;
  if (isAlwaysOnTop) return false; // User has explicitly chosen "Float Above Apps" mode

  try {
    const hWorker = findWorkerW();
    if (hWorker === 0n) {
      console.warn('[Shell] Cannot pin — WorkerW not found. Will retry...');
      return false;
    }

    const rawHwnd = desktopWin.getNativeWindowHandle();
    const desktopHwnd = rawHwnd.length >= 8
      ? rawHwnd.readBigInt64LE(0)
      : BigInt(rawHwnd.readUInt32LE(0));

    // Embed our window as a child of WorkerW (this is the Rainmeter trick)
    SetParent(desktopHwnd, hWorker);

    // After SetParent the window sits at WorkerW coordinates. Re-position to fill it.
    const bounds = getDesktopBounds();
    SetWindowPos(desktopHwnd, 0n, bounds.x, bounds.y, bounds.width, bounds.height,
      0x0040 /* SWP_SHOWWINDOW */ | 0x0010 /* SWP_NOACTIVATE */);

    workerWHwnd = hWorker;
    isShellPinned = true;
    console.log(`[Shell] Pinned desktopWin (${desktopHwnd}) → WorkerW (${hWorker})`);
    return true;
  } catch (err) {
    console.error('[Shell] pinDesktopToShell error:', err);
    return false;
  }
}

/**
 * unpinDesktopFromShell — Reparents window back to the desktop root (NULL parent).
 * Called when user enables "Float Above Apps" mode.
 */
function unpinDesktopFromShell() {
  if (!desktopWin || desktopWin.isDestroyed()) return;
  try {
    const rawHwnd = desktopWin.getNativeWindowHandle();
    const desktopHwnd = rawHwnd.length >= 8
      ? rawHwnd.readBigInt64LE(0)
      : BigInt(rawHwnd.readUInt32LE(0));
    SetParent(desktopHwnd, 0n); // NULL parent = top-level window again
    workerWHwnd = 0n;
    isShellPinned = false;
    console.log('[Shell] Unpinned — window is top-level again');
  } catch (err) {
    console.error('[Shell] unpinDesktopFromShell error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Foreground Helper (kept for sidebar / HUD mode awareness only)
// ─────────────────────────────────────────────────────────────────────────────
function getActiveForeground() {
  try {
    const hwnd = GetForegroundWindow();
    if (!hwnd || hwnd === 0n || hwnd === 0) return { hwnd: 0, className: '', pid: 0 };

    const bufCls = Buffer.alloc(512);
    GetClassNameW(hwnd, bufCls, 256);
    const className = bufCls.toString('utf16le').replace(/\0.*$/, '');

    const bufPid = Buffer.alloc(4);
    GetWindowThreadProcessId(hwnd, bufPid);
    const pid = bufPid.readUInt32LE(0);

    return { hwnd, className, pid };
  } catch {
    return { hwnd: 0, className: '', pid: 0 };
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

let desktopWin = null;
let islandWin = null;
let tray = null;
let isDesktopVisible = true;
let isIslandVisible = true;
let _currentMode = 'canvas';
let telemetryTimer = null;
let shellPinRetryTimer = null;

// ─────────────────────────────────────────────────────────────────────────────
// Window Bounds
// ─────────────────────────────────────────────────────────────────────────────
function getDesktopBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  return { x, y, width, height };
}

function getIslandBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const width = 440;
  const height = 260;
  const x = Math.round(workArea.x + (workArea.width - width) / 2);
  const y = workArea.y + 4;
  return { x, y, width, height };
}

// ─────────────────────────────────────────────────────────────────────────────
// Window Loading
// ─────────────────────────────────────────────────────────────────────────────
async function loadWindow(targetWin, viewName = 'desktop') {
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 350);

  try {
    await fetch(devUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    targetWin.loadURL(`${devUrl}?view=${viewName}#${viewName}`);
  } catch {
    clearTimeout(timeoutId);
    targetWin.loadFile(prodPath, { hash: viewName, query: { view: viewName } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Window Creation
// ─────────────────────────────────────────────────────────────────────────────
function createDesktopWindow() {
  if (desktopWin && !desktopWin.isDestroyed()) return;
  const bounds = getDesktopBounds();

  desktopWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    // Key: alwaysOnTop starts FALSE. Shell-pin (WorkerW) handles Z-order properly.
    alwaysOnTop: false,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    focusable: true,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  // Click-through by default; toggled off when hovering interactive widgets
  desktopWin.setIgnoreMouseEvents(true, { forward: true });

  loadWindow(desktopWin, 'desktop');

  desktopWin.once('ready-to-show', () => {
    if (isDesktopVisible && desktopWin && !desktopWin.isDestroyed()) {
      desktopWin.showInactive();

      if (isAlwaysOnTop) {
        // User wants to float above apps — skip WorkerW pin, use alwaysOnTop
        desktopWin.setAlwaysOnTop(true, 'floating');
      } else {
        // Canonical fix: pin to WorkerW shell layer with retry
        attemptShellPin();
      }
    }
  });

  // Safety net: if Windows somehow minimizes us (edge case), restore immediately
  desktopWin.on('minimize', (e) => {
    e.preventDefault();
    if (!isDesktopVisible) return;
    setImmediate(() => {
      if (desktopWin && !desktopWin.isDestroyed()) {
        desktopWin.restore();
        desktopWin.showInactive();
      }
    });
  });

  desktopWin.on('closed', () => {
    desktopWin = null;
    isShellPinned = false;
    workerWHwnd = 0n;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell Pin with Retry (Explorer can be slow to spawn WorkerW on startup)
// ─────────────────────────────────────────────────────────────────────────────
function attemptShellPin(attempt = 0) {
  if (isAlwaysOnTop) return; // Don't pin if user chose float mode
  if (!desktopWin || desktopWin.isDestroyed()) return;

  if (shellPinRetryTimer) {
    clearTimeout(shellPinRetryTimer);
    shellPinRetryTimer = null;
  }

  const success = pinDesktopToShell();
  if (!success && attempt < 8) {
    // Retry with exponential backoff: 500ms, 1s, 1.5s, 2s...
    const delay = 500 + attempt * 500;
    console.log(`[Shell] Pin attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
    shellPinRetryTimer = setTimeout(() => attemptShellPin(attempt + 1), delay);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Island Window
// ─────────────────────────────────────────────────────────────────────────────
function createIslandWindow() {
  if (islandWin && !islandWin.isDestroyed()) return;
  const bounds = getIslandBounds();

  islandWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: true,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  islandWin.setAlwaysOnTop(true, 'screen-saver');
  islandWin.setIgnoreMouseEvents(true, { forward: true });

  loadWindow(islandWin, 'island');

  islandWin.once('ready-to-show', () => {
    if (isIslandVisible && islandWin && !islandWin.isDestroyed()) {
      islandWin.show();
    }
  });

  islandWin.on('closed', () => {
    islandWin = null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry Broadcast (every 2s — no focus polling needed anymore)
// ─────────────────────────────────────────────────────────────────────────────
function startTelemetryBroadcast() {
  if (telemetryTimer) clearInterval(telemetryTimer);

  telemetryTimer = setInterval(async () => {
    // Periodic shell-pin health check: if Explorer restarted, WorkerW is gone
    if (!isAlwaysOnTop && isDesktopVisible && desktopWin && !desktopWin.isDestroyed()) {
      if (isShellPinned && workerWHwnd !== 0n) {
        // Verify WorkerW is still a valid window
        try {
          const stillValid = IsWindow(workerWHwnd);
          if (!stillValid) {
            console.warn('[Shell] WorkerW gone (Explorer restarted?) — re-pinning...');
            isShellPinned = false;
            workerWHwnd = 0n;
            // Small delay to let Explorer fully restart
            setTimeout(() => attemptShellPin(), 2000);
          }
        } catch {}
      } else if (!isShellPinned) {
        // Not yet pinned — keep trying
        attemptShellPin();
      }
    }

    const data = await getSystemTelemetry();
    if (data) {
      if (desktopWin && !desktopWin.isDestroyed()) {
        desktopWin.webContents.send('telemetry:update', data);
      }
      if (islandWin && !islandWin.isDestroyed()) {
        islandWin.webContents.send('telemetry:update', data);
      }
    }
  }, 2000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Helpers
// ─────────────────────────────────────────────────────────────────────────────
function toggleDesktopWidgets(forceState) {
  isDesktopVisible = typeof forceState === 'boolean' ? forceState : !isDesktopVisible;
  if (!desktopWin || desktopWin.isDestroyed()) {
    if (isDesktopVisible) createDesktopWindow();
    return;
  }
  if (isDesktopVisible) {
    if (desktopWin.isMinimized()) desktopWin.restore();
    desktopWin.showInactive();
    if (isAlwaysOnTop) {
      desktopWin.setAlwaysOnTop(true, 'floating');
    } else if (!isShellPinned) {
      attemptShellPin();
    }
  } else {
    desktopWin.hide();
  }
  if (tray) updateTrayMenu();
}

function toggleDynamicIsland(forceState) {
  isIslandVisible = typeof forceState === 'boolean' ? forceState : !isIslandVisible;
  if (!islandWin || islandWin.isDestroyed()) {
    if (isIslandVisible) createIslandWindow();
    return;
  }
  if (isIslandVisible) {
    islandWin.show();
    islandWin.setAlwaysOnTop(true, 'screen-saver');
  } else {
    islandWin.hide();
  }
  if (tray) updateTrayMenu();
}

// ─────────────────────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────────────────────
let updateTrayMenu = () => {};

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'tray-icon.png');
  let icon;
  try {
    const raw = nativeImage.createFromPath(iconPath);
    icon = raw.isEmpty() ? nativeImage.createEmpty() : raw.resize({ width: 16, height: 16 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  try {
    tray = new Tray(icon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(0)) : icon);
    tray.setToolTip('Desktop Widgets & Dynamic Island');
  } catch {}

  updateTrayMenu = () => {
    if (!tray) return;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Dynamic Island (Pinned Over All Apps)',
        type: 'checkbox',
        checked: isIslandVisible,
        click: (item) => toggleDynamicIsland(item.checked),
      },
      {
        label: 'Desktop Widgets (Canvas Layer)',
        type: 'checkbox',
        checked: isDesktopVisible,
        click: (item) => toggleDesktopWidgets(item.checked),
      },
      { type: 'separator' },
      {
        label: 'Float Desktop Widgets Above Apps',
        type: 'checkbox',
        checked: isAlwaysOnTop,
        click: (item) => {
          isAlwaysOnTop = item.checked;
          if (desktopWin && !desktopWin.isDestroyed()) {
            if (isAlwaysOnTop) {
              // Unpin from shell, then float above everything
              unpinDesktopFromShell();
              desktopWin.setAlwaysOnTop(true, 'floating');
            } else {
              // Go back to shell-pinned desktop layer
              desktopWin.setAlwaysOnTop(false);
              attemptShellPin();
            }
          }
          updateTrayMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Reload Everything',
        click: () => {
          if (desktopWin && !desktopWin.isDestroyed()) desktopWin.reload();
          if (islandWin && !islandWin.isDestroyed()) islandWin.reload();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();

  tray.on('click', () => {
    toggleDesktopWidgets(true);
    toggleDynamicIsland(true);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('set-interactive', (event, interactive) => {
  const targetWin = BrowserWindow.fromWebContents(event.sender);
  if (targetWin && !targetWin.isDestroyed()) {
    targetWin.setIgnoreMouseEvents(!interactive, { forward: true });
  }
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (desktopWin && !desktopWin.isDestroyed()) {
    if (isAlwaysOnTop) {
      unpinDesktopFromShell();
      desktopWin.setAlwaysOnTop(true, 'floating');
    } else {
      desktopWin.setAlwaysOnTop(false);
      attemptShellPin();
    }
  }
  updateTrayMenu();
});

ipcMain.on('set-overlay-mode', (_event, mode) => {
  _currentMode = mode;
  if (mode === 'hud') {
    if (desktopWin && !desktopWin.isDestroyed()) desktopWin.hide();
    toggleDynamicIsland(true);
  } else {
    toggleDesktopWidgets(true);
    if (desktopWin && !desktopWin.isDestroyed()) {
      desktopWin.webContents.send('mode:change', mode);
    }
  }
});

ipcMain.on('media:control', (_event, action) => {
  sendMediaControl(action);
});

ipcMain.on('media:volume', (_event, vol) => {
  setMasterVolume(vol);
});

ipcMain.on('media:mute', () => {
  toggleMasterMute();
});

ipcMain.on('system:action', (_event, action) => {
  if (process.platform !== 'win32') return;
  const { exec } = require('child_process');
  if (action === 'mute') {
    toggleMasterMute();
  } else if (action === 'lock') {
    exec('rundll32.exe user32.dll,LockWorkStation');
  } else if (action === 'taskmgr') {
    exec('start taskmgr.exe');
  } else if (action === 'sleep') {
    exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
app.on('second-instance', () => {
  toggleDesktopWidgets(true);
  toggleDynamicIsland(true);
});

app.whenReady().then(() => {
  createDesktopWindow();
  createIslandWindow();
  createTray();
  startTelemetryBroadcast();

  // Screen metrics change (monitor plug/unplug, DPI change, resolution change)
  screen.on('display-metrics-changed', () => {
    if (desktopWin && !desktopWin.isDestroyed()) {
      const bounds = getDesktopBounds();
      desktopWin.setBounds(bounds);
      // Re-pin after display change — coordinates may have shifted
      if (!isAlwaysOnTop) {
        isShellPinned = false;
        setTimeout(() => attemptShellPin(), 500);
      }
    }
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.setBounds(getIslandBounds());
    }
  });

  // Global Hotkeys
  try {
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      toggleDesktopWidgets();
    });
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      toggleDynamicIsland();
    });
  } catch (err) {
    console.warn('Hotkey register error', err);
  }
});

app.on('will-quit', () => {
  app.isQuitting = true;
  stopMediaDaemon();
  globalShortcut.unregisterAll();
  if (telemetryTimer) clearInterval(telemetryTimer);
  if (shellPinRetryTimer) clearTimeout(shellPinRetryTimer);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
