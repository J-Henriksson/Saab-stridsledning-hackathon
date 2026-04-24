import { useEffect, useState, useRef } from 'react';
import { ExtendedRadarUnit } from '../types/radarUnit';
import { haversineDistance } from '../utils/geoDistance';

interface Contact {
  id: string;
  position: { lat: number; lng: number };
  type: 'hostile' | 'neutral';
  velocity: { lat: number; lng: number }; // per second
}

export function useRadarDetection(
  radarUnits: ExtendedRadarUnit[],
  onUpdateContacts: (radarId: string, contactIds: string[]) => void
) {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 'target-alpha',
      position: { lat: 60.0, lng: 16.0 },
      type: 'hostile',
      velocity: { lat: 0.005, lng: 0.01 }, // Moving NE
    },
    {
      id: 'target-bravo',
      position: { lat: 56.5, lng: 14.5 },
      type: 'hostile',
      velocity: { lat: -0.002, lng: -0.005 }, // Moving SW
    },
  ]);

  const lastUpdate = useRef<number>(Date.now());

  // 1. Move contacts (Simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastUpdate.current) / 1000;
      lastUpdate.current = now;

      setContacts((prev) =>
        prev.map((c) => ({
          ...c,
          position: {
            lat: c.position.lat + c.velocity.lat * dt,
            lng: c.position.lng + c.velocity.lng * dt,
          },
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 2. Detection Check
  useEffect(() => {
    radarUnits.forEach((radar) => {
      if (radar.status !== 'operational') {
        if (radar.detectedContactIds.length > 0) {
          onUpdateContacts(radar.id, []);
        }
        return;
      }

      const detected = contacts
        .filter((c) => {
          const dist = haversineDistance(radar.position, c.position);
          return dist <= radar.rangeRadius;
        })
        .map((c) => c.id);

      // Simple stable comparison to avoid recursive updates
      const currentIds = [...radar.detectedContactIds].sort();
      const newIds = [...detected].sort();
      
      if (
        currentIds.length !== newIds.length ||
        currentIds.some((id, index) => id !== newIds[index])
      ) {
        onUpdateContacts(radar.id, detected);
      }
    });
  }, [contacts, radarUnits, onUpdateContacts]);

  return { contacts };
}
