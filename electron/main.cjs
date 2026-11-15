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
const { sendMediaControl, setMasterVolume, toggleMasterMute, stopMediaDaemon } = require('./media.cjs');

// Single-instance lock: prevents zombie duplicate instances from multiple launcher clicks
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let win = null;
let tray = null;
let isAlwaysOnTop = false; // DESKTOP ONLY: default to false so apps/tabs sit in front
let isUserHidden = false;   // Distinguishes intentional user hides from OS/Win+D minimize
let telemetryTimer = null;

function getWindowBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  return {
    x: x,
    y: y,
    width: width,
    height: height,
  };
}

function createWindow() {
  const bounds = getWindowBounds();

  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: isAlwaysOnTop,
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
  win.setIgnoreMouseEvents(true, { forward: true });

  // Load production dist or local dev server
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  fetch(devUrl)
    .then(() => {
      win.loadURL(devUrl);
    })
    .catch(() => {
      win.loadFile(prodPath);
    });

  // Win32 System Command Hook to catch and mitigate Win+D / Show Desktop minimize sweeps
  if (process.platform === 'win32') {
    const WM_SYSCOMMAND = 0x0112;
    const SC_MINIMIZE = 0xf020;
    try {
      win.hookWindowMessage(WM_SYSCOMMAND, (wParam) => {
        const cmd = wParam.readUInt32LE(0) & 0xfff0;
        if (cmd === SC_MINIMIZE && !isUserHidden) {
          [60, 180, 350].forEach((delay) => {
            setTimeout(() => {
              if (win && !win.isDestroyed() && !isUserHidden) {
                if (win.isMinimized()) win.restore();
                win.show();
                if (isAlwaysOnTop) win.setAlwaysOnTop(true, 'floating');
              }
            }, delay);
          });
        }
      });
    } catch {}
  }

  // Win+D / Show Desktop protection:
  // When Win+D or taskbar "Show Desktop" is triggered, Windows DWM commands a minimize.
  // We intercept it, allow DWM to finish minimizing foreground windows, then restore the desktop layer cleanly.
  win.on('minimize', (e) => {
    e.preventDefault();
    if (isUserHidden) return;
    [60, 180, 350].forEach((delay) => {
      setTimeout(() => {
        if (win && !win.isDestroyed() && !isUserHidden) {
          if (win.isMinimized()) win.restore();
          win.show();
          if (isAlwaysOnTop) win.setAlwaysOnTop(true, 'floating');
        }
      }, delay);
    });
  });

  // Prevent unwanted DWM hide on Show Desktop sweeps
  win.on('hide', () => {
    if (!isUserHidden && !app.isQuitting) {
      setTimeout(() => {
        if (win && !win.isDestroyed() && !isUserHidden) {
          if (win.isMinimized()) win.restore();
          win.show();
          if (isAlwaysOnTop) win.setAlwaysOnTop(true, 'floating');
        }
      }, 100);
    }
  });

  win.on('closed', () => {
    win = null;
    if (telemetryTimer) clearInterval(telemetryTimer);
  });

  // Start real hardware telemetry polling loop
  startTelemetryBroadcast();
}

function startTelemetryBroadcast() {
  if (telemetryTimer) clearInterval(telemetryTimer);

  telemetryTimer = setInterval(async () => {
    if (win && !win.isDestroyed()) {
      // Periodic safeguard: auto-recover if Windows silently minimized the window
      if (!isUserHidden && win.isMinimized()) {
        win.restore();
        win.show();
        if (isAlwaysOnTop) win.setAlwaysOnTop(true, 'floating');
      }

      const data = await getSystemTelemetry();
      if (data) {
        win.webContents.send('telemetry:update', data);
      }
    }
  }, 2000);
}

function bringToFront() {
  if (!win || win.isDestroyed()) {
    createWindow();
    return;
  }
  isUserHidden = false;
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  // Force foreground layer activation: briefly elevate to top then restore user's preferred z-order
  win.setAlwaysOnTop(true, 'floating');
  win.focus();
  if (!isAlwaysOnTop) {
    setTimeout(() => {
      if (win && !win.isDestroyed() && !isAlwaysOnTop) {
        win.setAlwaysOnTop(false);
      }
    }, 250);
  }
}

function toggleVisibility() {
  if (!win || win.isDestroyed()) {
    createWindow();
    return;
  }
  if (win.isMinimized() || !win.isVisible() || isUserHidden) {
    bringToFront();
  } else {
    isUserHidden = true;
    win.hide();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'tray-icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  try {
    tray = new Tray(icon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(0)) : icon);
    tray.setToolTip('Desktop Widgets');
  } catch {}

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Desktop Widgets',
        click: () => bringToFront(),
      },
      {
        label: 'Hide Desktop Widgets',
        click: () => {
          isUserHidden = true;
          if (win && !win.isDestroyed()) win.hide();
        },
      },
      { type: 'separator' },
      {
        label: 'Float Above All Windows',
        type: 'checkbox',
        checked: isAlwaysOnTop,
        click: (item) => {
          isAlwaysOnTop = item.checked;
          if (win && !win.isDestroyed()) {
            win.setAlwaysOnTop(isAlwaysOnTop, 'floating');
          }
        },
      },
      {
        label: 'Reload Widgets',
        click: () => {
          if (win && !win.isDestroyed()) win.reload();
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

  updateMenu();

  tray.on('click', () => {
    bringToFront();
    updateMenu();
  });
}

// IPC Handlers
let lastIgnoreMouse = true;
ipcMain.on('set-interactive', (_event, interactive) => {
  if (win && !win.isDestroyed()) {
    const shouldIgnore = !interactive;
    if (lastIgnoreMouse !== shouldIgnore) {
      lastIgnoreMouse = shouldIgnore;
      if (interactive) {
        win.setIgnoreMouseEvents(false);
      } else {
        win.setIgnoreMouseEvents(true, { forward: true });
      }
    }
  }
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(isAlwaysOnTop, 'floating');
  }
});

ipcMain.on('set-overlay-mode', (_event, mode) => {
  if (win && !win.isDestroyed()) {
    if (mode === 'hud') {
      // Dynamic Island pinned above ALL applications and windows
      win.setAlwaysOnTop(true, 'floating');
    } else if (!isAlwaysOnTop) {
      // Desktop widgets return to native desktop layer behind active apps
      win.setAlwaysOnTop(false);
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

app.on('second-instance', () => {
  bringToFront();
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Screen resolution or display metrics change (docking / monitor unplugging)
  screen.on('display-metrics-changed', () => {
    if (win && !win.isDestroyed()) {
      win.setBounds(getWindowBounds());
    }
  });

  // Global Hotkey: Ctrl+Shift+D to toggle visibility
  try {
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      toggleVisibility();
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
