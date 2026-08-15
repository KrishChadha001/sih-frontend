export type BedStatus = "STABLE" | "WATCH" | "CRITICAL";

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
}

export const DEFAULT_WS_URL = "ws://localhost:8765";

export const INITIAL_BEDS: Bed[] = [
  { id: "01", bed: "Bed 01", patient: "J. Marsh", fluid: "Saline 0.9%", flow: 124, level: 78, status: "STABLE", muted: false, updatedAt: Date.now() },
  { id: "02", bed: "Bed 02", patient: "A. Chen", fluid: "Dextrose 5%", flow: 98, level: 64, status: "STABLE", muted: false, updatedAt: Date.now() },
  { id: "03", bed: "Bed 03", patient: "R. Kovac", fluid: "Heparin drip", flow: 12, level: 8, status: "CRITICAL", muted: false, updatedAt: Date.now() },
  { id: "04", bed: "Bed 04", patient: "M. Osei", fluid: "Ringer's Lactate", flow: 110, level: 91, status: "STABLE", muted: false, updatedAt: Date.now() },
  { id: "05", bed: "Bed 05", patient: "L. Vidal", fluid: "Saline 0.9%", flow: 45, level: 31, status: "WATCH", muted: false, updatedAt: Date.now() },
  { id: "06", bed: "Bed 06", patient: "T. Nakamura", fluid: "TPN Nutrition", flow: 0, level: 2, status: "CRITICAL", muted: false, updatedAt: Date.now() },
];

export function deriveStatus(level: number, flow: number): BedStatus {
  if (level <= 10 || flow <= 15) return "CRITICAL";
  if (level <= 35 || flow <= 50) return "WATCH";
  return "STABLE";
}

/** Simulated telemetry tick used when no WebSocket server is reachable. */
export function tick(beds: Bed[]): Bed[] {
  return beds.map((b) => {
    const drain = b.flow > 0 ? Math.random() * 1.2 : 0;
    const level = Math.max(0, Math.round((b.level - drain) * 10) / 10);
    const jitter = b.flow > 0 ? Math.round((Math.random() - 0.5) * 8) : 0;
    const flow = level <= 0 ? 0 : Math.max(0, b.flow + jitter);
    return { ...b, level, flow, status: deriveStatus(level, flow), updatedAt: Date.now() };
  });
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
