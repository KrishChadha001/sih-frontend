import { useEffect, useState } from "react";
import { AlertTriangle, Bell, BellOff, CheckCircle2, Clock, Droplet } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatFlow, frameImageUrl, UNITS, type Bed, type UnitKey } from "@/lib/fluidwatch";

const statusStyles: Record<Bed["status"], string> = {
  STABLE: "bg-success-soft text-success",
  WATCH: "bg-warn-soft text-warn",
  CRITICAL: "bg-critical-soft text-critical",
};

const barStyles: Record<Bed["status"], string> = {
  STABLE: "bg-success",
  WATCH: "bg-warn",
  CRITICAL: "bg-critical",
};

const sparklineStroke: Record<Bed["status"], string> = {
  STABLE: "var(--success)",
  WATCH: "var(--warn)",
  CRITICAL: "var(--critical)",
};

const StatusIcon = ({ status }: { status: Bed["status"] }) =>
  status === "STABLE" ? (
    <CheckCircle2 className="size-3.5" />
  ) : status === "WATCH" ? (
    <Clock className="size-3.5" />
  ) : (
    <AlertTriangle className="size-3.5" />
  );

/** "just now" / "12s ago" / "4m ago", ticking every second. Deliberately
 * its own component, not a hook called inside BedCard - a hook's state
 * lives in whichever component calls it, so ticking every second would
 * re-render the *entire* card (image, sparkline chart, everything) once
 * a second. Isolated here, only this small text node re-renders. */
function FreshnessLabel({ updatedAt }: { updatedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));
  const label = seconds < 3 ? "just now" : seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;

  return (
    <span className="mt-0.5 shrink-0 text-xs text-muted-foreground" title={new Date(updatedAt).toLocaleTimeString()}>
      {label}
    </span>
  );
}

export function BedCard({
  bed,
  unit,
  httpOrigin,
  onToggleMute,
}: {
  bed: Bed;
  unit: UnitKey;
  httpOrigin: string | null;
  onToggleMute: (id: string) => void;
}) {
  const critical = bed.status === "CRITICAL";
  const imageUrl = frameImageUrl(httpOrigin, bed.id, bed.updatedAt);
  // Tracks the specific URL that failed, not just a boolean - so a demo
  // bed (no photo, ever) stays hidden without a broken-image flash, but
  // a real device's transient failure doesn't hide it forever once the
  // next reading's URL (a new cache-busted timestamp) comes in.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && imageUrl !== failedUrl;
  const sparklineData = bed.history.map((level, i) => ({ i, level }));

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-6 shadow-sm transition-colors",
        critical ? "card-critical" : "border-border",
      )}
      aria-label={`${bed.bed} ${bed.patient} ${bed.status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {bed.bed} · {bed.patient}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{bed.fluid}</p>
        </div>
        <FreshnessLabel updatedAt={bed.updatedAt} />
      </div>

      {showImage && (
        <img
          key={imageUrl}
          src={imageUrl}
          onError={() => setFailedUrl(imageUrl)}
          alt={`Latest camera frame for ${bed.bed}`}
          className="mt-3 aspect-video w-full rounded-lg border border-border object-cover"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tracking-wide",
            statusStyles[bed.status],
          )}
        >
          <StatusIcon status={bed.status} />
          {bed.status}
        </span>
        {bed.auxClass && (
          <span
            className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
            title="Model's auxiliary classification, from the same image"
          >
            AI read: {bed.auxClass}
          </span>
        )}
      </div>

      <p className="mt-5 text-xs font-medium tracking-widest text-muted-foreground">CURRENT FLOW</p>
      <div className="flex items-end justify-between gap-4">
        <p className={cn("text-5xl font-bold tracking-tight", critical && "text-critical")}>
          {formatFlow(bed.flow, unit)}
          <span className="text-xl font-semibold">{UNITS[unit].suffix.split("/")[0]}</span>
          <span className="text-xl font-medium text-muted-foreground">
            /{UNITS[unit].suffix.split("/")[1]}
          </span>
        </p>
        <div className="flex flex-col items-center">
          {critical ? (
            <AlertTriangle className="size-8 text-critical" />
          ) : (
            <Droplet
              className={cn("size-8", bed.status === "WATCH" ? "text-warn" : "text-foreground")}
            />
          )}
          <span
            className={cn(
              "mt-1 text-sm font-semibold",
              critical ? "text-critical" : bed.status === "WATCH" ? "text-warn" : "text-foreground",
            )}
          >
            {Math.round(bed.level)}%
          </span>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">Fluid Level</p>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", barStyles[bed.status])}
          style={{ width: `${Math.max(1, Math.min(100, bed.level))}%` }}
        />
      </div>

      {sparklineData.length > 1 && (
        <div className="mt-3 h-10 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <YAxis domain={[0, 100]} hide />
              <Line
                type="monotone"
                dataKey="level"
                stroke={sparklineStroke[bed.status]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {critical && (
        <Button
          variant={bed.muted ? "outline" : "default"}
          className="mt-4 w-full"
          onClick={() => onToggleMute(bed.id)}
        >
          {bed.muted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          {bed.muted ? "Unmute alarm" : "Mute alarm"}
        </Button>
      )}
    </article>
  );
}
