import React from 'react';
import { ArrowDown, ArrowUp, Wifi, Radio } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { Sparkline } from '../ui/Sparkline';
import { GlassBadge } from '../ui/GlassBadge';
import { useTelemetry } from '../../context/TelemetryContext';

export const NetworkRadar: React.FC = () => {
  const { snapshot } = useTelemetry();
  const { network } = snapshot;

  const pingBadge = (
    <GlassBadge
      label={`${network.pingMs} ms`}
      variant={network.pingMs < 30 ? 'emerald' : network.pingMs < 80 ? 'amber' : 'rose'}
      icon={<Radio className="w-2.5 h-2.5" />}
    />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Download Speed */}
      <MetricCard
        title="Download"
        value={network.downMbps.toFixed(1)}
        unit="Mbps"
        icon={<ArrowDown className="w-3.5 h-3.5 text-cyan-400" />}
        badge={pingBadge}
      >
        <Sparkline
          data={network.historyDown}
          color="cyan"
          height={38}
          showMinMax
        />
      </MetricCard>

      {/* Upload Speed */}
      <MetricCard
        title="Upload"
        value={network.upMbps.toFixed(1)}
        unit="Mbps"
        icon={<ArrowUp className="w-3.5 h-3.5 text-violet-400" />}
        badge={<GlassBadge label="Active" variant="neutral" icon={<Wifi className="w-2.5 h-2.5" />} />}
      >
        <Sparkline
          data={network.historyUp}
          color="violet"
          height={38}
          showMinMax
        />
      </MetricCard>
    </div>
  );
};

