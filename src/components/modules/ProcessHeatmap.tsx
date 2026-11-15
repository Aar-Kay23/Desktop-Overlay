import React, { useState } from 'react';
import { Layers, XCircle } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatMegabytes } from '../../lib/utils';

export const ProcessHeatmap: React.FC = () => {
  const { snapshot, killProcess } = useTelemetry();
  const { topProcesses } = snapshot;
  const [confirmPid, setConfirmPid] = useState<number | null>(null);

  const handleKill = async (pid: number, name: string) => {
    await killProcess(name, pid);
    setConfirmPid(null);
  };

  return (
    <div className="glass-card rounded-xl p-3.5 flex flex-col gap-2.5 relative border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">
            Top Active Processes
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {topProcesses.length} monitored
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        {topProcesses.map((proc) => {
          const isConfirming = confirmPid === proc.pid;

          return (
            <div
              key={proc.pid}
              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-slate-200">{proc.name}</span>
                  {proc.instances > 1 && (
                    <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                      ×{proc.instances}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-mono text-cyan-400 font-medium">
                  {proc.cpuPct.toFixed(1)}%
                </span>
                <span className="text-[11px] font-mono text-slate-400 w-16 text-right">
                  {formatMegabytes(proc.memMb)}
                </span>

                {isConfirming ? (
                  <div className="flex items-center gap-1 animate-in fade-in duration-200">
                    <button
                      onClick={() => handleKill(proc.pid, proc.name)}
                      className="px-2 py-0.5 rounded-sm bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                    >
                      End
                    </button>
                    <button
                      onClick={() => setConfirmPid(null)}
                      className="px-1.5 py-0.5 rounded-sm bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmPid(proc.pid)}
                    title="Terminate process"
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded-sm cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
