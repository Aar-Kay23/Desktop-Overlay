const { app, BrowserWindow, screen, Tray, Menu, globalShortcut, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { getSystemTelemetry } = require('./telemetry.cjs');

let win = null;
let tray = null;
let isAlwaysOnTop = false; // DESKTOP ONLY: default to false so apps/tabs sit in front
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
    type: 'toolbar', // Desktop widget classification
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

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

  // Win+D / Show Desktop protection: prevent minimizing
  win.on('minimize', (e) => {
    e.preventDefault();
    win.restore();
    if (!isAlwaysOnTop) win.moveBottom();
  });

  win.on('blur', () => {
    // Keep at desktop layer when user is working in other apps
    if (!isAlwaysOnTop && win) {
      win.moveBottom();
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
        label: win && win.isVisible() ? 'Hide Desktop Widgets' : 'Show Desktop Widgets',
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
            if (!isAlwaysOnTop) win.moveBottom();
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
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    if (!isAlwaysOnTop) win.moveBottom();
  }
}

// IPC Handlers
ipcMain.on('set-interactive', (_event, interactive) => {
  if (win) {
    win.setIgnoreMouseEvents(!interactive, { forward: true });
  }
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (win) {
    win.setAlwaysOnTop(isAlwaysOnTop);
    if (!isAlwaysOnTop) win.moveBottom();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

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
  globalShortcut.unregisterAll();
  if (telemetryTimer) clearInterval(telemetryTimer);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
