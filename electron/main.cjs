const electron = require('electron');

// Auto-fallback: If executed by Node instead of Electron binary, spawn Electron directly
if (typeof electron === 'string') {
  const { spawn } = require('child_process');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const child = spawn(electron, [projectRoot], { stdio: 'inherit', windowsHide: false, detached: true });
  child.unref();
  process.exit(0);
}

const { app, BrowserWindow, screen, Tray, Menu, globalShortcut, ipcMain, nativeImage } = electron;
const path = require('path');
const { getSystemTelemetry } = require('./telemetry.cjs');

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
    minimizable: true, // Required so 'minimize' event triggers on Win+D / Show Desktop
    type: 'toolbar',   // WS_EX_TOOLWINDOW style on Windows
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

  // Win+D / Show Desktop protection:
  // When Win+D or taskbar "Show Desktop" is triggered, Windows DWM commands a minimize.
  // We intercept it, allow DWM to finish minimizing other foreground windows (60ms), then restore the desktop layer.
  win.on('minimize', (e) => {
    e.preventDefault();
    setTimeout(() => {
      if (win && !win.isDestroyed() && !isUserHidden) {
        win.restore();
        win.showInactive();
        if (!isAlwaysOnTop) {
          win.setAlwaysOnTop(false);
          win.blur(); // Yield keyboard and mouse focus back to Windows desktop Explorer
        }
      }
    }, 60);
  });

  // Prevent unwanted DWM hide on Show Desktop sweeps
  win.on('hide', () => {
    if (!isUserHidden && !app.isQuitting) {
      setTimeout(() => {
        if (win && !win.isDestroyed() && !isUserHidden) {
          win.showInactive();
          if (!isAlwaysOnTop) {
            win.setAlwaysOnTop(false);
            win.blur();
          }
        }
      }, 60);
    }
  });

  win.on('blur', () => {
    // Keep at desktop layer when user is working in other apps
    if (!isAlwaysOnTop && win && !win.isDestroyed()) {
      win.setAlwaysOnTop(false);
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
        win.showInactive();
        if (!isAlwaysOnTop) win.blur();
      }

      const data = await getSystemTelemetry();
      if (data) {
        win.webContents.send('telemetry:update', data);
      }
    }
  }, 1500);
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(0)) : icon);
  tray.setToolTip('Desktop Widgets');

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: win && win.isVisible() && !isUserHidden ? 'Hide Desktop Widgets' : 'Show Desktop Widgets',
        click: () => toggleVisibility(),
      },
      { type: 'separator' },
      {
        label: 'Float Above All Windows',
        type: 'checkbox',
        checked: isAlwaysOnTop,
        click: (item) => {
          isAlwaysOnTop = item.checked;
          if (win) {
            win.setAlwaysOnTop(isAlwaysOnTop);
          }
        },
      },
      {
        label: 'Reload Widgets',
        click: () => {
          if (win) win.reload();
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
    toggleVisibility();
    updateMenu();
  });
}

function toggleVisibility() {
  if (!win) {
    createWindow();
    return;
  }
  if (win.isVisible() && !isUserHidden) {
    isUserHidden = true;
    win.hide();
  } else {
    isUserHidden = false;
    win.show();
    if (!isAlwaysOnTop) {
      win.setAlwaysOnTop(false);
      win.blur();
    }
  }
}

// IPC Handlers
ipcMain.on('set-interactive', (_event, interactive) => {
  if (win && !win.isDestroyed()) {
    if (interactive) {
      win.setIgnoreMouseEvents(false);
    } else {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  }
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (win) {
    win.setAlwaysOnTop(isAlwaysOnTop);
  }
});

app.on('second-instance', () => {
  if (win && !win.isDestroyed()) {
    isUserHidden = false;
    if (!win.isVisible()) win.show();
    if (win.isMinimized()) win.restore();
    if (!isAlwaysOnTop) win.blur();
  }
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
  globalShortcut.unregisterAll();
  if (telemetryTimer) clearInterval(telemetryTimer);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
