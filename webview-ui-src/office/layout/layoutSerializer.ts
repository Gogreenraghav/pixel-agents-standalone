import { getColorizedSprite } from '../colorize.js';
import type {
  FloorColor,
  FurnitureInstance,
  OfficeLayout,
  PlacedFurniture,
  Seat,
  TileType as TileTypeVal,
} from '../types.js';
import { DEFAULT_COLS, DEFAULT_ROWS, Direction, TILE_SIZE, TileType } from '../types.js';
import { getCatalogEntry, getOrientationInGroup } from './furnitureCatalog.js';

/** Convert flat tile array from layout into 2D grid */
export function layoutToTileMap(layout: OfficeLayout): TileTypeVal[][] {
  const map: TileTypeVal[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    const row: TileTypeVal[] = [];
    for (let c = 0; c < layout.cols; c++) {
      row.push(layout.tiles[r * layout.cols + c]);
    }
    map.push(row);
  }
  return map;
}

/** Convert placed furniture into renderable FurnitureInstance[] */
export function layoutToFurnitureInstances(furniture: PlacedFurniture[]): FurnitureInstance[] {
  // Pre-compute desk zY per tile so surface items can sort in front of desks
  const deskZByTile = new Map<string, number>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry || !entry.isDesk) continue;
    const deskZY = item.row * TILE_SIZE + entry.sprite.length;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`;
        const prev = deskZByTile.get(key);
        if (prev === undefined || deskZY > prev) deskZByTile.set(key, deskZY);
      }
    }
  }

  const instances: FurnitureInstance[] = [];
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    const x = item.col * TILE_SIZE;
    const y = item.row * TILE_SIZE;
    const spriteH = entry.sprite.length;
    let zY = y + spriteH;

    // Chair z-sorting: ensure characters sitting on chairs render correctly
    if (entry.category === 'chairs') {
      if (entry.orientation === 'back') {
        // Back-facing chairs render IN FRONT of the seated character
        // (the chair back visually occludes the character behind it).
        // Use the bottom footprint row so it sorts after the character
        // even when the chair has background tiles that push seats down.
        zY = (item.row + entry.footprintH) * TILE_SIZE + 1;
      } else {
        // All other chairs: cap zY to first row bottom so characters
        // at any seat tile render in front of the chair
        zY = (item.row + 1) * TILE_SIZE;
      }
    }

    // Surface items render in front of the desk they sit on
    if (entry.canPlaceOnSurfaces) {
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          const deskZ = deskZByTile.get(`${item.col + dc},${item.row + dr}`);
          if (deskZ !== undefined && deskZ + 0.5 > zY) zY = deskZ + 0.5;
        }
      }
    }

    // Colorize sprite if this furniture has a color override
    let sprite = entry.sprite;
    if (item.color) {
      const { h, s, b: bv, c: cv } = item.color;
      sprite = getColorizedSprite(
        `furn-${item.type}-${h}-${s}-${bv}-${cv}-${item.color.colorize ? 1 : 0}`,
        entry.sprite,
        item.color,
      );
    }

    // Determine if this instance should be mirrored (side asset used in "left" orientation)
    let mirrored = false;
    if (entry.mirrorSide) {
      const orientInGroup = getOrientationInGroup(item.type);
      if (orientInGroup === 'left') {
        mirrored = true;
      }
    }

    instances.push({ sprite, x, y, zY, ...(mirrored ? { mirrored: true } : {}) });
  }
  return instances;
}

/** Get all tiles blocked by furniture footprints, optionally excluding a set of tiles.
 *  Skips top backgroundTiles rows so characters can walk through them. */
export function getBlockedTiles(
  furniture: PlacedFurniture[],
  excludeTiles?: Set<string>,
): Set<string> {
  const tiles = new Set<string>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    const bgRows = entry.backgroundTiles || 0;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue; // skip background rows — characters can walk through
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`;
        if (excludeTiles && excludeTiles.has(key)) continue;
        tiles.add(key);
      }
    }
  }
  return tiles;
}

