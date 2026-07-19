import { SimulationState } from "../types.js";

type Listener = (state: SimulationState) => void;

class SimulationStore {
  private listeners = new Set<Listener>();
  private currentState: SimulationState | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Subscribes a component to the live simulation feeds.
   * Starts background polling when the first listener registers, and cleans up when the last one unregisters.
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.currentState) {
      listener(this.currentState);
    }
    
    // Lazy start polling on the first subscriber
    if (this.listeners.size === 1) {
      this.startPolling();
    }

    return () => {
      this.listeners.delete(listener);
      // Clean up polling if no active subscribers exist
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling(): void {
    this.fetchState();
    this.intervalId = setInterval(() => {
      this.fetchState();
    }, 5000); // Refresh data every 5 seconds
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Triggers an immediate HTTP pull of the server-side stadium simulation state.
   */
  public async fetchState(): Promise<void> {
    try {
      const res = await fetch("/api/simulation");
      if (res.ok) {
        const data: SimulationState = await res.json();
        this.currentState = data;
        this.listeners.forEach((listener) => listener(data));
      }
    } catch (e) {
      console.error("[SimulationStore] Failed to fetch live state from backend:", e);
    }
  }

  /**
   * Returns the last cached state or null.
   */
  public getCurrentState(): SimulationState | null {
    return this.currentState;
  }
}

export const simulationStore = new SimulationStore();
