import { useState } from "react";
import type { MissionType, AircraftType, BaseType, ATOOrder } from "@/types/game";
import { X, Plus, Save } from "lucide-react";

interface ATOEditorProps {
  order?: ATOOrder; // if editing
  onSave: (order: Omit<ATOOrder, "id" | "status" | "assignedAircraft">) => void;
  onCancel: () => void;
}

const MISSION_TYPES: MissionType[] = ["DCA", "QRA", "RECCE", "AEW", "AI_DT", "AI_ST", "ESCORT", "TRANSPORT"];
const AIRCRAFT_TYPES: AircraftType[] = ["GripenE", "GripenF_EA", "GlobalEye", "VLO_UCAV", "LOTUS"];
const BASES: BaseType[] = ["MOB", "FOB_N", "FOB_S"];
const PRIORITIES = ["high", "medium", "low"] as const;

export function ATOEditor({ order, onSave, onCancel }: ATOEditorProps) {
  const [missionType, setMissionType] = useState<MissionType>(order?.missionType ?? "DCA");
  const [label, setLabel] = useState(order?.label ?? "");
  const [startHour, setStartHour] = useState(order?.startHour ?? 6);
  const [endHour, setEndHour] = useState(order?.endHour ?? 12);
  const [requiredCount, setRequiredCount] = useState(order?.requiredCount ?? 2);
  const [aircraftType, setAircraftType] = useState<AircraftType | "">(order?.aircraftType ?? "");
  const [payload, setPayload] = useState(order?.payload ?? "");
  const [launchBase, setLaunchBase] = useState<BaseType>(order?.launchBase ?? "MOB");
  const [priority, setPriority] = useState<"high" | "medium" | "low">(order?.priority ?? "medium");
  const [day, setDay] = useState(order?.day ?? 1);

  const handleSubmit = () => {
    onSave({
      day,
      missionType,
      label: label || `${missionType}-uppdrag`,
      startHour,
      endHour,
      requiredCount,
      aircraftType: aircraftType || undefined,
      payload: payload || undefined,
      launchBase,
      priority,
      sortiesPerDay: undefined,
    });
  };

  const fieldStyle = {
    background: "hsl(216 18% 97%)",
    border: "1px solid hsl(215 14% 86%)",
    color: "hsl(220 63% 18%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(220 63% 10% / 0.5)" }}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(215 14% 84%)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{
            background: "hsl(220 63% 18%)",
            borderBottom: "2px solid hsl(42 64% 53% / 0.5)",
          }}
        >
          <div className="flex items-center gap-2">
            {order ? <Save className="h-4 w-4" style={{ color: "hsl(42 64% 62%)" }} /> : <Plus className="h-4 w-4" style={{ color: "hsl(42 64% 62%)" }} />}
            <h3 className="text-sm font-mono font-bold" style={{ color: "hsl(42 64% 62%)" }}>
              {order ? "REDIGERA ORDER" : "NY ATO-ORDER"}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" style={{ color: "hsl(200 12% 72%)" }} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>UPPDRAGSTYP</label>
              <select
                value={missionType}
                onChange={(e) => setMissionType(e.target.value as MissionType)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                {MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>PRIORITET</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p === "high" ? "HÖG" : p === "medium" ? "MEDEL" : "LÅG"}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>BENÄMNING</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="t.ex. Defensivt luftförsvar"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              style={fieldStyle}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>START</label>
              <input
                type="number"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>SLUT</label>
              <input
                type="number"
                min={1}
                max={24}
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>ANTAL FPL</label>
              <input
                type="number"
                min={1}
                max={20}
                value={requiredCount}
                onChange={(e) => setRequiredCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>FLYGPLANSTYP</label>
              <select
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value as AircraftType | "")}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                <option value="">Valfri</option>
                {AIRCRAFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>STARTBAS</label>
              <select
                value={launchBase}
                onChange={(e) => setLaunchBase(e.target.value as BaseType)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                {BASES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>LASTNING / BEVÄPNING</label>
            <input
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="t.ex. IRIS-T + Meteor"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              style={fieldStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-2"
          style={{ borderTop: "1px solid hsl(215 14% 88%)", background: "hsl(216 18% 98%)" }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[10px] font-mono font-bold rounded-lg"
            style={{ color: "hsl(218 15% 50%)" }}
          >
            AVBRYT
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold rounded-lg transition-all hover:opacity-90"
            style={{
              background: "hsl(220 63% 18%)",
              color: "hsl(42 64% 62%)",
              border: "1px solid hsl(42 64% 53% / 0.3)",
            }}
          >
            <Save className="h-3.5 w-3.5" />
            {order ? "SPARA ÄNDRINGAR" : "SKAPA ORDER"}
          </button>
        </div>
      </div>
    </div>
  );
}