/** Get tiles blocked for placement purposes — skips top backgroundTiles rows per item */
export function getPlacementBlockedTiles(
  furniture: PlacedFurniture[],
  excludeUid?: string,
): Set<string> {
  const tiles = new Set<string>();
  for (const item of furniture) {
    if (item.uid === excludeUid) continue;
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    const bgRows = entry.backgroundTiles || 0;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue; // skip background rows
      for (let dc = 0; dc < entry.footprintW; dc++) {
        tiles.add(`${item.col + dc},${item.row + dr}`);
      }
    }
  }
  return tiles;
}

/** Map chair orientation to character facing direction */
function orientationToFacing(orientation: string): Direction {
  switch (orientation) {
    case 'front':
      return Direction.DOWN;
    case 'back':
      return Direction.UP;
    case 'left':
      return Direction.LEFT;
    case 'right':
    case 'side':
      return Direction.RIGHT;
    default:
      return Direction.DOWN;
  }
}

/** Generate seats from chair furniture.
 *  Facing priority: 1) chair orientation, 2) adjacent desk, 3) forward (DOWN). */
export function layoutToSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
  const seats = new Map<string, Seat>();

  // Build set of all desk tiles
  const deskTiles = new Set<string>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry || !entry.isDesk) continue;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        deskTiles.add(`${item.col + dc},${item.row + dr}`);
      }
    }
  }

  const dirs: Array<{ dc: number; dr: number; facing: Direction }> = [
    { dc: 0, dr: -1, facing: Direction.UP }, // desk is above chair → face UP
    { dc: 0, dr: 1, facing: Direction.DOWN }, // desk is below chair → face DOWN
    { dc: -1, dr: 0, facing: Direction.LEFT }, // desk is left of chair → face LEFT
    { dc: 1, dr: 0, facing: Direction.RIGHT }, // desk is right of chair → face RIGHT
  ];

  // For each chair, every footprint tile becomes a seat.
  // Multi-tile chairs (e.g. 2-tile couches) produce multiple seats.
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry || entry.category !== 'chairs') continue;

    let seatCount = 0;
    const bgRows = entry.backgroundTiles ?? 0;
    for (let dr = bgRows; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const tileCol = item.col + dc;
        const tileRow = item.row + dr;

        // Determine facing direction:
        // 1) Chair orientation takes priority
        // 2) Adjacent desk direction
        // 3) Default forward (DOWN)
        let facingDir: Direction = Direction.DOWN;
        if (entry.orientation) {
          facingDir = orientationToFacing(entry.orientation);
        } else {
          for (const d of dirs) {
            if (deskTiles.has(`${tileCol + d.dc},${tileRow + d.dr}`)) {
              facingDir = d.facing;
              break;
            }
          }
        }

        // First seat uses chair uid (backward compat), subsequent use uid:N
        const seatUid = seatCount === 0 ? item.uid : `${item.uid}:${seatCount}`;
        seats.set(seatUid, {
          uid: seatUid,
          seatCol: tileCol,
          seatRow: tileRow,
          facingDir,
          assigned: false,
        });
        seatCount++;
      }
    }
  }

  return seats;
}

/** Get the set of tiles occupied by seats (so they can be excluded from blocked tiles) */
export function getSeatTiles(seats: Map<string, Seat>): Set<string> {
  const tiles = new Set<string>();
  for (const seat of seats.values()) {
    tiles.add(`${seat.seatCol},${seat.seatRow}`);
  }
  return tiles;
}

/** Floor colors per zone */
const COLOR_WORKSPACE:   FloorColor = { h: 210, s: 15, b: -20, c: 0 };  // blue-grey
const COLOR_CONFERENCE:  FloorColor = { h: 120, s: 20, b: -25, c: 0 };  // green
const COLOR_CAFETERIA:   FloorColor = { h: 35,  s: 25, b: -20, c: 0 };  // warm
const COLOR_WASHROOM:    FloorColor = { h: 200, s: 30, b: -30, c: 0 };  // cool blue

/** Create a multi-room office layout:
 *  - Main workspace (rows 1-12, cols 1-25)
 *  - Conference room (rows 1-9, cols 28-34) with doorway at col 27 rows 5-6
 *  - Cafeteria (rows 15-20, cols 1-19) with doorway at row 14 cols 10-11
 *  - Washroom (rows 15-20, cols 23-34) with doorway at row 14 cols 28-29
 */
