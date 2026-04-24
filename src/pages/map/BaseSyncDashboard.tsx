import { Radar, Shield, Plane, Warehouse, Wind, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAircraft } from "@/core/units/helpers";
import type { Base } from "@/types/game";
import type { AirDefenseBattery, RadarStation } from "@/types/airCommand";

function stateLabel(status: string) {
  switch (status) {
    case "on_mission":
    case "returning":
      return "Scrambled";
    case "under_maintenance":
    case "recovering":
      return "Maintenance";
    case "awaiting_launch":
    case "in_preparation":
      return "Apron";
    default:
      return "Hangar";
  }
}

export function BaseSyncDashboard({
  open,
  onOpenChange,
  base,
  supportingRadars,
  supportingDefenses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  base?: Base;
  supportingRadars: RadarStation[];
  supportingDefenses: AirDefenseBattery[];
}) {
  const aircraft = base ? getAircraft(base) : [];
  const scrambled = aircraft.filter((item) => item.status === "on_mission" || item.status === "returning");
  const onGround = aircraft.filter((item) => !scrambled.includes(item));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-border bg-background p-0">
        {base && (
          <>
            <DialogHeader className="border-b border-border px-6 py-5">
              <DialogTitle className="font-mono text-lg tracking-[0.16em]">
                BASE SYNC · {base.name}
              </DialogTitle>
              <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.18em]">
                {base.icaoCode ?? base.id} · {base.operationalStatus ?? "Active"} · Hangar {onGround.length}/{base.hangarCapacity ?? 0} · Ramp {scrambled.length}/{base.rampCapacity ?? 0}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-card/70 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <Plane className="h-3.5 w-3.5" />
                    SCRAMBLED
                  </div>
                  <div className="mt-2 text-2xl font-bold text-status-blue">{scrambled.length}</div>
                </div>
                <div className="rounded-xl border border-border bg-card/70 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <Warehouse className="h-3.5 w-3.5" />
                    HANGAR / APRON
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{onGround.length}</div>
                </div>
                <div className="rounded-xl border border-border bg-card/70 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <Wind className="h-3.5 w-3.5" />
                    WEATHER
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    {base.weather ? `${base.weather.condition} · ${base.weather.visibilityKm} km` : "UNKNOWN"}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card/70 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" />
                    BAYS
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    {base.maintenanceBays.occupied}/{base.maintenanceBays.total} occupied
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.35fr,1fr]">
                <div className="grid gap-5 md:grid-cols-2">
                  <section className="rounded-xl border border-border bg-card/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-status-blue">
                      <Plane className="h-3.5 w-3.5" />
                      Scrambled
                    </div>
                    <div className="space-y-2">
                      {scrambled.length > 0 ? scrambled.map((item) => (
                        <div key={item.id} className="rounded-lg border border-status-blue/20 bg-status-blue/5 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-foreground">{item.callsign ?? item.tailNumber}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {item.type} · {item.tacMission ?? item.currentMission ?? "Tasked"} · ETA {item.estimatedLandingTime ?? "TBD"}
                              </div>
                            </div>
                            <div className="text-right text-[10px] font-mono">
                              <div className="font-bold text-status-blue">{item.fuel.toFixed(0)}%</div>
                              <div className="text-muted-foreground">{item.fuelStatus ?? "Normal"}</div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-dashed border-border px-3 py-4 text-[10px] font-mono text-muted-foreground">
                          No aircraft currently airborne from this base.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-card/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-foreground">
                      <Warehouse className="h-3.5 w-3.5" />
                      Hangar / Apron
                    </div>
                    <div className="space-y-2">
                      {onGround.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border bg-background/60 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-foreground">{item.callsign ?? item.tailNumber}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {item.type} · {stateLabel(item.status)}
                              </div>
                            </div>
                            <div className="text-right text-[10px] font-mono">
                              <div className="font-bold text-foreground">{item.hoursToService}h</div>
                              <div className="text-muted-foreground">{item.weaponStatus ?? "Safe"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-xl border border-border bg-card/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      <Radar className="h-3.5 w-3.5" />
                      Supporting Radars
                    </div>
                    <div className="space-y-2">
                      {supportingRadars.map((station) => (
                        <div key={station.id} className="rounded-lg border border-border bg-background/60 px-3 py-2">
                          <div className="text-sm font-bold text-foreground">{station.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {station.type} · {station.coverageKm} km · {station.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-card/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      Air Defenses
                    </div>
                    <div className="space-y-2">
                      {supportingDefenses.map((battery) => (
                        <div key={battery.id} className="rounded-lg border border-border bg-background/60 px-3 py-2">
                          <div className="text-sm font-bold text-foreground">{battery.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {battery.system} · {battery.missiles.ready}/{battery.missiles.max} missiles ready · {battery.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
