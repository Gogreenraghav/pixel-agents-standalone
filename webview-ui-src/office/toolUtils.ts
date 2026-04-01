/** Map status prefixes back to tool names for animation selection */
export const STATUS_TO_TOOL: Record<string, string> = {
  Reading: 'Read',
  Searching: 'Grep',
  Globbing: 'Glob',
  Fetching: 'WebFetch',
  'Searching web': 'WebSearch',
  Writing: 'Write',
  Editing: 'Edit',
  Running: 'Bash',
  Task: 'Task',
};

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool;
  }
  const first = status.split(/[\s:]/)[0];
  return first || null;
}

import { ZOOM_DEFAULT_DPR_FACTOR, ZOOM_MIN } from '../constants.js';

/** Compute a default zoom level that fits the large office map */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  // Use a smaller factor for the large 36x22 map so whole office is visible
  const raw = ZOOM_DEFAULT_DPR_FACTOR * dpr;
  // Allow half-steps: 0.5, 1, 1.5, 2 ...
  const snapped = Math.round(raw * 2) / 2;
  return Math.max(ZOOM_MIN, snapped);
}
