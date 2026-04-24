import { useState } from "react";
import { ChevronDown, ChevronRight, Fuel, Zap, Wrench } from "lucide-react";
import type { Base, BaseType, GameAction } from "@/types/game";
import { Slider } from "@/components/ui/slider";

interface Props {
  bases: Base[];
  dispatch: (action: GameAction) => void;
}

function BaseEditor({ base, dispatch }: { base: Base; dispatch: (action: GameAction) => void }) {
  const [open, setOpen] = useState(false);
  const [fuel, setFuel] = useState(base.fuel);
  const [bays, setBays] = useState(base.maintenanceBays.total);
  const [ammo, setAmmo] = useState<{ type: string; quantity: number }[]>(
    base.ammunition.map((a) => ({ type: a.type, quantity: a.quantity }))
  );

  function commitFuel(val: number) {
    dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id as BaseType, fuel: val });
  }

  function commitBays() {
    dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id as BaseType, maintenanceBayTotal: bays });
  }

  function commitAmmo() {
    dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id as BaseType, ammo });
  }

  const fuelColor = fuel >= 60 ? "text-green-400" : fuel >= 30 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="border border-border rounded mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <div>
          <span className="text-xs font-mono font-bold text-foreground">{base.id}</span>
          <span className="text-[10px] text-muted-foreground ml-2">{base.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${fuelColor}`}>{Math.round(fuel)}%</span>
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4 border-t border-border pt-3">
          {/* Fuel */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Fuel className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Bränsle</span>
              <span className={`ml-auto text-[10px] font-mono font-bold ${fuelColor}`}>{Math.round(fuel)}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[fuel]}
              onValueChange={([v]) => setFuel(v)}
              onValueCommit={([v]) => commitFuel(v)}
            />
          </div>

          {/* Ammunition */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Ammunition</span>
            </div>
            <div className="space-y-1.5">
              {ammo.map((a, i) => (
                <div key={a.type} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">{a.type}</span>
                  <input
                    type="number"
                    min={0}
                    max={base.ammunition[i]?.max ?? 99}
                    value={a.quantity}
                    onChange={(e) => {
                      const next = [...ammo];
                      next[i] = { ...next[i], quantity: Number(e.target.value) };
                      setAmmo(next);
                    }}
                    onBlur={commitAmmo}
                    className="w-14 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right"
                  />
                  <span className="text-[10px] text-muted-foreground">/ {base.ammunition[i]?.max ?? "?"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance bays */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Underhållsplatser</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={base.maintenanceBays.occupied}
                max={20}
                value={bays}
                onChange={(e) => setBays(Number(e.target.value))}
                onBlur={commitBays}
                className="w-14 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right"
              />
              <span className="text-[10px] text-muted-foreground">total ({base.maintenanceBays.occupied} upptagna)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FriendlyBasesTab({ bases, dispatch }: Props) {
  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-3 font-mono">
        Justera resursnivåer för befintliga baser.
      </p>
      {bases.map((base) => (
        <BaseEditor key={base.id} base={base} dispatch={dispatch} />
      ))}
    </div>
  );
}
