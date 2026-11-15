import React from 'react';
import { Cpu, Zap, HardDrive, Database, Activity } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { Sparkline } from '../ui/Sparkline';
import { ProgressBar } from '../ui/ProgressBar';
import { GlassBadge } from '../ui/GlassBadge';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatMegabytes } from '../../lib/utils';

export const SystemVitals: React.FC = () => {
  const { snapshot } = useTelemetry();
  const { cpu, gpu, memory, disks } = snapshot;

  const cpuBadge = cpu.tempC ? (
    <GlassBadge
      label={`${cpu.tempC}°C`}
      variant={cpu.tempC > 75 ? 'rose' : cpu.tempC > 65 ? 'amber' : 'neutral'}
      icon={<Activity className="w-2.5 h-2.5" />}
    />
  ) : null;

  const gpuBadge = gpu.tempC ? (
    <GlassBadge
      label={`${gpu.tempC}°C`}
      variant={gpu.tempC > 78 ? 'rose' : gpu.tempC > 68 ? 'amber' : 'neutral'}
      icon={<Zap className="w-2.5 h-2.5" />}
    />
  ) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* CPU Card */}
      <MetricCard
        title="Processor"
        value={Math.round(cpu.loadPct)}
        unit="%"
        subValue={cpu.freqGhz ? `${cpu.freqGhz.toFixed(2)} GHz` : undefined}
        icon={<Cpu className="w-3.5 h-3.5" />}
        badge={cpuBadge}
      >
        <Sparkline
          data={cpu.history}
          color={cpu.loadPct > 80 ? 'rose' : cpu.loadPct > 60 ? 'amber' : 'cyan'}
          height={38}
          showMinMax
        />
        {cpu.cores && cpu.cores.length > 0 && (
          <div className="grid grid-cols-8 gap-1 mt-2.5 pt-2 border-t border-white/5">
            {cpu.cores.map((coreLoad, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className="h-6 w-full bg-white/5 rounded-xs overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full bg-cyan-400 rounded-2xs transition-all duration-300"
                    style={{ height: `${coreLoad}%` }}
                  />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">c{idx + 1}</span>
              </div>
            ))}
          </div>
        )}
      </MetricCard>

      {/* GPU Card */}
      <MetricCard
        title="Graphics GPU"
        value={Math.round(gpu.loadPct)}
        unit="%"
        subValue={gpu.powerWatts ? `${gpu.powerWatts}W` : undefined}
        icon={<Zap className="w-3.5 h-3.5" />}
        badge={gpuBadge}
      >
        <Sparkline
          data={gpu.history}
          color={gpu.loadPct > 85 ? 'rose' : gpu.loadPct > 70 ? 'amber' : 'emerald'}
          height={38}
          showMinMax
        />
        <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400 font-medium">VRAM</span>
            <span className="text-slate-200 font-mono">
              {formatMegabytes(gpu.vramUsedMb)} / {formatMegabytes(gpu.vramTotalMb)}
            </span>
          </div>
          <ProgressBar
            value={(gpu.vramUsedMb / gpu.vramTotalMb) * 100}
            color="emerald"
            height={5}
          />
        </div>
      </MetricCard>

      {/* Memory Card */}
      <MetricCard
        title="System RAM"
        value={Math.round(memory.pct)}
        unit="%"
        subValue={`${formatMegabytes(memory.usedMb)} / ${formatMegabytes(memory.totalMb)}`}
        icon={<Database className="w-3.5 h-3.5" />}
        badge={<GlassBadge label="DDR5" variant="neutral" />}
      >
        <Sparkline
          data={memory.history}
          color={memory.pct > 85 ? 'rose' : memory.pct > 75 ? 'amber' : 'violet'}
          height={38}
          showMinMax
        />
        {memory.swapUsedMb !== undefined && memory.swapTotalMb !== undefined && (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[11px] text-slate-400">
            <span>Pagefile Swap</span>
            <span className="font-mono text-slate-300">
              {formatMegabytes(memory.swapUsedMb)} ({Math.round((memory.swapUsedMb / memory.swapTotalMb) * 100)}%)
            </span>
          </div>
        )}
      </MetricCard>

      {/* Storage Card */}
      <MetricCard
        title="Storage Drives"
        value={disks.length > 0 ? `${Math.round(disks[0].pct)}` : '--'}
        unit="%"
        subValue={disks.length > 0 ? `${disks[0].usedGb} / ${disks[0].totalGb} GB` : undefined}
        icon={<HardDrive className="w-3.5 h-3.5" />}
        badge={<GlassBadge label="NVMe Gen5" variant="neutral" />}
      >
        <div className="flex flex-col gap-2.5 mt-1">
          {disks.map((d) => (
            <div key={d.mount} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-mono font-medium">{d.mount} ({d.name})</span>
                <span className="text-slate-400 font-mono">{d.usedGb} / {d.totalGb} GB</span>
              </div>
              <ProgressBar
                value={d.pct}
                color={d.pct > 85 ? 'rose' : d.pct > 70 ? 'amber' : 'cyan'}
                height={5}
              />
            </div>
          ))}
        </div>
      </MetricCard>
    </div>
  );
};

