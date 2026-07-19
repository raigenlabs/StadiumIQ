import { useEffect, useState } from "react";
import { SimulationState } from "../types.js";
import { simulationStore } from "../utils/simulationStore.js";

/**
 * Custom React hook subscribing the calling component to the global, polled simulation feeds.
 * Guarantees that only components referencing this hook re-render when a tick completes.
 */
export function useSimulation(): SimulationState | null {
  const [data, setData] = useState<SimulationState | null>(simulationStore.getCurrentState());

  useEffect(() => {
    // Register subscription
    const unsubscribe = simulationStore.subscribe((newState) => {
      setData(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return data;
}