export function createDefaultLayout(): OfficeLayout {
  const COLS = DEFAULT_COLS; // 36
  const ROWS = DEFAULT_ROWS; // 22
  const W = TileType.WALL;
  const V = TileType.VOID;

  // Build a 2D grid first, then flatten
  const grid: TileTypeVal[][] = [];
  const colors: Array<FloorColor | null>[] = [];

  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(V) as TileTypeVal[]);
    colors.push(new Array(COLS).fill(null) as Array<FloorColor | null>);
  }

  function setCell(r: number, c: number, t: TileTypeVal, color?: FloorColor | null) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    grid[r][c] = t;
    colors[r][c] = color ?? null;
  }

  function fillRect(r1: number, c1: number, r2: number, c2: number, t: TileTypeVal, color?: FloorColor | null) {
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        setCell(r, c, t, color);
  }

  function hLine(r: number, c1: number, c2: number, t: TileTypeVal) {
    for (let c = c1; c <= c2; c++) setCell(r, c, t, null);
  }

  function vLine(c: number, r1: number, r2: number, t: TileTypeVal) {
    for (let r = r1; r <= r2; r++) setCell(r, c, t, null);
  }

  // ── Outer border ───────────────────────────────────────────────
  hLine(0, 0, COLS - 1, W);
  hLine(ROWS - 1, 0, COLS - 1, W);
  vLine(0, 0, ROWS - 1, W);
  vLine(COLS - 1, 0, ROWS - 1, W);

  // ── Main workspace (rows 1-12, cols 1-25) ─────────────────────
  fillRect(1, 1, 12, 25, TileType.FLOOR_1, COLOR_WORKSPACE);

  // ── Vertical wall separating main from conference (col 27) ────
  vLine(27, 0, 10, W);
  // Doorway at rows 5-6 (2 tiles wide)
  setCell(5, 27, TileType.FLOOR_1, COLOR_WORKSPACE);
  setCell(6, 27, TileType.FLOOR_1, COLOR_WORKSPACE);

  // ── Conference room (rows 1-9, cols 28-34) ───────────────────
  fillRect(1, 28, 9, 34, TileType.FLOOR_2, COLOR_CONFERENCE);
  // Bottom wall of conference room
  hLine(10, 27, COLS - 1, W);

  // ── Horizontal divider wall (row 14) ─────────────────────────
  hLine(14, 0, COLS - 1, W);
  // Col 26 is wall connecting to outer border (fill gaps)
  vLine(26, 0, 14, W);

  // ── Cafeteria doorway (row 14, cols 10-11) ───────────────────
  setCell(14, 10, TileType.FLOOR_3, COLOR_CAFETERIA);
  setCell(14, 11, TileType.FLOOR_3, COLOR_CAFETERIA);

  // ── Cafeteria (rows 15-20, cols 1-19) ───────────────────────
  fillRect(15, 1, 20, 19, TileType.FLOOR_3, COLOR_CAFETERIA);

  // ── Vertical wall between cafeteria and washroom (col 21) ────
  vLine(21, 14, ROWS - 1, W);

  // ── Washroom doorway (row 14, cols 28-29) ───────────────────
  setCell(14, 28, TileType.FLOOR_4, COLOR_WASHROOM);
  setCell(14, 29, TileType.FLOOR_4, COLOR_WASHROOM);

  // ── Washroom (rows 15-20, cols 23-34) ───────────────────────
  fillRect(15, 23, 20, 34, TileType.FLOOR_4, COLOR_WASHROOM);

  // ── Vertical wall between col 21-22 (washroom left wall) ─────
  vLine(22, 14, ROWS - 1, W);

  // ── Fill void areas with wall ────────────────────────────────
  // Area between main workspace and conference: row 11-12, cols 27-34
  fillRect(11, 27, 12, COLS - 1, W);
  // Area between conference and right border bottom: row 10+
  // already set to wall
  // Cols 26 rows 1-12 (gap column between workspace and conference)
  fillRect(1, 26, 12, 26, W);
  // Area bottom-left corner (row 14+, cols 20-22 gaps)
  fillRect(15, 20, 20, 20, W);
  // Corridor bottom area cols 22-22
  // already set

  // Flatten 2D → 1D
  const tiles: TileTypeVal[] = [];
  const tileColors: Array<FloorColor | null> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      tiles.push(grid[r][c]);
      tileColors.push(colors[r][c]);
    }
  }

  return { version: 1, cols: COLS, rows: ROWS, tiles, tileColors, furniture: [] };
}

