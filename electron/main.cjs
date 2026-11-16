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
const fs = require('fs');

// Diagnostic logger
const logFile = path.join(__dirname, '..', 'electron.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
  try { fs.appendFileSync(logFile, line); } catch {}
  console.log(...args);
}

// Single-instance lock: prevents duplicate instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const koffi = require('koffi');
const { getSystemTelemetry } = require('./telemetry.cjs');
const { sendMediaControl, setMasterVolume, toggleMasterMute, stopMediaDaemon } = require('./media.cjs');

// ─────────────────────────────────────────────────────────────────────────────
// Win32 API Bindings via Koffi (0ms latency, zero build step)
// ─────────────────────────────────────────────────────────────────────────────
const user32 = koffi.load('user32.dll');

koffi.proto('bool WNDENUMPROC(intptr_t hWnd, intptr_t lParam)');
const EnumWindows          = user32.func('bool EnumWindows(WNDENUMPROC *lpEnumFunc, intptr_t lParam)');
const GetClassNameA        = user32.func('int GetClassNameA(intptr_t hWnd, _Out_ char *lpClassName, int nMaxCount)');
const FindWindowExA        = user32.func('intptr_t FindWindowExA(intptr_t hWndParent, intptr_t hWndChildAfter, const char *lpszClass, const char *lpszWindow)');
const GetShellWindow      = user32.func('intptr_t GetShellWindow()');
const FindWindowW          = user32.func('intptr_t FindWindowW(str16 lpClassName, str16 lpWindowName)');
const FindWindowA          = user32.func('intptr_t FindWindowA(const char *lpClassName, const char *lpWindowName)');
const SetParent            = user32.func('intptr_t SetParent(intptr_t hWndChild, intptr_t hWndNewParent)');
const SetWindowLongPtrA    = user32.func('intptr_t SetWindowLongPtrA(intptr_t hWnd, int nIndex, intptr_t dwNewLong)');
const GetWindowLongPtrA    = user32.func('intptr_t GetWindowLongPtrA(intptr_t hWnd, int nIndex)');
const GetForegroundWindow  = user32.func('intptr_t GetForegroundWindow()');
const GetClassNameW        = user32.func('int GetClassNameW(intptr_t hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)');
const GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *lpdwProcessId)');
const SetWindowPos         = user32.func('bool SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)');
const IsWindow             = user32.func('bool IsWindow(intptr_t hWnd)');

const GWLP_HWNDPARENT = -8;
const GWL_EXSTYLE     = -20;
const WS_EX_TOOLWINDOW = 0x00000080;

function findShellWindowViaEnum() {
  let found = 0n;
  let count = 0;
  const cb = koffi.register((hwnd, _lparam) => {
    try {
      count++;
      const buf = Buffer.alloc(256);
      GetClassNameA(hwnd, buf, 256);
      const cls = buf.toString('ascii').replace(/\0.*$/, '');
      if (count <= 10) {
        log(`[EnumSample] HWND: ${hwnd}, Class: ${cls}`);
      }
      if (cls === 'Progman' || cls === 'WorkerW') {
        const hDefView = FindWindowExA(hwnd, 0n, 'SHELLDLL_DefView', null);
        if (hDefView && hDefView !== 0n && hDefView !== 0) {
          found = typeof hwnd === 'bigint' ? hwnd : BigInt(hwnd);
          log(`[ShellEnum] Found ${cls} with SHELLDLL_DefView: ${found}`);
          return false;
        }
        if (!found && cls === 'Progman') {
          found = typeof hwnd === 'bigint' ? hwnd : BigInt(hwnd);
          log(`[ShellEnum] Found Progman: ${found}`);
        }
      }
    } catch (e) {
      log('Enum callback err:', e.message);
    }
    return true;
  }, 'WNDENUMPROC*');

  try {
    EnumWindows(cb, 0n);
    log(`[ShellEnum] Enumerated total: ${count} windows, found: ${found}`);
  } catch (err) {
    log('EnumWindows err:', err);
  } finally {
    koffi.unregister(cb);
  }
  return found;
}

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
  log('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection:', reason);
});

let desktopWin = null;
let islandWin = null;
let tray = null;
let isDesktopVisible = true;
let isIslandVisible = true;
let isAlwaysOnTop = false;    // User manual "Float Desktop Widgets Above Apps" toggle from tray
let _currentMode = 'canvas';
let telemetryTimer = null;
let focusMonitorTimer = null;

function getDesktopBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  return { x, y, width, height };
}

function getIslandBounds(expanded = false) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const width = expanded ? 380 : 220;
  const height = expanded ? 260 : 42;
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

/**
 * setupDesktopZOrder:
 * Configures desktopWin as a top-level window anchored to the desktop layer:
 * 1. Guarantees it is a TOP-LEVEL window (unparents from WorkerW if needed).
 *    -> Desktop icons remain 100% visible and interactive.
 *    -> Widgets remain 100% interactive and draggable.
 * 2. Applies WS_EX_TOOLWINDOW style (hidden from taskbar & Alt+Tab).
 * 3. Sets Owner to Progman/Shell via GWLP_HWNDPARENT (-8):
 *    -> Windows treats it as part of the desktop shell, preventing Win+D minimization.
 */
