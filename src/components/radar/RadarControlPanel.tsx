import React from 'react';
import { ExtendedRadarUnit, RadarStatus } from '../../types/radarUnit';
import { X, RotateCcw, Activity, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const hasMoved =
    unit.position.lat !== unit.basePosition.lat ||
    unit.position.lng !== unit.basePosition.lng;

  const getStatusColor = (status: RadarStatus) => {
    switch (status) {
      case 'operational':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'standby':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'maintenance':
        return 'bg-rose-500 hover:bg-rose-600';
      default:
        return 'bg-slate-500';
    }
  };

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
    <div className="flex-1 flex flex-col bg-slate-900/40 text-slate-100 font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
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
            <Badge className={getStatusColor(unit.status)}>
              {getStatusLabel(unit.status)}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['operational', 'standby', 'maintenance'] as RadarStatus[]).map(
              (s) => (
                <Button
                  key={s}
                  variant={unit.status === s ? 'default' : 'outline'}
                  size="sm"
                  className={`text-[10px] h-8 ${
                    unit.status === s ? getStatusColor(s) : 'border-slate-600 text-slate-300'
                  }`}
                  onClick={() => onUpdate({ status: s })}
                >
                  {getStatusLabel(s)}
                </Button>
              )
            )}
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
          <div className="p-2 bg-slate-950/50 rounded border border-slate-800 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span>Lat:</span>
              <span className="text-[#00E5C7]">{unit.position.lat.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lng:</span>
              <span className="text-[#00E5C7]">{unit.position.lng.toFixed(4)}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-[10px] h-8 border-slate-700 gap-2"
            disabled={!hasMoved}
            onClick={() => onUpdate({ position: unit.basePosition })}
          >
            <RotateCcw size={12} />
            Återställ position
          </Button>
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
