import React from 'react';
import { ExtendedRadarUnit, RadarStatus } from '../../types/radarUnit';
import { X, RotateCcw, Activity, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RadarControlPanelProps {
  unit: ExtendedRadarUnit;
  onClose: () => void;
  onUpdate: (updates: Partial<ExtendedRadarUnit>) => void;
}

export const RadarControlPanel: React.FC<RadarControlPanelProps> = ({
  unit,
  onClose,
  onUpdate,
}) => {
  const effectiveBasePosition = unit.basePosition ?? unit.position;
  const hasDistinctBasePosition = !!unit.basePosition;
  const hasMoved =
    hasDistinctBasePosition && (
      unit.position.lat !== effectiveBasePosition.lat ||
      unit.position.lng !== effectiveBasePosition.lng
    );

const getStatusLabel = (status: RadarStatus) => {
    switch (status) {
      case 'operational':
        return 'Operativ';
      case 'standby':
        return 'Beredskap';
      case 'maintenance':
        return 'Underhåll';
      default:
        return status;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[#00E5C7]" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {unit.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Systemstatus</span>
            <Badge
              className={{
                operational: "bg-emerald-500 text-white",
                standby: "bg-amber-500 text-white",
                maintenance: "bg-rose-500 text-white",
              }[unit.status] ?? "bg-slate-500 text-white"}
            >
              {getStatusLabel(unit.status)}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['operational', 'standby', 'maintenance'] as RadarStatus[]).map((s) => {
              const active = unit.status === s;
              const colors: Record<RadarStatus, string> = {
                operational: "#10b981",
                standby: "#f59e0b",
                maintenance: "#f43f5e",
              };
              const c = colors[s];
              return (
                <button
                  key={s}
                  onClick={() => onUpdate({ status: s })}
                  className="h-8 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: active ? `${c}22` : "rgba(100,116,139,0.1)",
                    border: `1px solid ${active ? c : "rgba(100,116,139,0.3)"}`,
                    color: active ? c : "#94a3b8",
                  }}
                >
                  {getStatusLabel(s)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tactical Data Section */}
        <div className="space-y-2 border-t border-slate-700/50 pt-4">
          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-2">Sensordata</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 block uppercase">Räckvidd</span>
              <span className="text-xs text-[#00E5C7] font-bold">{unit.rangeRadius / 1000} km</span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 block uppercase">Svephastighet</span>
              <span className="text-xs text-slate-100 font-bold">{unit.sweepSpeed}°/s</span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 block uppercase">Aktiva spår</span>
              <span className={`text-xs font-bold ${unit.detectedContactIds.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {unit.detectedContactIds.length} st
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 block uppercase">Signalstyrka</span>
              <span className="text-xs text-slate-100 font-bold">{unit.status === 'operational' ? '98%' : '0%'}</span>
            </div>
          </div>
        </div>

        {/* Technical Health Section */}
        <div className="space-y-2 border-t border-slate-700/50 pt-4 text-[11px]">
           <div className="flex justify-between items-center">
             <span className="text-slate-400">Drifttid (Uptime):</span>
             <span className="text-slate-200">142h 12m</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-slate-400">MTBF Prognos:</span>
             <span className="text-emerald-400">GOD (850h)</span>
           </div>
        </div>

        {/* Position Control */}
        <div className="space-y-3 border-t border-slate-700/50 pt-4">
          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Geografisk Position</div>
          <div className="p-2 bg-slate-950 rounded border border-slate-700 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span>Lat:</span>
              <span className="text-[#00E5C7]">{unit.position.lat.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lng:</span>
              <span className="text-[#00E5C7]">{unit.position.lng.toFixed(4)}</span>
            </div>
          </div>
          <button
            disabled={!hasMoved}
            onClick={() => onUpdate({ position: effectiveBasePosition })}
            className="w-full flex items-center justify-center gap-2 h-8 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
            style={{
              background: hasMoved ? "rgba(0,229,199,0.12)" : "rgba(100,116,139,0.12)",
              border: `1px solid ${hasMoved ? "#00E5C7" : "rgba(100,116,139,0.4)"}`,
              color: hasMoved ? "#00E5C7" : "#475569",
              cursor: hasMoved ? "pointer" : "not-allowed",
            }}
          >
            <RotateCcw size={12} />
            Återställ position
          </button>
          <p className="text-[9px] font-mono text-center" style={{ color: hasMoved ? "#D7AB3A" : "#475569" }}>
            {!hasDistinctBasePosition
              ? "Basposition saknas för denna radarenhet"
              : hasMoved
                ? "⚠ Enheten har förflyttats från basposition"
                : "Enheten är på sin basposition"}
          </p>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="px-4 py-2 bg-[#00E5C7]/10 flex items-center justify-between">
        <span className="text-[8px] text-[#00E5C7] font-bold tracking-tighter uppercase">
          Tactical Radar Module v1.0
        </span>
        <Shield size={10} className="text-[#00E5C7]/40" />
      </div>
    </div>
  );
};
