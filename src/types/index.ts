export interface RunPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface Run {
  id: string;
  date: string;
  points: RunPoint[];
  distanceMeters: number;
  durationMs: number;
  notes?: string;
}

export interface RunStats {
  distanceKm: number;
  durationMs: number;
  avgPaceMinPerKm: number | null;
}

