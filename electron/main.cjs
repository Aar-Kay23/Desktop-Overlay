const { app, BrowserWindow, screen, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');

let win = null;
let tray = null;
let dockSide = 'right'; // 'right' | 'left'
let isAlwaysOnTop = true;
const DOCK_WIDTH = 390;

function getDockBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const windowX = dockSide === 'right' ? x + width - DOCK_WIDTH : x;
  return {
    x: windowX,
    y: y,
    width: DOCK_WIDTH,
    height: height,
  };
}

function createWindow() {
  const bounds = getDockBounds();

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
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  // Load from local dist/index.html or dev server if available
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  fetch(devUrl)
    .then(() => {
      win.loadURL(devUrl);
    })
    .catch(() => {
      win.loadFile(prodPath);
    });

  win.on('closed', () => {
    win = null;
  });

  // Re-anchor when display metrics change
  screen.on('display-metrics-changed', () => {
    if (win) {
      const b = getDockBounds();
      win.setBounds(b);
    }
  });
}

function createTray() {
  // Simple fallback icon or SVG
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(0)) : icon);
  tray.setToolTip('Desktop-Overlay Dock');

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: win && win.isVisible() ? 'Hide Desktop Dock' : 'Show Desktop Dock',
        click: () => toggleDock(),
      },
      { type: 'separator' },
      {
        label: 'Dock on Right Edge',
        type: 'radio',
        checked: dockSide === 'right',
        click: () => setDockPosition('right'),
      },
      {
        label: 'Dock on Left Edge',
        type: 'radio',
        checked: dockSide === 'left',
        click: () => setDockPosition('left'),
      },
      { type: 'separator' },
      {
        label: 'Stay on Top of Windows',
        type: 'checkbox',
        checked: isAlwaysOnTop,
        click: (item) => {
          isAlwaysOnTop = item.checked;
          if (win) win.setAlwaysOnTop(isAlwaysOnTop);
        },
      },
      { type: 'separator' },
      {
        label: 'Reload Dock',
        click: () => {
          if (win) win.reload();
        },
      },
      {
        label: 'Quit Desktop Overlay',
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateMenu();

  tray.on('click', () => {
    toggleDock();
    updateMenu();
  });
}

function toggleDock() {
  if (!win) {
    createWindow();
    return;
  }
  if (win.isVisible()) {
    win.hide();
  } else {
    const b = getDockBounds();
    win.setBounds(b);
    win.show();
    if (isAlwaysOnTop) win.setAlwaysOnTop(true);
  }
}

function setDockPosition(side) {
  dockSide = side;
  if (win) {
    const b = getDockBounds();
    win.setBounds(b);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register global hotkey: Ctrl+Shift+D to toggle dock
  try {
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      toggleDock();
    });
  } catch (err) {
    console.warn('Failed to register global hotkey', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  // Keep app alive in tray
  e.preventDefault();
});