function setupDesktopZOrder() {
  if (!desktopWin || desktopWin.isDestroyed()) return;
  try {
    const rawHwnd = desktopWin.getNativeWindowHandle();
    const desktopHwnd = rawHwnd.length >= 8
      ? rawHwnd.readBigInt64LE(0)
      : BigInt(rawHwnd.readUInt32LE(0));

    // 1. Ensure top-level (unparent from any WorkerW)
    SetParent(desktopHwnd, 0n);

    // 2. Set WS_EX_TOOLWINDOW
    try {
      const exStyle = GetWindowLongPtrA(desktopHwnd, GWL_EXSTYLE);
      const exStyleBig = typeof exStyle === 'bigint' ? exStyle : BigInt(exStyle);
      SetWindowLongPtrA(desktopHwnd, GWL_EXSTYLE, exStyleBig | BigInt(WS_EX_TOOLWINDOW));
      log('Set WS_EX_TOOLWINDOW successfully');
    } catch (e) {
      log('Set WS_EX_TOOLWINDOW err:', e.message);
    }

    // 3. Set Owner to Progman / Shell window
    let hShell = GetShellWindow();
    if (!hShell || hShell === 0n || hShell === 0) {
      hShell = findShellWindowViaEnum();
    }
    if (!hShell || hShell === 0n || hShell === 0) {
      hShell = FindWindowW('Progman', null);
    }
    if (!hShell || hShell === 0n || hShell === 0) {
      hShell = FindWindowA('Progman', null);
    }
    log('Shell Window HWND:', hShell);
    if (hShell && hShell !== 0n && hShell !== 0) {
      const hShellBig = typeof hShell === 'bigint' ? hShell : BigInt(hShell);
      const prevOwner = SetWindowLongPtrA(desktopHwnd, GWLP_HWNDPARENT, hShellBig);
      log('Set GWLP_HWNDPARENT to shell window. Prev owner:', prevOwner);
    }
  } catch (err) {
    log('setupDesktopZOrder err:', err);
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
    alwaysOnTop: isAlwaysOnTop, // False by default so normal apps sit in front
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

  // Enable click-through by default so desktop icons, taskbar, and background apps remain fully usable
  desktopWin.setIgnoreMouseEvents(true, { forward: true });

  loadWindow(desktopWin, 'desktop');

  desktopWin.once('ready-to-show', () => {
    if (isDesktopVisible && desktopWin && !desktopWin.isDestroyed()) {
      desktopWin.showInactive();
      if (!isAlwaysOnTop) {
        setupDesktopZOrder();
      } else {
        desktopWin.setAlwaysOnTop(true, 'floating');
      }
    }
  });

  // Intercept DWM minimize event (e.g. Win+D or Show Desktop)
  desktopWin.on('minimize', (e) => {
    e.preventDefault();
    if (!isDesktopVisible) return;
    setImmediate(() => {
      if (desktopWin && !desktopWin.isDestroyed() && isDesktopVisible) {
        if (desktopWin.isMinimized()) desktopWin.restore();
        desktopWin.showInactive();
        if (isAlwaysOnTop) desktopWin.setAlwaysOnTop(true, 'floating');
      }
    });
  });

  desktopWin.on('hide', () => {
    if (isDesktopVisible && desktopWin && !desktopWin.isDestroyed()) {
      setImmediate(() => desktopWin.showInactive());
    }
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

// Active Focus & Desktop Z-Order Watcher (100ms tick, 0% CPU via native Win32 calls)
function checkActiveFocus() {
  if (!desktopWin || desktopWin.isDestroyed() || !isDesktopVisible) return;

  if (isAlwaysOnTop) {
    desktopWin.setAlwaysOnTop(true, 'floating');
    return;
  }

  // Fast check: If Win+D minimized the window, restore immediately
  if (desktopWin.isMinimized()) {
    desktopWin.restore();
    desktopWin.showInactive();
    return;
  }

  const { className, pid } = getActiveForeground();
  // If active foreground is our own Electron process, don't touch anything
  if (pid === process.pid || !className) return;

  const isDesktop = SHELL_DESKTOP_CLASSES.has(className);

  if (isDesktop) {
    // User is on desktop wallpaper, desktop icons, or taskbar.
    // Ensure desktopWin is visible and placed right above wallpaper without taking focus.
    if (!desktopWin.isVisible()) {
      desktopWin.showInactive();
    }
  }
}

function startTelemetryBroadcast() {
  if (telemetryTimer) clearInterval(telemetryTimer);

  telemetryTimer = setInterval(async () => {
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
  focusMonitorTimer = setInterval(checkActiveFocus, 100);
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
      setupDesktopZOrder();
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
              setupDesktopZOrder();
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
      setupDesktopZOrder();
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

ipcMain.on('island:resize', (_event, expanded) => {
  if (islandWin && !islandWin.isDestroyed()) {
    const bounds = getIslandBounds(expanded);
    islandWin.setBounds(bounds);
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

  screen.on('display-metrics-changed', () => {
    if (desktopWin && !desktopWin.isDestroyed()) {
      desktopWin.setBounds(getDesktopBounds());
      if (!isAlwaysOnTop) {
        setupDesktopZOrder();
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
  if (focusMonitorTimer) clearInterval(focusMonitorTimer);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
