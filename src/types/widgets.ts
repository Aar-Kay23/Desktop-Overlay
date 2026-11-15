import type { ComponentType } from 'react';

export type WidgetSize = 'S' | 'M' | 'V' | 'L';

export type WidgetType =
  | 'cpu'
  | 'gpu'
  | 'memory'
  | 'storage'
  | 'network'
  | 'battery'
  | 'ai-quota'
  | 'media'
  | 'processes'
  | 'clock'
  | 'weather'
  | 'notes'
  | 'world-clock'
  | 'quick-actions';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  position?: WidgetPosition;
}

export interface WidgetProps {
  size: WidgetSize;
}

export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  category: 'System' | 'AI & Dev' | 'Media & Info' | 'Productivity';
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
  component: ComponentType<WidgetProps>;
}
