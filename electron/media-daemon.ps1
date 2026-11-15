param(
    [int]$ElectronPid = 0
)

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

public class NativeHardware {
    [StructLayout(LayoutKind.Sequential)]
    public struct SYSTEM_POWER_STATUS {
        public byte ACLineStatus;
        public byte BatteryFlag;
        public byte BatteryLifePercent;
        public byte SystemStatusFlag;
        public int BatteryLifeTime;
        public int BatteryFullLifeTime;
    }

    [DllImport("kernel32.dll")]
    public static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS sps);

    public static int GetBatteryPercent() {
        SYSTEM_POWER_STATUS s;
        if (GetSystemPowerStatus(out s)) {
            return s.BatteryLifePercent == 255 ? 100 : (int)s.BatteryLifePercent;
        }
        return 100;
    }

    public static bool IsAC() {
        SYSTEM_POWER_STATUS s;
        if (GetSystemPowerStatus(out s)) {
            return s.ACLineStatus == 1;
        }
        return true;
    }

    public static bool HasBattery() {
        SYSTEM_POWER_STATUS s;
        if (GetSystemPowerStatus(out s)) {
            return s.BatteryFlag != 128 && s.BatteryFlag != 255;
        }
        return false;
    }

    public static bool IsCharging() {
        SYSTEM_POWER_STATUS s;
        if (GetSystemPowerStatus(out s)) {
            return (s.BatteryFlag & 8) != 0;
        }
        return false;
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

public class ForegroundTracker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public static uint CurrentPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
    public static uint ParentPid = 0;

    public static bool IsDesktopForeground() {
        try {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return true;

            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid == CurrentPid || (ParentPid != 0 && pid == ParentPid)) return true;

            System.Text.StringBuilder sb = new System.Text.StringBuilder(256);
            GetClassName(hwnd, sb, sb.Capacity);
            string cls = sb.ToString();

            return cls == "Progman" ||
                   cls == "WorkerW" ||
                   cls == "Shell_TrayWnd" ||
                   cls == "Shell_SecondaryTrayWnd" ||
                   cls == "#32768" ||
                   cls == "Windows.UI.Core.CoreWindow" ||
                   cls == "XamlExplorerHostIslandWindow";
        } catch {
            return true;
        }
    }
}

public class ForegroundWatcher {
    public static void Start() {
        Thread t = new Thread(new ThreadStart(delegate() {
            bool lastState = true;
            while (true) {
                try {
                    bool curState = ForegroundTracker.IsDesktopForeground();
                    if (curState != lastState) {
                        lastState = curState;
                        Console.WriteLine("{\"type\":\"desktop_state\",\"isDesktop\":" + (curState ? "true" : "false") + "}");
                    }
                } catch {}
                Thread.Sleep(100);
            }
        }));
        t.IsBackground = true;
        t.Start();
    }
}
'

Add-Type -TypeDefinition $audioSrc

if ($ElectronPid -gt 0) {
    [ForegroundTracker]::ParentPid = [uint32]$ElectronPid
} else {
    try {
        $parent = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
        if ($parent) { [ForegroundTracker]::ParentPid = [uint32]$parent }
    } catch {}
}

[StdinCommandListener]::Start()
[ForegroundWatcher]::Start()

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(2000) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

# Pre-compile media properties task unwrapper to eliminate reflection in loop
$asTaskMediaProps = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
Function AwaitMediaProps($WinRtTask) {
    $netTask = $asTaskMediaProps.Invoke($null, @($WinRtTask))
    $netTask.Wait(1200) | Out-Null
    $netTask.Result
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$prevNetRx = [long]0
$prevNetTx = [long]0
$prevNetTime = [System.Diagnostics.Stopwatch]::GetTimestamp()

while ($true) {
    try {
        $vol = [Math]::Round([AudioMasterControl]::GetVolume())
        $muted = [AudioMasterControl]::GetMute()

        # In-memory network stats (0ms, 0 processes)
        $curRx = [long]0
        $curTx = [long]0
        foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            if ($nic.OperationalStatus -eq 'Up' -and $nic.NetworkInterfaceType -ne 'Loopback') {
                try {
                    $stats = $nic.GetIPv4Statistics()
                    $curRx += $stats.BytesReceived
                    $curTx += $stats.BytesSent
                } catch {}
            }
        }

        $nowTime = [System.Diagnostics.Stopwatch]::GetTimestamp()
        $elapsedSec = ($nowTime - $prevNetTime) / [System.Diagnostics.Stopwatch]::Frequency
        if ($elapsedSec -le 0) { $elapsedSec = 1.0 }

        $downMbps = 0.0
        $upMbps = 0.0
        if ($prevNetRx -gt 0 -and $curRx -ge $prevNetRx) {
            $downMbps = [Math]::Round((($curRx - $prevNetRx) * 8.0) / (1024 * 1024 * $elapsedSec), 1)
        }
        if ($prevNetTx -gt 0 -and $curTx -ge $prevNetTx) {
            $upMbps = [Math]::Round((($curTx - $prevNetTx) * 8.0) / (1024 * 1024 * $elapsedSec), 1)
        }

        $prevNetRx = $curRx
        $prevNetTx = $curTx
        $prevNetTime = $nowTime

        # In-memory battery status (0ms, 0 processes)
        $batPct = [NativeHardware]::GetBatteryPercent()
        $ac = [NativeHardware]::IsAC()
        $hasBat = [NativeHardware]::HasBattery()
        $charging = [NativeHardware]::IsCharging()

        $session = $mgr.GetCurrentSession()
        if ($session) {
            $props = AwaitMediaProps ($session.TryGetMediaPropertiesAsync())
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
                downMbps = $downMbps
                upMbps = $upMbps
                battery = [PSCustomObject]@{
                    acConnected = $ac
                    percent = $batPct
                    hasBattery = $hasBat
                    isCharging = $charging
                }
            }
            $json = $data | ConvertTo-Json -Compress
            [Console]::WriteLine($json)
        } else {
            $data = [PSCustomObject]@{
                status = "Closed"
                vol = $vol
                muted = $muted
                downMbps = $downMbps
                upMbps = $upMbps
                battery = [PSCustomObject]@{
                    acConnected = $ac
                    percent = $batPct
                    hasBattery = $hasBat
                    isCharging = $charging
                }
            }
            $json = $data | ConvertTo-Json -Compress
            [Console]::WriteLine($json)
        }
    } catch {
        [Console]::WriteLine('{"status":"Error"}')
    }
    Start-Sleep -Milliseconds 1000
}
