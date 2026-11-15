import type { WidgetSize } from '../types/widgets';

export const BASE_WIDGET_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  S: { width: 164, height: 164 },
  M: { width: 344, height: 164 },
  V: { width: 164, height: 344 },
  L: { width: 344, height: 344 },
};

export const WIDGET_DIMENSIONS = BASE_WIDGET_DIMENSIONS;

/**
 * Returns scaled widget dimensions rounded to nearest pixel
 */
export function getScaledDimensions(
  size: WidgetSize,
  scale: number = 1.0
): { width: number; height: number } {
  const base = BASE_WIDGET_DIMENSIONS[size] || BASE_WIDGET_DIMENSIONS.M;
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale),
  };
}

const SCREEN_PADDING = 20;
const TOP_BAR_PADDING = 64;

/**
 * Clamps coordinates so widgets stay comfortably on-screen
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
 * macOS Sonoma-style Right Shelf Layout:
 * Docks widgets along the right side of the screen in clean columns.
 * Leaves left desktop icons and center wallpaper artwork 100% unobstructed!
 */
export function computeRightShelfLayout(
  widgets: Array<{ id: string; size: WidgetSize; position?: { x: number; y: number } }>,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080,
  scale = 1.0
): Array<{ id: string; x: number; y: number }> {
  const gap = Math.round(14 * scale);
  const margin = Math.round(20 * scale);
  const colWidth = Math.round(344 * scale);

  // Column 1 (Rightmost):
  const col1X = viewportWidth - colWidth - margin;
  // Column 2 (Inner left):
  const col2X = col1X - colWidth - gap;

  let col1Y = TOP_BAR_PADDING;
  let col2Y = TOP_BAR_PADDING;

  return widgets.map((w) => {
    const dim = getScaledDimensions(w.size, scale);

    const placeInCol1 = col1Y + dim.height <= viewportHeight - 20 || col1Y <= col2Y;

    if (placeInCol1) {
      const pos = { id: w.id, x: col1X, y: col1Y };
      col1Y += dim.height + gap;
      return pos;
    } else {
      const pos = { id: w.id, x: col2X, y: col2Y };
      col2Y += dim.height + gap;
      return pos;
    }
  });
}

/**
 * Clean Perimeter Grid Layout:
 * Places widgets cleanly across rows, skipping Dynamic Island exclusion zone
 */
export function computePerimeterGridLayout(
  widgets: Array<{ id: string; size: WidgetSize; position?: { x: number; y: number } }>,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920,
  scale = 1.0
): Array<{ id: string; x: number; y: number }> {
  const gap = Math.round(18 * scale);
  const startX = SCREEN_PADDING + 10;
  let currentX = startX;
  let currentY = TOP_BAR_PADDING + 14;
  let rowHeight = 0;

  // Dynamic Island Exclusion Zone (Top Center)
  const islandWidth = 460;
  const islandLeft = Math.round((viewportWidth - islandWidth) / 2);
  const islandRight = islandLeft + islandWidth;
  const islandBottom = 135;

  return widgets.map((w) => {
    const dim = getScaledDimensions(w.size, scale);

    // If adding this widget overflows the viewport right edge, wrap to next line
    if (currentX + dim.width + SCREEN_PADDING > viewportWidth && currentX > startX) {
      currentX = startX;
      currentY += rowHeight + gap;
      rowHeight = 0;
    }

    // Dynamic Island collision check: if this spot overlaps the island, jump past it
    if (currentY < islandBottom && currentX + dim.width > islandLeft && currentX < islandRight) {
      currentX = islandRight + gap;
      if (currentX + dim.width + SCREEN_PADDING > viewportWidth) {
        currentX = startX;
        currentY = Math.max(currentY + rowHeight + gap, islandBottom + 10);
        rowHeight = 0;
      }
    }

    const pos = {
      id: w.id,
      x: currentX,
      y: currentY,
    };

    rowHeight = Math.max(rowHeight, dim.height);
    currentX += dim.width + gap;

    return pos;
  });
}

/**
 * Computes non-overlapping packed grid positions for widgets
 */
export function computeAutoLayout(
  widgets: Array<{ id: string; size: WidgetSize; position?: { x: number; y: number } }>,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920,
  forceRecalculate = false,
  scale = 1.0,
  layoutMode: 'grid' | 'shelf' = 'grid',
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
): Array<{ id: string; x: number; y: number }> {
  if (!forceRecalculate) {
    const hasAllPositions = widgets.every((w) => w.position && typeof w.position.x === 'number');
    if (hasAllPositions) {
      return widgets.map((w) => ({ id: w.id, x: w.position!.x, y: w.position!.y }));
    }
  }

  if (layoutMode === 'shelf') {
    return computeRightShelfLayout(widgets, viewportWidth, viewportHeight, scale);
  } else {
    return computePerimeterGridLayout(widgets, viewportWidth, scale);
  }
}
