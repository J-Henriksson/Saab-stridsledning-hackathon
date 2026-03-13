import { Base } from "@/types/game";
import { Users } from "lucide-react";

export function PersonnelPanel({ base }: { base: Base }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-sans font-bold text-sm text-foreground">PERSONAL</h3>
      </div>
      <div className="space-y-3">
        {base.personnel.map((group) => {
          const pct = (group.available / group.total) * 100;
          const strained = pct < 50;
          return (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">{group.role}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${strained ? "text-status-red" : "text-foreground"}`}>
                    {group.available}/{group.total}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${group.onDuty ? "bg-status-green/20 text-status-green" : "bg-muted text-muted-foreground"}`}>
                    {group.onDuty ? "I tjänst" : "Vila"}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${strained ? "bg-status-red" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">UH-platser</span>
          <span className="font-mono text-foreground">
            {base.maintenanceBays.occupied}/{base.maintenanceBays.total} upptagna
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
          <div
            className={`h-full rounded-full ${base.maintenanceBays.occupied >= base.maintenanceBays.total ? "bg-status-red" : "bg-status-amber"}`}
            style={{ width: `${(base.maintenanceBays.occupied / base.maintenanceBays.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
