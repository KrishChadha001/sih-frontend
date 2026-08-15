import { AlertTriangle, Bell, BellOff, CheckCircle2, Clock, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatFlow, UNITS, type Bed, type UnitKey } from "@/lib/fluidwatch";

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

const StatusIcon = ({ status }: { status: Bed["status"] }) =>
  status === "STABLE" ? (
    <CheckCircle2 className="size-3.5" />
  ) : status === "WATCH" ? (
    <Clock className="size-3.5" />
  ) : (
    <AlertTriangle className="size-3.5" />
  );

export function BedCard({
  bed,
  unit,
  onToggleMute,
}: {
  bed: Bed;
  unit: UnitKey;
  onToggleMute: (id: string) => void;
}) {
  const critical = bed.status === "CRITICAL";

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-6 shadow-sm transition-colors",
        critical ? "card-critical" : "border-border",
      )}
      aria-label={`${bed.bed} ${bed.patient} ${bed.status}`}
    >
      <h3 className="text-lg font-semibold tracking-tight">
        {bed.bed} · {bed.patient}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{bed.fluid}</p>

      <span
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tracking-wide",
          statusStyles[bed.status],
        )}
      >
        <StatusIcon status={bed.status} />
        {bed.status}
      </span>

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
