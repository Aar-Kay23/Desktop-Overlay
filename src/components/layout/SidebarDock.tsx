import React from 'react';
import { SystemVitals } from '../modules/SystemVitals';
import { AIQuotaCockpit } from '../modules/AIQuotaCockpit';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';
import { MediaStudio } from '../modules/MediaStudio';
import { NetworkRadar } from '../modules/NetworkRadar';
import { ProcessHeatmap } from '../modules/ProcessHeatmap';
import { StreamDeckBar } from '../modules/StreamDeckBar';

export const SidebarDock: React.FC = () => {
  return (
    <div className="w-full max-w-[420px] mx-auto min-h-screen p-3 flex flex-col gap-3 pb-8">
      {/* Priority Claude Approvals */}
      <ClaudeApprovals />

      {/* AI Coding Quotas */}
      <AIQuotaCockpit />

      {/* Hardware Vitals */}
      <SystemVitals />

      {/* Media Studio */}
      <MediaStudio />

      {/* Network Radar */}
      <NetworkRadar />

      {/* Quick Action Shortcuts */}
      <StreamDeckBar />

      {/* Active Processes */}
      <ProcessHeatmap />
    </div>
  );
};