/** Serialize layout to JSON string */
export function serializeLayout(layout: OfficeLayout): string {
  return JSON.stringify(layout);
}

// ── Furniture type migration ────────────────────────────────────

/** Map old hardcoded FurnitureType values to new manifest-based IDs */
const LEGACY_TYPE_MAP: Record<string, string | null> = {
  desk: 'DESK_FRONT',
  chair: 'WOODEN_CHAIR_FRONT',
  bookshelf: 'BOOKSHELF',
  plant: 'PLANT',
  cooler: null, // no equivalent in new assets — remove
  whiteboard: 'WHITEBOARD',
  pc: 'PC_FRONT_OFF',
  lamp: null, // no equivalent in new assets — remove
};

/** Migrate old furniture type strings to new manifest IDs */
function migrateFurnitureTypes(furniture: PlacedFurniture[]): PlacedFurniture[] {
  const migrated: PlacedFurniture[] = [];
  for (const item of furniture) {
    const newType = LEGACY_TYPE_MAP[item.type];
    if (newType === undefined) {
      // Not a legacy type — keep as-is
      migrated.push(item);
    } else if (newType !== null) {
      // Migrate to new type
      migrated.push({ ...item, type: newType });
    }
    // newType === null → remove the item (no equivalent)
  }
  return migrated;
}

/** Deserialize layout from JSON string, migrating old tile types if needed */
export function deserializeLayout(json: string): OfficeLayout | null {
  try {
    const obj = JSON.parse(json);
    if (obj && obj.version === 1 && Array.isArray(obj.tiles) && Array.isArray(obj.furniture)) {
      return migrateLayout(obj as OfficeLayout);
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/**
 * Ensure layout has tileColors. If missing, generate defaults based on tile types.
 * Exported for use by message handlers that receive layouts over the wire.
 */
export function migrateLayoutColors(layout: OfficeLayout): OfficeLayout {
  return migrateLayout(layout);
}

/**
 * Migrate old layouts that use legacy tile types (TILE_FLOOR=1, WOOD_FLOOR=2, CARPET=3, DOORWAY=4)
 * to the new pattern-based system. Also migrates old furniture type strings and old VOID value.
 */
function migrateLayout(layout: OfficeLayout): OfficeLayout {
  // Migrate furniture types
  layout = { ...layout, furniture: migrateFurnitureTypes(layout.furniture) };

  // Migrate old VOID value (was 8, now 255) — only for legacy layouts since FLOOR_8 reuses value 8
  const OLD_VOID = 8;
  if (!layout.layoutRevision && layout.tiles.includes(OLD_VOID as TileTypeVal)) {
    layout = {
      ...layout,
      tiles: layout.tiles.map((t) => (t === OLD_VOID ? (TileType.VOID as TileTypeVal) : t)),
    };
  }

  if (layout.tileColors && layout.tileColors.length === layout.tiles.length) {
    return layout; // Already migrated tile colors
  }

  // Check if any tiles use old values (1-4) — these map directly to FLOOR_1-4
  // but need color assignments
  const tileColors: Array<FloorColor | null> = [];
  for (const tile of layout.tiles) {
    switch (tile) {
      case 0: // WALL
        tileColors.push(null);
        break;
      case 1: // was TILE_FLOOR → FLOOR_1 beige
        tileColors.push({ h: 35, s: 30, b: 15, c: 0 });
        break;
      case 2: // was WOOD_FLOOR → FLOOR_2 brown
        tileColors.push({ h: 25, s: 45, b: 5, c: 10 });
        break;
      case 3: // was CARPET → FLOOR_3 purple
        tileColors.push({ h: 280, s: 40, b: -5, c: 0 });
        break;
      case 4: // was DOORWAY → FLOOR_4 tan
        tileColors.push({ h: 35, s: 25, b: 10, c: 0 });
        break;
      default:
        // Floor tile types without colors — use neutral gray
        tileColors.push(tile > 0 && tile !== TileType.VOID ? { h: 0, s: 0, b: 0, c: 0 } : null);
    }
  }

  return { ...layout, tileColors };
}
