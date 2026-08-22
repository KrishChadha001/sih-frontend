export type BedStatus = "STABLE" | "WATCH" | "CRITICAL";

// Rough model self-agreement signal, camera path only - see
// server/app/cv/base.py's FrameResult.aux_class.
export type AuxClass = "empty" | "50%" | "80%" | "full";

// How many past level readings each bed keeps for its sparkline. At a
// 10s capture interval that's ~5 minutes of history - enough to show a
// visible trend on a card without the array growing unbounded over a
// long-running demo.
const MAX_HISTORY_POINTS = 30;

export interface Bed {
  id: string;
  bed: string;
  patient: string;
  fluid: string;
  flow: number; // ml/hr
  level: number; // %
  status: BedStatus;
  muted: boolean;
  updatedAt: number;
  auxClass: AuxClass | null;
  history: number[]; // recent level % readings, oldest first
}

// Backend's /ws/bedfeed (server/app/routers/ws.py) - bridges the ESP32
// firmware's readings into this exact shape. For a demo where the
// dashboard runs on a different machine than the backend, swap
// "localhost" for the backend host's LAN IP (or change it live from the
// Admin panel, which persists to ward_settings.ws_url).
export const DEFAULT_WS_URL = "ws://localhost:8000/ws/bedfeed";

export const INITIAL_BEDS: Bed[] = [
  { id: "01", bed: "Bed 01", patient: "J. Marsh", fluid: "Saline 0.9%", flow: 124, level: 78, status: "STABLE", muted: false, updatedAt: Date.now(), auxClass: null, history: [78] },
  { id: "02", bed: "Bed 02", patient: "A. Chen", fluid: "Dextrose 5%", flow: 98, level: 64, status: "STABLE", muted: false, updatedAt: Date.now(), auxClass: null, history: [64] },
  { id: "03", bed: "Bed 03", patient: "R. Kovac", fluid: "Heparin drip", flow: 12, level: 8, status: "CRITICAL", muted: false, updatedAt: Date.now(), auxClass: null, history: [8] },
  { id: "04", bed: "Bed 04", patient: "M. Osei", fluid: "Ringer's Lactate", flow: 110, level: 91, status: "STABLE", muted: false, updatedAt: Date.now(), auxClass: null, history: [91] },
  { id: "05", bed: "Bed 05", patient: "L. Vidal", fluid: "Saline 0.9%", flow: 45, level: 31, status: "WATCH", muted: false, updatedAt: Date.now(), auxClass: null, history: [31] },
  { id: "06", bed: "Bed 06", patient: "T. Nakamura", fluid: "TPN Nutrition", flow: 0, level: 2, status: "CRITICAL", muted: false, updatedAt: Date.now(), auxClass: null, history: [2] },
];

function pushHistory(history: number[], level: number): number[] {
  const next = [...history, level];
  return next.length > MAX_HISTORY_POINTS ? next.slice(next.length - MAX_HISTORY_POINTS) : next;
}

/** Ward-configurable alert thresholds, set from the Admin panel and
 * persisted to Supabase's `ward_settings` row. */
export interface Thresholds {
  watchLevel: number;
  criticalLevel: number;
  minFlow: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  watchLevel: 35,
  criticalLevel: 10,
  minFlow: 15,
};

export function deriveStatus(
  level: number,
  flow: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): BedStatus {
  if (level <= thresholds.criticalLevel || flow <= thresholds.minFlow) return "CRITICAL";
  if (level <= thresholds.watchLevel) return "WATCH";
  return "STABLE";
}

/** Simulated telemetry tick used when no WebSocket server is reachable. */
export function tick(beds: Bed[], thresholds: Thresholds = DEFAULT_THRESHOLDS): Bed[] {
  return beds.map((b) => {
    const drain = b.flow > 0 ? Math.random() * 1.2 : 0;
    const level = Math.max(0, Math.round((b.level - drain) * 10) / 10);
    const jitter = b.flow > 0 ? Math.round((Math.random() - 0.5) * 8) : 0;
    const flow = level <= 0 ? 0 : Math.max(0, b.flow + jitter);
    return {
      ...b,
      level,
      flow,
      status: deriveStatus(level, flow, thresholds),
      updatedAt: Date.now(),
      history: pushHistory(b.history, level),
    };
  });
}

