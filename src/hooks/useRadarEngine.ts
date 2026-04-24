import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { ExtendedRadarUnit, RadarStatus } from '../types/radarUnit';

export function useRadarEngine() {
  const { state, dispatch } = useGame();

  const updateRadarStatus = useCallback((radarId: string, status: RadarStatus) => {
    // We map mission status to the engine's internal states
    // emitting: boolean
    // deployedState: 'emplaced' | 'stowed'
    
    const emitting = status === 'operational';
    const deployedState = status === 'maintenance' ? 'stowed' : 'emplaced';

    dispatch({ type: 'SET_RADAR_EMITTING', unitId: radarId, emitting });
    dispatch({ type: 'SET_AD_STATE', unitId: radarId, deployedState });
    
    // Also dispatch a custom event for status change
    dispatch({
      type: 'ADD_EVENT',
      event: {
        type: 'info',
        message: `Radar ${radarId} status ändrad till ${status}`,
        unitId: radarId,
        unitCategory: 'radar',
      }
    });
  }, [dispatch]);

  const updateRadarPosition = useCallback((radarId: string, position: { lat: number; lng: number }) => {
    dispatch({
      type: 'RELOCATE_UNIT',
      unitId: radarId,
      destination: position,
    });
  }, [dispatch]);

  // For detection, we might need a specific action if we want to persist detected contacts in the global state
  // Since GameAction doesn't have UPDATE_RADAR_CONTACTS, we will handle it locally in the layer or 
  // we can extend GameAction if needed. For now, let's assume detection is a visual/local effect 
  // unless we want the AI to react to it.
  
  return {
    updateRadarStatus,
    updateRadarPosition,
  };
}
