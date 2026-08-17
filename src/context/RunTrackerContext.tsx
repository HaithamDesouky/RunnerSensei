import React, { createContext, useContext } from "react";
import { useRunTracker, UseRunTrackerReturn } from "../hooks/useRunTracker";

const RunTrackerContext = createContext<UseRunTrackerReturn | null>(null);

export const RunTrackerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <RunTrackerContext.Provider value={useRunTracker()}>
    {children}
  </RunTrackerContext.Provider>
);

export function useRunTrackerContext(): UseRunTrackerReturn {
  const ctx = useContext(RunTrackerContext);
  if (!ctx)
    throw new Error("useRunTrackerContext must be inside RunTrackerProvider");
  return ctx;
}

