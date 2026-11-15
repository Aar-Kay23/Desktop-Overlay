const electron = require('electron');

// Auto-fallback: If executed with ELECTRON_RUN_AS_NODE or by Node directly
if (typeof electron === 'string' || process.env.ELECTRON_RUN_AS_NODE) {
  const { spawn } = require('child_process');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const execPath = typeof electron === 'string' ? electron : process.execPath;
  const child = spawn(execPath, [projectRoot], { env, stdio: 'ignore', windowsHide: false, detached: true });
  child.unref();
  process.exit(0);
}

const { app, BrowserWindow, screen, Tray, Menu, globalShortcut, ipcMain, nativeImage } = electron;
const path = require('path');
const { getSystemTelemetry } = require('./telemetry.cjs');
const { sendMediaControl, setMasterVolume, toggleMasterMute, stopMediaDaemon, setDesktopStateListener } = require('./media.cjs');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Single-instance lock: prevents zombie duplicate instances from multiple launcher clicks
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let desktopWin = null;
let islandWin = null;
let tray = null;
let isAlwaysOnTop = false;    // User manual "Float Desktop Widgets Above Apps" toggle from tray
let isDesktopVisible = true;  // Desktop widgets layer visibility
let isIslandVisible = true;   // Dynamic island HUD visibility
let isDesktopActive = false;  // Whether desktop wallpaper / shell is the foreground focus
let _currentMode = 'canvas';  // 'canvas' | 'sidebar' | 'dashboard' | 'minibar' | 'hud'
let telemetryTimer = null;

function handleDesktopStateChange(desktopActive) {
  if (isDesktopActive === desktopActive) return;
  isDesktopActive = desktopActive;

  if (!desktopWin || desktopWin.isDestroyed() || !isDesktopVisible) return;

  // Manual user override: always stay on top
  if (isAlwaysOnTop) {
    desktopWin.setAlwaysOnTop(true, 'floating');
    return;
  }

  if (desktopActive) {
    // Desktop wallpaper / shell / taskbar is active: keep overlay above Progman/WorkerW
    desktopWin.setAlwaysOnTop(true, 'floating');
    if (desktopWin.isMinimized()) desktopWin.restore();
    desktopWin.show();
  } else {
    // User switched to full foreground app (Chrome, Word, VS Code): drop behind so app has full focus
    desktopWin.setAlwaysOnTop(false);
  }
}

setDesktopStateListener((isDesktop) => {
  handleDesktopStateChange(isDesktop);
});

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

async function loadWindow(targetWin, hash = '') {
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 350);

  try {
    await fetch(devUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    targetWin.loadURL(`${devUrl}${hash ? '#' + hash : ''}`);
  } catch {
    clearTimeout(timeoutId);
    targetWin.loadFile(prodPath, { hash });
  }
}

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
    alwaysOnTop: isAlwaysOnTop, // Desktop layer: false by default so regular apps sit in front
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    focusable: true,
    minimizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  // Enable click-through by default so desktop icons, taskbar, and background apps remain fully usable
  desktopWin.setIgnoreMouseEvents(true, { forward: true });

  loadWindow(desktopWin, 'desktop');

  desktopWin.once('ready-to-show', () => {
    if (isDesktopVisible && desktopWin && !desktopWin.isDestroyed()) {
      desktopWin.show();
    }
  });

  // Win32 System Command Hook to catch and mitigate Win+D / Show Desktop minimize sweeps
  if (process.platform === 'win32') {
    const WM_SYSCOMMAND = 0x0112;
    const SC_MINIMIZE = 0xf020;
    try {
      desktopWin.hookWindowMessage(WM_SYSCOMMAND, (wParam) => {
        const cmd = wParam.readUInt32LE(0) & 0xfff0;
        if (cmd === SC_MINIMIZE && isDesktopVisible) {
          [60, 180, 350].forEach((delay) => {
            setTimeout(() => {
              if (desktopWin && !desktopWin.isDestroyed() && isDesktopVisible) {
                if (desktopWin.isMinimized()) desktopWin.restore();
                desktopWin.show();
                if (isAlwaysOnTop || isDesktopActive) desktopWin.setAlwaysOnTop(true, 'floating');
              }
            }, delay);
          });
        }
      });
    } catch {}
  }

  // Intercept DWM minimize event
  desktopWin.on('minimize', (e) => {
    e.preventDefault();
    if (!isDesktopVisible) return;
    [60, 180, 350].forEach((delay) => {
      setTimeout(() => {
        if (desktopWin && !desktopWin.isDestroyed() && isDesktopVisible) {
          if (desktopWin.isMinimized()) desktopWin.restore();
          desktopWin.show();
          if (isAlwaysOnTop || isDesktopActive) desktopWin.setAlwaysOnTop(true, 'floating');
        }
      }, delay);
    });
  });

  desktopWin.on('closed', () => {
    desktopWin = null;
  });
}

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
    alwaysOnTop: true, // Dynamic Island is permanently pinned over all apps
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

  // Pin topmost above all standard windows (like iOS Dynamic Island)
  islandWin.setAlwaysOnTop(true, 'screen-saver');
  // Enable click-through: transparent empty space around the pill passes clicks through to browser tabs & titlebars
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