/**
 * Merges a live payload from the ward WebSocket into the current bed
 * list. Existing beds (by id) are updated in place; an id not already
 * present becomes a new card - this is how a real device (id = its
 * DEVICE_ID, e.g. "IV-STAND-01") shows up alongside the demo beds the
 * first time it reports in, no manual provisioning needed on this side.
 */
const AUX_CLASSES: readonly AuxClass[] = ["empty", "50%", "80%", "full"];

function parseAuxClass(value: unknown): AuxClass | null {
  return typeof value === "string" && (AUX_CLASSES as readonly string[]).includes(value)
    ? (value as AuxClass)
    : null;
}

export function applyLiveUpdate(
  beds: Bed[],
  payload: unknown,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Bed[] {
  const rows = Array.isArray(payload) ? payload : [payload];
  const byId = new Map(beds.map((b) => [b.id, b]));

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const incoming = row as Partial<Bed> & { auxClass?: unknown };
    const id = String(incoming.id ?? "").trim();
    if (!id) continue;

    const existing = byId.get(id);
    const flow = typeof incoming.flow === "number" ? incoming.flow : (existing?.flow ?? 0);
    const level = typeof incoming.level === "number" ? incoming.level : (existing?.level ?? 0);

    byId.set(id, {
      id,
      bed: incoming.bed ?? existing?.bed ?? `Device ${id}`,
      patient: incoming.patient ?? existing?.patient ?? "Unassigned",
      fluid: incoming.fluid ?? existing?.fluid ?? "Unknown",
      flow,
      level,
      status: incoming.status ?? deriveStatus(level, flow, thresholds),
      muted: existing?.muted ?? false,
      updatedAt: Date.now(),
      auxClass: parseAuxClass(incoming.auxClass) ?? existing?.auxClass ?? null,
      history: pushHistory(existing?.history ?? [], level),
    });
  }

  return Array.from(byId.values());
}

/**
 * The dashboard only ever gets handed a WebSocket URL
 * (ws://host:port/ws/bedfeed) - the backend's plain-HTTP origin (for
 * fetching a device's latest photo) is the same host/port, just a
 * different scheme and path. Derived rather than configured separately
 * so there's only one URL to ever change (in /admin).
 */
export function deriveHttpOrigin(wsUrl: string): string | null {
  try {
    const u = new URL(wsUrl);
    u.protocol = u.protocol === "wss:" ? "https:" : "http:";
    u.pathname = "";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** URL for a device's most recently uploaded camera frame, or null if
 * the backend's origin can't be determined (bad ws_url) - callers
 * should skip rendering an image in that case rather than requesting a
 * broken URL. Includes a cache-busting param so the browser re-fetches
 * on every new reading instead of showing a stale cached image. */
export function frameImageUrl(httpOrigin: string | null, deviceId: string, updatedAt: number): string | null {
  if (!httpOrigin) return null;
  return `${httpOrigin}/api/v1/frames/latest?device_id=${encodeURIComponent(deviceId)}&t=${updatedAt}`;
}

export const UNITS = {
  ml: { label: "ml", factor: 1, suffix: "ml/hr" },
  l: { label: "L", factor: 0.001, suffix: "L/hr" },
  drops: { label: "drops", factor: 1 / 3, suffix: "gtt/min" },
} as const;

export type UnitKey = keyof typeof UNITS;

export function formatFlow(flow: number, unit: UnitKey) {
  const v = flow * UNITS[unit].factor;
  if (unit === "l") return v.toFixed(2);
  return Math.round(v).toString();
}
