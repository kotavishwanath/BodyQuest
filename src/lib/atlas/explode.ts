import type { AtlasPart } from "@/types/atlas";

export interface LayoutCell {
  x: number;
  y: number;
}

export interface ExplodeLayout {
  /** Target centre of each visible part in the laid-out inventory. */
  cells: Map<number, LayoutCell>;
  width: number;
  height: number;
}

const GAP = 0.02;
const MIN_CELL = 0.03;

/**
 * Shelf-packs the visible parts (front view bounding boxes) into rows, tallest
 * first, so every piece gets its own spot. The layout is centred on (0, 0).
 */
export function packInventory(parts: AtlasPart[], indices: number[], aspect: number): ExplodeLayout {
  const cards = indices.map((index) => {
    const [w, h] = parts[index].size;
    return { index, width: Math.max(MIN_CELL, w) + GAP, height: Math.max(MIN_CELL, h) + GAP };
  });
  const area = cards.reduce((sum, c) => sum + c.width * c.height, 0);
  const widest = cards.reduce((max, c) => Math.max(max, c.width), 0.3);
  const targetWidth = Math.max(widest, Math.sqrt(area * Math.min(2, Math.max(0.5, aspect))) * 1.15);
  cards.sort((a, b) => b.height - a.height || a.index - b.index);

  const cells = new Map<number, LayoutCell>();
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let usedWidth = 0;
  for (const card of cards) {
    if (x > 0 && x + card.width > targetWidth) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    cells.set(card.index, { x: x + card.width / 2, y: -(y + card.height / 2) });
    x += card.width;
    usedWidth = Math.max(usedWidth, x);
    rowHeight = Math.max(rowHeight, card.height);
  }
  const height = y + rowHeight;
  for (const cell of cells.values()) {
    cell.x -= usedWidth / 2;
    cell.y += height / 2;
  }
  return { cells, width: usedWidth, height };
}

/** Body centre height used for the exploded views (metres). */
export const BODY_CENTER_Y = 0.9;

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * World-space offset for a part at explode amount `e`.
 * 0 → 0.5: each system moves out in its own direction and pieces spread from
 * the body axis. 0.5 → 1: pieces slide into the flat inventory layout.
 */
export function explodeOffset(
  part: AtlasPart,
  systemAngle: number,
  cell: LayoutCell | undefined,
  e: number,
  out: [number, number, number],
): [number, number, number] {
  const t1 = smooth(Math.min(1, e / 0.5));
  const [cx, cy, cz] = part.center;
  const sx = Math.sin(systemAngle) * 0.45 * t1 + cx * 0.35 * t1;
  const sy = (cy - BODY_CENTER_Y) * 0.25 * t1;
  const sz = Math.cos(systemAngle) * 0.45 * t1 + cz * 0.35 * t1;
  if (e <= 0.5 || !cell) {
    out[0] = sx;
    out[1] = sy;
    out[2] = sz;
    return out;
  }
  const t2 = smooth((e - 0.5) / 0.5);
  out[0] = sx + (cell.x - cx - sx) * t2;
  out[1] = sy + (cell.y + BODY_CENTER_Y - cy - sy) * t2;
  out[2] = sz + (-cz - sz) * t2;
  return out;
}
