const { spawn } = require('child_process');
const path = require('path');

let currentMedia = {
  title: '',
  artist: '',
  album: '',
  isPlaying: false,
  sourceApp: '',
  positionSec: 0,
  durationSec: 0,
  volumePct: 50,
  isMuted: false,
  albumArtUrl: '',
};

let currentHardware = {
  battery: {
    hasBattery: true,
    percent: 100,
    isCharging: false,
    acConnected: true,
    model: 'Dell OEM Battery',
    voltage: 12.0,
  },
  downMbps: 0.0,
  upMbps: 0.0,
};

let psProcess = null;
let isStopping = false;
const artworkCache = new Map();

// Helper to clean up Windows AppUserModelId (e.g. "Spotify.exe", "Chrome")
function formatSourceApp(raw) {
  if (!raw) return 'Media Player';
  const lower = raw.toLowerCase();
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('brave')) return 'Brave';
  if (lower.includes('chrome')) return 'Google Chrome';
  if (lower.includes('msedge') || lower.includes('edge')) return 'Microsoft Edge';
  if (lower.includes('firefox')) return 'Firefox';
  if (lower.includes('apple') || lower.includes('itunes')) return 'Apple Music';
  if (lower.includes('vlc')) return 'VLC';
  return raw.replace('.exe', '');
}

// Clean title string for search engines (e.g. "p r i d e . i s . t h e . d e v i l" -> "pride is the devil")
function sanitizeTitle(rawTitle) {
  if (!rawTitle) return '';
  // Collapse spaced out letters: e.g. "p r i d e" -> "pride"
  let clean = rawTitle.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\b/g, '$1$2$3');
  clean = clean.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  return clean || rawTitle;
}

// Fetch high-resolution 600x600 official cover art via iTunes API with retry
async function fetchHighResArtwork(title, artist) {
  if (!title || title.length < 2) return '';
  const cacheKey = `${title.toLowerCase().trim()} - ${(artist || '').toLowerCase().trim()}`;
  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey);
  }

  const queries = [
    `${title} ${artist || ''}`.trim(),
    `${sanitizeTitle(title)} ${artist || ''}`.trim(),
    title.trim(),
  ];

  for (const q of queries) {
    try {
      const term = encodeURIComponent(q);
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
          const highRes = data.results[0].artworkUrl100.replace('/100x100bb.jpg', '/600x600bb.jpg');
          artworkCache.set(cacheKey, highRes);
          return highRes;
        }
      }
    } catch {}
  }

  artworkCache.set(cacheKey, '');
  return '';
}

function startMediaDaemon() {
  if (process.platform !== 'win32') return;
  if (psProcess) return;

  const scriptPath = path.join(__dirname, 'media-daemon.ps1');

  try {
    psProcess = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      }
    );

    let buffer = '';

    psProcess.stdout.on('data', async (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('{')) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.battery) {
            currentHardware.battery.percent = parsed.battery.percent ?? 100;
            currentHardware.battery.hasBattery = parsed.battery.hasBattery ?? true;
            currentHardware.battery.isCharging = parsed.battery.isCharging ?? false;
            currentHardware.battery.acConnected = parsed.battery.acConnected ?? true;
          }
          if (typeof parsed.downMbps === 'number') currentHardware.downMbps = parsed.downMbps;
          if (typeof parsed.upMbps === 'number') currentHardware.upMbps = parsed.upMbps;

          if (parsed.status === 'Closed' || parsed.status === 'Error') {
            currentMedia.isPlaying = false;
            if (typeof parsed.vol === 'number') currentMedia.volumePct = parsed.vol;
            if (typeof parsed.muted === 'boolean') currentMedia.isMuted = parsed.muted;
          } else {
            const title = parsed.title || currentMedia.title;
            const artist = parsed.artist || '';
            const titleChanged = title !== currentMedia.title || artist !== currentMedia.artist;

            currentMedia.title = title;
            currentMedia.artist = artist;
            currentMedia.album = parsed.album || '';
            currentMedia.isPlaying = parsed.status === 'Playing';
            currentMedia.sourceApp = formatSourceApp(parsed.source);
            currentMedia.positionSec = parsed.posSec || 0;
            currentMedia.durationSec = parsed.durSec || 0;
            if (typeof parsed.vol === 'number') currentMedia.volumePct = parsed.vol;
            if (typeof parsed.muted === 'boolean') currentMedia.isMuted = parsed.muted;

            if (titleChanged && title) {
              fetchHighResArtwork(title, artist).then((art) => {
                if (art) currentMedia.albumArtUrl = art;
              });
            }
          }
        } catch {}
      }
    });

    psProcess.stderr.on('data', (d) => {
      console.warn('GSMTC Daemon stderr:', d.toString().trim());
    });

    psProcess.on('exit', () => {
      psProcess = null;
      if (!isStopping) {
        setTimeout(startMediaDaemon, 2500);
      }
    });
  } catch (err) {
    console.error('Failed to spawn GSMTC media daemon', err);
  }
}

function stopMediaDaemon() {
  isStopping = true;
  if (psProcess) {
    try {
      psProcess.kill();
    } catch {}
    psProcess = null;
  }
}

// Media Controls: Sends command instantly via stdin to running C# thread (0 child processes)
function sendMediaControl(action) {
  if (action === 'playpause') {
    currentMedia.isPlaying = !currentMedia.isPlaying;
  }
  if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
    try {
      if (action === 'playpause') psProcess.stdin.write('PLAYPAUSE\n');
      else if (action === 'next') psProcess.stdin.write('NEXT\n');
      else if (action === 'prev') psProcess.stdin.write('PREV\n');
      return;
    } catch {}
  }
}

// Master Volume Control: Sets volume instantly via stdin (0 child processes)
function setMasterVolume(pct) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  currentMedia.volumePct = clamped;
  if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
    try {
      psProcess.stdin.write(`VOL:${clamped}\n`);
    } catch {}
  }
}

// Master Mute Toggle: Toggles mute instantly via stdin (0 child processes)
function toggleMasterMute() {
  currentMedia.isMuted = !currentMedia.isMuted;
  if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
    try {
      psProcess.stdin.write('MUTE\n');
    } catch {}
  }
}

function getMediaSnapshot() {
  return currentMedia;
}

function getHardwareSnapshot() {
  return currentHardware;
}

// Auto-start daemon on module load
startMediaDaemon();

module.exports = {
  getMediaSnapshot,
  getHardwareSnapshot,
  sendMediaControl,
  setMasterVolume,
  toggleMasterMute,
  stopMediaDaemon,
};
