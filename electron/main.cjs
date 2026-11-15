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

// Native Win32 API bindings via Koffi (0ms latency, zero build step)
const user32 = koffi.load('user32.dll');
const GetForegroundWindow = user32.func('intptr_t GetForegroundWindow()');
const GetClassNameW = user32.func('int GetClassNameW(intptr_t hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)');
const GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *lpdwProcessId)');
const SetWindowPos = user32.func('bool SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)');

const SHELL_DESKTOP_CLASSES = new Set([
  'Progman',                     // Windows Desktop Shell
  'WorkerW',                    // Desktop Wallpaper Host (Win 10/11)
  'SHELLDLL_DefView',           // Desktop Icon Container View
  'SysListView32',              // Desktop Icons List
  'Shell_TrayWnd',              // Primary Taskbar
  'Shell_SecondaryTrayWnd',     // Multi-Monitor Taskbars
  'Windows.UI.Core.CoreWindow', // Windows 11 Start Menu / Action Center
  'XamlExplorerHostIslandWindow'// Modern Windows 11 Shell flyouts
]);

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
let isAlwaysOnTop = false;    // User manual "Float Desktop Widgets Above Apps" toggle from tray
let isDesktopVisible = true;  // Desktop widgets layer visibility
let isIslandVisible = true;   // Dynamic island HUD visibility
let _currentMode = 'canvas';  // 'canvas' | 'sidebar' | 'dashboard' | 'minibar' | 'hud'
let telemetryTimer = null;
let focusMonitorTimer = null;

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
    minimizable: false,
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
      desktopWin.showInactive();
      if (isAlwaysOnTop) desktopWin.setAlwaysOnTop(true, 'floating');
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
          [50, 150].forEach((delay) => {
            setTimeout(() => {
              if (desktopWin && !desktopWin.isDestroyed() && isDesktopVisible) {
                if (desktopWin.isMinimized()) desktopWin.restore();
                desktopWin.showInactive();
                if (isAlwaysOnTop) desktopWin.setAlwaysOnTop(true, 'floating');
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
    [50, 150].forEach((delay) => {
      setTimeout(() => {
        if (desktopWin && !desktopWin.isDestroyed() && isDesktopVisible) {
          if (desktopWin.isMinimized()) desktopWin.restore();
          desktopWin.showInactive();
          if (isAlwaysOnTop) desktopWin.setAlwaysOnTop(true, 'floating');
        }
      }, delay);
    });
  });

  desktopWin.on('closed', () => {
    desktopWin = null;
  });
}

function sendDesktopToBottom() {
  if (!desktopWin || desktopWin.isDestroyed()) return;
  try {
    const rawHwnd = desktopWin.getNativeWindowHandle();
    const hwndVal = rawHwnd.length >= 8 ? rawHwnd.readBigInt64LE(0) : BigInt(rawHwnd.readUInt32LE(0));
    // HWND_BOTTOM = 1n, SWP_NOSIZE = 1, SWP_NOMOVE = 2, SWP_NOACTIVATE = 0x10 -> 0x0013
    SetWindowPos(hwndVal, 1n, 0, 0, 0, 0, 0x0013);
  } catch {}
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

// Active Focus & Z-Order Synchronization Loop (120ms tick, 0% CPU via native Win32 calls)
let lastDesktopState = null;

function checkActiveFocus() {
  if (!desktopWin || desktopWin.isDestroyed() || !isDesktopVisible) return;

  if (isAlwaysOnTop) {
    desktopWin.setAlwaysOnTop(true, 'floating');
    return;
  }

  const { className, pid } = getActiveForeground();
  // If active foreground is our own Electron process (e.g. user clicked a widget), don't flip
  if (pid === process.pid || !className) return;

  const isDesktop = SHELL_DESKTOP_CLASSES.has(className);

  if (isDesktop !== lastDesktopState) {
    lastDesktopState = isDesktop;
    if (isDesktop) {
      // User is on desktop wallpaper, desktop icons, or taskbar
      if (desktopWin.isMinimized()) desktopWin.restore();
      if (!desktopWin.isVisible()) desktopWin.showInactive();
      desktopWin.setAlwaysOnTop(false);
    } else {
      // User is in a real application (VS Code, Chrome, Word, etc.):
      // Keep desktop window below normal applications
      desktopWin.setAlwaysOnTop(false);
    }
  }
}

function startTelemetryBroadcast() {
  if (telemetryTimer) clearInterval(telemetryTimer);

  telemetryTimer = setInterval(async () => {
    // Periodic safeguard: auto-recover if Windows silently minimized desktop widgets
    if (isDesktopVisible && desktopWin && !desktopWin.isDestroyed() && desktopWin.isMinimized()) {
      desktopWin.restore();
      desktopWin.showInactive();
      if (isAlwaysOnTop) desktopWin.setAlwaysOnTop(true, 'floating');
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

  if (focusMonitorTimer) clearInterval(focusMonitorTimer);
  focusMonitorTimer = setInterval(checkActiveFocus, 120);
}

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
    } else {
      desktopWin.setAlwaysOnTop(false);
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
              desktopWin.setAlwaysOnTop(true, 'floating');
            } else {
              desktopWin.setAlwaysOnTop(false);
              sendDesktopToBottom();
            }
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
    if (isAlwaysOnTop) {
      desktopWin.setAlwaysOnTop(true, 'floating');
    } else {
      desktopWin.setAlwaysOnTop(false);
      sendDesktopToBottom();
    }
  }
  updateTrayMenu();
});

ipcMain.on('set-overlay-mode', (_event, mode) => {
  _currentMode = mode;
  if (mode === 'hud') {
    // Switch to Dynamic Island only: hide desktop widgets and show island
    if (desktopWin && !desktopWin.isDestroyed()) desktopWin.hide();
    toggleDynamicIsland(true);
  } else {
    // Switch to desktop widgets: show desktop widgets and update layout
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
  if (focusMonitorTimer) clearInterval(focusMonitorTimer);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
