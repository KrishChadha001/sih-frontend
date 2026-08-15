import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BellRing, Gauge, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FluidWatch — Live Infusion Monitoring for Wards" },
      {
        name: "description",
        content:
          "FluidWatch streams infusion flow rate and fluid level for every ward bed, alerts nurses on critical drips, and gives admins full control of thresholds and staff access.",
      },
      { property: "og:title", content: "FluidWatch — Live Infusion Monitoring for Wards" },
      {
        property: "og:description",
        content: "Real-time bed-by-bed infusion monitoring with instant critical alerts and an admin control panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Gauge, title: "Live telemetry", body: "Flow rate and fluid level for every bed, streamed over WebSocket." },
  { icon: BellRing, title: "Critical alerts", body: "Audible and on-screen alarms the moment a drip goes critical." },
  { icon: ShieldCheck, title: "Admin control", body: "Manage staff roles, alert thresholds and the ward data source." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-6">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </span>
        <span className="text-lg font-bold tracking-tight">FluidWatch</span>
        <div className="ml-auto">
          <Button asChild>
            <Link to="/auth">Staff sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-success" /> Ward A monitoring online
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight">Never miss an empty drip again</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          FluidWatch watches every infusion pump on the ward and calls out the ones that need a nurse — before the
          line runs dry.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Open the console</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-6">
            <Icon className="size-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
