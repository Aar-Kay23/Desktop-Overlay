const { spawn } = require('child_process');

let currentMedia = {
  title: '',
  artist: '',
  album: '',
  isPlaying: false,
  sourceApp: '',
  positionMs: 0,
  durationMs: 0,
  volumePct: 100,
  isMuted: false,
};

let psProcess = null;
let isStopping = false;

const PS_SCRIPT = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

while ($true) {
    try {
        $session = $mgr.GetCurrentSession()
        if ($session) {
            $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $pb = $session.GetPlaybackInfo()
            $tl = $session.GetTimelineProperties()
            
            $status = if ($pb) { $pb.PlaybackStatus.ToString() } else { "Closed" }
            $pos = if ($tl) { [Math]::Round($tl.Position.TotalMilliseconds) } else { 0 }
            $dur = if ($tl) { [Math]::Round($tl.EndTime.TotalMilliseconds) } else { 0 }

            $data = [PSCustomObject]@{
                title = if ($props.Title) { $props.Title } else { "" }
                artist = if ($props.Artist) { $props.Artist } else { "" }
                album = if ($props.AlbumTitle) { $props.AlbumTitle } else { "" }
                status = $status
                source = if ($session.SourceAppUserModelId) { $session.SourceAppUserModelId } else { "Windows Media" }
                posMs = $pos
                durMs = $dur
            }
            [Console]::WriteLine($data | ConvertTo-Json -Compress)
        } else {
            [Console]::WriteLine('{"status":"Closed"}')
        }
    } catch {
        [Console]::WriteLine('{"status":"Error"}')
    }
    Start-Sleep -Milliseconds 1500
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

    psProcess.stdout.on('data', (chunk) => {
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
          } else {
            currentMedia = {
              title: parsed.title || currentMedia.title,
              artist: parsed.artist || '',
              album: parsed.album || '',
              isPlaying: parsed.status === 'Playing',
              sourceApp: parsed.source || 'Media Player',
              positionMs: parsed.posMs || 0,
              durationMs: parsed.durMs || 0,
              volumePct: currentMedia.volumePct,
              isMuted: currentMedia.isMuted,
            };
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

// Media Controls: Synthesize standard Windows multimedia key strokes
function sendMediaControl(action) {
  if (process.platform !== 'win32') return;

  let keyChar = 179; // VK_MEDIA_PLAY_PAUSE (0xB3)
  if (action === 'next') keyChar = 176; // VK_MEDIA_NEXT_TRACK (0xB0)
  if (action === 'prev') keyChar = 177; // VK_MEDIA_PREV_TRACK (0xB1)

  const sendScript = `(New-Object -ComObject WScript.Shell).SendKeys([char]${keyChar})`;

  spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', sendScript], {
    windowsHide: true,
  });

  if (action === 'playpause') {
    currentMedia.isPlaying = !currentMedia.isPlaying;
  }
}

function getMediaSnapshot() {
  return currentMedia;
}

// Auto-start daemon on module load
startMediaDaemon();

module.exports = {
  getMediaSnapshot,
  sendMediaControl,
  stopMediaDaemon,
};

