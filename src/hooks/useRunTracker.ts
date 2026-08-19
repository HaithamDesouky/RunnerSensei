import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { RunPoint } from "../types";
import { requestLocationPermissions } from "../utils/locationPermissions";

export interface UseRunTrackerReturn {
  isTracking: boolean;
  isPaused: boolean;
  points: RunPoint[];
  durationMs: number;
  startRun: () => Promise<boolean>;
  stopRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  resetRun: () => void;
}

export function useRunTracker(): UseRunTrackerReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [points, setPoints] = useState<RunPoint[]>([]);
  const [durationMs, setDurationMs] = useState(0);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(
      () =>
        setDurationMs(
          accumulatedRef.current + (Date.now() - startTimeRef.current),
        ),
      500,
    );
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRun = useCallback(async (): Promise<boolean> => {
    const granted = await requestLocationPermissions();
    if (!granted) return false;

    setPoints([]);
    setDurationMs(0);
    accumulatedRef.current = 0;
    setIsPaused(false);
    isPausedRef.current = false;

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      ({ coords, timestamp }) => {
        if (isPausedRef.current) return;
        setPoints((prev) => [
          ...prev,
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp,
            accuracy: coords.accuracy ?? undefined,
          },
        ]);
      },
    );

    setIsTracking(true);
    startTimer();
    return true;
  }, [startTimer]);

  const stopRun = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    stopTimer();
    if (!isPausedRef.current)
      accumulatedRef.current += Date.now() - startTimeRef.current;
    setDurationMs(accumulatedRef.current);
    setIsTracking(false);
    setIsPaused(false);
  }, [stopTimer]);

  const pauseRun = useCallback(() => {
    if (!isTracking || isPaused) return;
    accumulatedRef.current += Date.now() - startTimeRef.current;
    stopTimer();
    setIsPaused(true);
  }, [isTracking, isPaused, stopTimer]);

  const resumeRun = useCallback(() => {
    if (!isTracking || !isPaused) return;
    setIsPaused(false);
    startTimer();
  }, [isTracking, isPaused, startTimer]);

  const resetRun = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    stopTimer();
    setPoints([]);
    setDurationMs(0);
    setIsTracking(false);
    setIsPaused(false);
    accumulatedRef.current = 0;
  }, [stopTimer]);

  useEffect(
    () => () => {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return {
    isTracking,
    isPaused,
    points,
    durationMs,
    startRun,
    stopRun,
    pauseRun,
    resumeRun,
    resetRun,
  };
}

