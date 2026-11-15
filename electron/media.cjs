const { spawn } = require('child_process');

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

// Fetch high-resolution 600x600 official cover art via iTunes API
async function fetchHighResArtwork(title, artist) {
  if (!title || title.length < 2) return '';
  const cacheKey = `${title.toLowerCase().trim()} - ${(artist || '').toLowerCase().trim()}`;
  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey);
  }

  try {
    const term = encodeURIComponent(`${title} ${artist || ''}`.trim());
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

  artworkCache.set(cacheKey, '');
  return '';
}

const PS_SCRIPT = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$audioSrc = @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j();
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int f(); 
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject {}

public class AudioMasterControl {
    private static IAudioEndpointVolume GetVolumeControl() {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
        IAudioEndpointVolume epv = null;
        var epvid = typeof(IAudioEndpointVolume).GUID;
        Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
        return epv;
    }

    public static float GetVolume() {
        try {
            float level = 0;
            Marshal.ThrowExceptionForHR(GetVolumeControl().GetMasterVolumeLevelScalar(out level));
            return level * 100;
        } catch { return 50; }
    }

    public static bool GetMute() {
        try {
            bool mute = false;
            Marshal.ThrowExceptionForHR(GetVolumeControl().GetMute(out mute));
            return mute;
        } catch { return false; }
    }
}
"@

try {
    Add-Type -TypeDefinition $audioSrc -ErrorAction SilentlyContinue
} catch {}

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(2000) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

while ($true) {
    try {
        $vol = 50
        $muted = $false
        try {
            $vol = [Math]::Round([AudioMasterControl]::GetVolume())
            $muted = [AudioMasterControl]::GetMute()
        } catch {}

        $session = $mgr.GetCurrentSession()
        if ($session) {
            $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $pb = $session.GetPlaybackInfo()
            $tl = $session.GetTimelineProperties()
            
            $status = if ($pb) { $pb.PlaybackStatus.ToString() } else { "Closed" }
            $pos = if ($tl) { [Math]::Round($tl.Position.TotalSeconds) } else { 0 }
            $dur = if ($tl) { [Math]::Round($tl.EndTime.TotalSeconds) } else { 0 }

            $data = [PSCustomObject]@{
                title = if ($props.Title) { $props.Title } else { "" }
                artist = if ($props.Artist) { $props.Artist } else { "" }
                album = if ($props.AlbumTitle) { $props.AlbumTitle } else { "" }
                status = $status
                source = if ($session.SourceAppUserModelId) { $session.SourceAppUserModelId } else { "Media Player" }
                posSec = $pos
                durSec = $dur
                vol = $vol
                muted = $muted
            }
            [Console]::WriteLine($data | ConvertTo-Json -Compress)
        } else {
            [Console]::WriteLine((ConvertTo-Json -Compress @{ status = "Closed"; vol = $vol; muted = $muted }))
        }
    } catch {
        [Console]::WriteLine('{"status":"Error"}')
    }
    Start-Sleep -Milliseconds 1200
}
`;

function startMediaDaemon() {
  if (process.platform !== 'win32') return;
  if (psProcess) return;

  try {
    psProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    psProcess.stdin.write(PS_SCRIPT);
    psProcess.stdin.end();

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

    psProcess.stderr.on('data', () => {});

    psProcess.on('exit', () => {
      psProcess = null;
      if (!isStopping) {
        setTimeout(startMediaDaemon, 3000);
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

// Media Controls: Robust User32 keybd_event simulation
function sendMediaControl(action) {
  if (process.platform !== 'win32') return;

  let vkCode = 0xB3; // VK_MEDIA_PLAY_PAUSE
  if (action === 'next') vkCode = 0xB0; // VK_MEDIA_NEXT_TRACK
  if (action === 'prev') vkCode = 0xB1; // VK_MEDIA_PREV_TRACK

  const psCmd = `
$def = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
Add-Type -MemberDefinition $def -Name Kbd -Namespace Win32 -ErrorAction SilentlyContinue
[Win32.Kbd]::keybd_event(${vkCode}, 0, 0, [UIntPtr]::Zero)
[Win32.Kbd]::keybd_event(${vkCode}, 0, 2, [UIntPtr]::Zero)
`;

  spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], {
    windowsHide: true,
  });

  if (action === 'playpause') {
    currentMedia.isPlaying = !currentMedia.isPlaying;
  }
}

// Master Volume Control: Set master volume percentage directly
function setMasterVolume(pct) {
  if (process.platform !== 'win32') return;
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  currentMedia.volumePct = clamped;

  const psCmd = `
$src = @"
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j(); int GetMasterVolumeLevelScalar(out float pfLevel);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject {}
public class AudioSetter {
    public static void Set(float pct) {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
            IAudioEndpointVolume epv = null;
            var epvid = typeof(IAudioEndpointVolume).GUID;
            Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
            epv.SetMasterVolumeLevelScalar(pct / 100.0f, System.Guid.Empty);
        } catch {}
    }
    public static void ToggleMute() {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
            IAudioEndpointVolume epv = null;
            var epvid = typeof(IAudioEndpointVolume).GUID;
            Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
            bool cur = false;
            epv.GetMute(out cur);
            epv.SetMute(!cur, System.Guid.Empty);
        } catch {}
    }
}
"@
Add-Type -TypeDefinition $src -ErrorAction SilentlyContinue
[AudioSetter]::Set(${clamped})
`;

  spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], {
    windowsHide: true,
  });
}

function toggleMasterMute() {
  if (process.platform !== 'win32') return;
  currentMedia.isMuted = !currentMedia.isMuted;

  const psCmd = `
$src = @"
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j(); int GetMasterVolumeLevelScalar(out float pfLevel);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject {}
public class AudioSetter {
    public static void ToggleMute() {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
            IAudioEndpointVolume epv = null;
            var epvid = typeof(IAudioEndpointVolume).GUID;
            Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
            bool cur = false;
            epv.GetMute(out cur);
            epv.SetMute(!cur, System.Guid.Empty);
        } catch {}
    }
}
"@
Add-Type -TypeDefinition $src -ErrorAction SilentlyContinue
[AudioSetter]::ToggleMute()
`;

  spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], {
    windowsHide: true,
  });
}

function getMediaSnapshot() {
  return currentMedia;
}

// Auto-start daemon on module load
startMediaDaemon();

module.exports = {
  getMediaSnapshot,
  sendMediaControl,
  setMasterVolume,
  toggleMasterMute,
  stopMediaDaemon,
};
