import React from 'react';
import { SystemVitals } from '../modules/SystemVitals';
import { AIQuotaCockpit } from '../modules/AIQuotaCockpit';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';
import { MediaStudio } from '../modules/MediaStudio';
import { NetworkRadar } from '../modules/NetworkRadar';
import { ProcessHeatmap } from '../modules/ProcessHeatmap';
import { StreamDeckBar } from '../modules/StreamDeckBar';

export const FullDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4 pb-12">
      {/* Interactive Alerts / Approvals */}
      <ClaudeApprovals />

      {/* Main Multi-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: AI Quotas & Processes (4 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <AIQuotaCockpit />
          <ProcessHeatmap />
        </div>

        {/* Center / Right Columns (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <SystemVitals />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MediaStudio />
            <div className="flex flex-col gap-4">
              <NetworkRadar />
              <StreamDeckBar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

