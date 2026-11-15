Add-Type -AssemblyName System.Runtime.WindowsRuntime

$audioSrc = '
using System;
using System.Runtime.InteropServices;
using System.Threading;

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

public class AudioMasterControl {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

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
            float level = 0f;
            Marshal.ThrowExceptionForHR(GetVolumeControl().GetMasterVolumeLevelScalar(out level));
            return level * 100f;
        } catch { return 50f; }
    }

    public static void SetVolume(float pct) {
        try {
            float level = Math.Max(0f, Math.Min(1f, pct / 100.0f));
            GetVolumeControl().SetMasterVolumeLevelScalar(level, Guid.Empty);
        } catch {}
    }

    public static bool GetMute() {
        try {
            bool mute = false;
            Marshal.ThrowExceptionForHR(GetVolumeControl().GetMute(out mute));
            return mute;
        } catch { return false; }
    }

    public static void ToggleMute() {
        try {
            var ctrl = GetVolumeControl();
            bool cur = false;
            ctrl.GetMute(out cur);
            ctrl.SetMute(!cur, Guid.Empty);
        } catch {}
    }

    public static void SendMediaKey(byte vk) {
        try {
            keybd_event(vk, 0, 0, UIntPtr.Zero);
            keybd_event(vk, 0, 2, UIntPtr.Zero);
        } catch {}
    }
}

public class StdinCommandListener {
    public static void Start() {
        Thread t = new Thread(new ThreadStart(delegate() {
            string line;
            while ((line = Console.ReadLine()) != null) {
                line = line.Trim();
                if (line.StartsWith("VOL:")) {
                    float v = 0f;
                    if (float.TryParse(line.Substring(4), out v)) {
                        AudioMasterControl.SetVolume(v);
                    }
                } else if (line == "MUTE") {
                    AudioMasterControl.ToggleMute();
                } else if (line == "PLAYPAUSE") {
                    AudioMasterControl.SendMediaKey(0xB3);
                } else if (line == "NEXT") {
                    AudioMasterControl.SendMediaKey(0xB0);
                } else if (line == "PREV") {
                    AudioMasterControl.SendMediaKey(0xB1);
                }
            }
        }));
        t.IsBackground = true;
        t.Start();
    }
}
'

Add-Type -TypeDefinition $audioSrc

[StdinCommandListener]::Start()

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
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
        $vol = [Math]::Round([AudioMasterControl]::GetVolume())
        $muted = [AudioMasterControl]::GetMute()

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
            $json = $data | ConvertTo-Json -Compress
            [Console]::WriteLine($json)
        } else {
            $data = [PSCustomObject]@{
                status = "Closed"
                vol = $vol
                muted = $muted
            }
            $json = $data | ConvertTo-Json -Compress
            [Console]::WriteLine($json)
        }
    } catch {
        [Console]::WriteLine('{"status":"Error"}')
    }
    Start-Sleep -Milliseconds 800
}
