import type { WidgetSize } from '../types/widgets';

export const WIDGET_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  S: { width: 164, height: 164 },
  M: { width: 344, height: 164 },
  L: { width: 344, height: 344 },
};

const TOP_BAR_PADDING = 64;
const SCREEN_PADDING = 20;

/**
 * Clamps coordinates so widgets never fly off-screen or hide beneath taskbars
 */
export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
): { x: number; y: number } {
  const minX = SCREEN_PADDING;
  const maxX = Math.max(minX, viewportWidth - width - SCREEN_PADDING);
  const minY = TOP_BAR_PADDING;
  const maxY = Math.max(minY, viewportHeight - height - SCREEN_PADDING);

  return {
    x: Math.min(Math.max(minX, Math.round(x)), maxX),
    y: Math.min(Math.max(minY, Math.round(y)), maxY),
  };
}

/**
 * Snaps a coordinate value to a grid step
 */
export function snapCoordinate(value: number, step = 20): number {
  return Math.round(value / step) * step;
}

/**
 * Computes non-overlapping default positions for a list of widgets
 */
export function computeAutoLayout(
  widgets: Array<{ id: string; size: WidgetSize; position?: { x: number; y: number } }>,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
): Array<{ id: string; x: number; y: number }> {
  let currentX = SCREEN_PADDING;
  let currentY = TOP_BAR_PADDING + 10;
  let rowHeight = 0;
  const gap = 16;

  return widgets.map((w) => {
    const dim = WIDGET_DIMENSIONS[w.size];
    
    // Check if adding this widget exceeds viewport width
    if (currentX + dim.width + SCREEN_PADDING > viewportWidth && currentX > SCREEN_PADDING) {
      currentX = SCREEN_PADDING;
      currentY += rowHeight + gap;
      rowHeight = 0;
    }

    const pos = {
      id: w.id,
      x: w.position ? w.position.x : currentX,
      y: w.position ? w.position.y : currentY,
    };

    rowHeight = Math.max(rowHeight, dim.height);
    currentX += dim.width + gap;

    return pos;
  });
}
