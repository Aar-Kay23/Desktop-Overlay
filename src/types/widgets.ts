import type { ComponentType } from 'react';

export type WidgetSize = 'S' | 'M' | 'L';

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
  | 'clock';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  size: WidgetSize;
}

export interface WidgetProps {
  size: WidgetSize;
}

export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  category: 'System' | 'AI & Dev' | 'Media & Info';
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
  component: ComponentType<WidgetProps>;
}
