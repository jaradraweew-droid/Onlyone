import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../socket';
import type { User } from '../types';

export interface NearbyUser {
  userName: string;
  seedCode: string;
  distance: number;
}

export function useNearbyRadar(user: User) {
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startScan = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsScanning(true);
    setError(null);
    setNearbyUsers([]);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        socket.emit('radar_scan', {
          userId: user.id,
          userName: user.name || 'Anonymous',
          seedCode: user.seedCode,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        setIsScanning(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. Please enable it to find nearby users.');
        } else {
          setError('Unable to retrieve your location');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }, [user]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    socket.emit('radar_stop');
  }, []);

  useEffect(() => {
    const handleResults = (results: NearbyUser[]) => {
      setNearbyUsers((prev) => {
        const map = new Map(prev.map(u => [u.seedCode, u]));
        results.forEach(u => map.set(u.seedCode, u));
        return Array.from(map.values());
      });
    };

    socket.on('radar_results', handleResults);
    
    return () => {
      socket.off('radar_results', handleResults);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      socket.emit('radar_stop');
    };
  }, []);

  return { isScanning, nearbyUsers, error, startScan, stopScan };
}