function startTelemetryBroadcast() {
  if (telemetryTimer) clearInterval(telemetryTimer);

  telemetryTimer = setInterval(async () => {
    // Periodic safeguard: auto-recover if Windows silently minimized desktop widgets
    if (isDesktopVisible && desktopWin && !desktopWin.isDestroyed() && desktopWin.isMinimized()) {
      desktopWin.restore();
      desktopWin.show();
      if (isAlwaysOnTop || isDesktopActive) desktopWin.setAlwaysOnTop(true, 'floating');
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

function toggleDesktopWidgets(forceState) {
  isDesktopVisible = typeof forceState === 'boolean' ? forceState : !isDesktopVisible;
  if (!desktopWin || desktopWin.isDestroyed()) {
    if (isDesktopVisible) createDesktopWindow();
    return;
  }
  if (isDesktopVisible) {
    if (desktopWin.isMinimized()) desktopWin.restore();
    desktopWin.show();
    if (isAlwaysOnTop || isDesktopActive) desktopWin.setAlwaysOnTop(true, 'floating');
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
            desktopWin.setAlwaysOnTop(isAlwaysOnTop, 'floating');
          }
        },
      },
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

// Context-aware IPC Handlers: target the window that fired the event
ipcMain.on('set-interactive', (event, interactive) => {
  const targetWin = BrowserWindow.fromWebContents(event.sender);
  if (targetWin && !targetWin.isDestroyed()) {
    targetWin.setIgnoreMouseEvents(!interactive, { forward: true });
  }
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (desktopWin && !desktopWin.isDestroyed()) {
    desktopWin.setAlwaysOnTop(isAlwaysOnTop, 'floating');
  }
  updateTrayMenu();
});

ipcMain.on('set-overlay-mode', (_event, mode) => {
  _currentMode = mode;
  if (desktopWin && !desktopWin.isDestroyed()) {
    desktopWin.webContents.send('mode:change', mode);
  }
  if (mode === 'hud') {
    toggleDynamicIsland(true);
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

app.on('second-instance', () => {
  toggleDesktopWidgets(true);
  toggleDynamicIsland(true);
});

app.whenReady().then(() => {
  createDesktopWindow();
  createIslandWindow();
  createTray();
  startTelemetryBroadcast();

  // Screen resolution or display metrics change (docking / monitor unplugging)
  screen.on('display-metrics-changed', () => {
    if (desktopWin && !desktopWin.isDestroyed()) {
      desktopWin.setBounds(getDesktopBounds());
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
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
