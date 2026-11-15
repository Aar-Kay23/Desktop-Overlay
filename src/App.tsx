import React, { useState } from 'react';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { HeaderBar } from './components/layout/HeaderBar';
import { SidebarDock } from './components/layout/SidebarDock';
import { FullDashboard } from './components/layout/FullDashboard';
import { FloatingHUD } from './components/layout/FloatingHUD';
import { MiniBar } from './components/layout/MiniBar';
import { DesktopCanvas } from './components/layout/DesktopCanvas';
import { SettingsModal } from './components/settings/SettingsModal';
import { useClickThrough } from './hooks/useClickThrough';

const OverlayContent: React.FC = () => {
  const { mode } = useTelemetry();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Activate dynamic click-through: empty desktop areas pass through to OS, widgets capture clicks
  useClickThrough(settingsOpen);

  // In desktop overlay modes (canvas, dock, minibar, hud), keep background transparent
  const isSolidDashboard = mode === 'dashboard';

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-white/20 ${
        isSolidDashboard ? 'bg-[#07090e]' : 'bg-transparent pointer-events-none'
      }`}
    >
      {/* Ambient background glows for solid dashboard mode only */}
      {isSolidDashboard && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-500/[0.06] rounded-full blur-[140px]" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/[0.05] rounded-full blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      )}

      {/* Top Header Bar shown only for fixed dashboard and sidebar modes */}
      {(mode === 'sidebar' || mode === 'dashboard') && (
        <div data-interactive="true" className="pointer-events-auto">
          <HeaderBar onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 relative z-10">
        {mode === 'canvas' && <DesktopCanvas onOpenSettings={() => setSettingsOpen(true)} />}
        {mode === 'sidebar' && <SidebarDock />}
        {mode === 'hud' && <FloatingHUD />}
        {mode === 'dashboard' && <FullDashboard />}
        {mode === 'minibar' && <MiniBar />}
      </main>

      {/* Settings Modal */}
      <div data-interactive="true" className="pointer-events-auto">
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  );
};

export function App() {
  return (
    <TelemetryProvider>
      <OverlayContent />
    </TelemetryProvider>
  );
}

export default App;
