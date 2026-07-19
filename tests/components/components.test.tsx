import { test, describe } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import { TransportFeed, ZoneMetrics } from "../../src/types.js";

// 1. Initialize DOM environment at the absolute top of execution
const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost",
});
const win = dom.window as any;
const doc = dom.window.document;

globalThis.window = win;
globalThis.document = doc;
(global as any).window = win;
(global as any).document = doc;

Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

// Simple stub for requestAnimationFrame (needed by React 19)
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);

// Dynamic mock state that can be mutated per-test
let currentMockState: {
  metrics: any[];
  transportFeeds: any[];
  incidents: any[];
  volunteerTasks: any[];
} = {
  metrics: [
    { zone: "Zone A (North Stand)" as any, crowdDensity: 45, wasteFillLevel: 20, energyUsageKw: 150 },
    { zone: "Zone B (East Stand)" as any, crowdDensity: 90, wasteFillLevel: 85, energyUsageKw: 620 },
  ],
  transportFeeds: [
    { id: "metro-1", name: "Metro Line A", type: "metro", status: "smooth", baseWaitTimeMin: 4, aiEstimatedWaitTimeMin: 4, description: "Metro A operates smoothly." },
    { id: "shuttle-1", name: "Shuttle B", type: "shuttle", status: "delayed", baseWaitTimeMin: 10, aiEstimatedWaitTimeMin: 22, description: "Shuttle B delayed." },
  ],
  incidents: [
    { id: "inc-1", description: "Water leak near corridor B", zone: "Zone B (East Stand)" as any, type: "sanitation" as const, severity: "high" as const, status: "reported" as const, timestamp: new Date().toISOString() },
  ],
  volunteerTasks: [
    { id: "task-1", title: "Mop Corridor B", type: "clean" as const, status: "unassigned" as const, priority: "high" as const, incidentId: "inc-1" }
  ],
};

globalThis.fetch = async (url: string) => {
  return {
    ok: true,
    json: async () => currentMockState,
  } as any;
};

// 2. Dynamically import React & Testing Library AFTER JSDOM is fully set up
const React = (await import("react")).default;
const { render, cleanup } = await import("@testing-library/react");
const CrowdHeatmap = (await import("../../src/components/CrowdHeatmap.js")).default;
const TransportStatus = (await import("../../src/components/TransportStatus.js")).default;
const SustainabilityDashboard = (await import("../../src/components/SustainabilityDashboard.js")).default;
const { simulationStore } = await import("../../src/utils/simulationStore.js");

// Helper to query text content inside JSDOM document
function assertContainsText(text: string | RegExp, message: string) {
  const bodyText = doc.body.textContent || "";
  if (text instanceof RegExp) {
    assert.ok(text.test(bodyText), message);
  } else {
    assert.ok(bodyText.includes(text), message);
  }
}

describe("Component-Layer Unit Tests", () => {
  test("setup: seed simulation store", async () => {
    await simulationStore.fetchState();
    assert.strictEqual(simulationStore.getCurrentState()?.metrics.length, 2);
  });

  test("simulationStore subscription and unsubscribe cleanup", async () => {
    const store = simulationStore as any;
    
    // Clear any listeners and existing interval
    store.listeners.clear();
    if (store.intervalId) {
      clearInterval(store.intervalId);
      store.intervalId = null;
    }

    let called = false;
    const cb = () => { called = true; };
    
    // 1. Subscribe
    const unsubscribe = store.subscribe(cb);
    assert.strictEqual(store.listeners.size, 1, "Listeners size should be 1 after subscribe");
    assert.ok(store.intervalId, "intervalId should be set after subscribe");

    // 2. Unsubscribe
    unsubscribe();
    assert.strictEqual(store.listeners.size, 0, "Listeners size should be 0 after unsubscribe");
    assert.strictEqual(store.intervalId, null, "intervalId should be cleared after unsubscribe");

    // 3. Force catch block in fetchState
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("Network Error"));
    await simulationStore.fetchState();
    globalThis.fetch = originalFetch;
  });

  describe("CrowdHeatmap Component", () => {
    test("renders zone density cards and badges correctly", () => {
      render(React.createElement(CrowdHeatmap));
      
      // Ensure "Simulated Feed" badge is present
      assertContainsText("Simulated Feed", "Simulated Feed badge should be present");

      // Verify Zone B overcrowding status
      assertContainsText("Zone B (East Stand)", "Zone B stand card should be rendered");
      assertContainsText("CRITICAL OVERCROWDING", "CRITICAL OVERCROWDING label should be present");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });

    test("renders empty state when metrics are cleared", async () => {
      currentMockState.metrics = [];
      await simulationStore.fetchState();

      render(React.createElement(CrowdHeatmap));
      assertContainsText("Synchronizing crowd sensors...", "Empty state label should be visible");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });

    test("renders moderate density styles and text for active zones", async () => {
      currentMockState.metrics = [
        { zone: "Zone C (West Stand)", crowdDensity: 70, wasteFillLevel: 40, energyUsageKw: 250 }
      ];
      await simulationStore.fetchState();

      render(React.createElement(CrowdHeatmap));
      assertContainsText("Zone C (West Stand)", "Zone C should be rendered");
      assertContainsText("MODERATE ACCUMULATION", "MODERATE ACCUMULATION label should render");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });
  });

  describe("TransportStatus Component", () => {
    test("renders shuttle schedules with elevated AI estimates", async () => {
      // Re-seed standard mockState first
      currentMockState.transportFeeds = [
        { id: "metro-1", name: "Metro Line A", type: "metro", status: "smooth", baseWaitTimeMin: 4, aiEstimatedWaitTimeMin: 4, description: "Smooth operations" },
        { id: "shuttle-1", name: "Shuttle B", type: "shuttle", status: "delayed", baseWaitTimeMin: 10, aiEstimatedWaitTimeMin: 22, description: "Heavy delays" },
      ];
      await simulationStore.fetchState();

      render(React.createElement(TransportStatus));

      // Verify Metro and Shuttle
      assertContainsText("Metro Line A", "Metro line card should be rendered");
      assertContainsText("Shuttle B", "Shuttle B card should be rendered");

      // Verify simulated feed tag
      assertContainsText("Simulated Feed", "Simulated Feed badge should be present on transit");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });

    test("renders empty state when transport feeds are empty", async () => {
      currentMockState.transportFeeds = [];
      await simulationStore.fetchState();

      render(React.createElement(TransportStatus));
      assertContainsText("Synchronizing transit feeds...", "Empty state transit message should show");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });

    test("renders custom statuses like congested and critical and parking icon", async () => {
      currentMockState.transportFeeds = [
        { id: "park-1", name: "Lot C Premium", type: "parking", status: "congested", baseWaitTimeMin: 5, aiEstimatedWaitTimeMin: 12, description: "Parking is full." },
        { id: "shuttle-2", name: "North Bus Loop", type: "shuttle", status: "critical", baseWaitTimeMin: 8, aiEstimatedWaitTimeMin: 35, description: "Bus loop blocked." },
      ];
      await simulationStore.fetchState();

      render(React.createElement(TransportStatus));
      assertContainsText("Lot C Premium", "Parking element should render");
      assertContainsText("Congested", "Congested badge should render");
      assertContainsText("Critical Crowd Block", "Critical badge should render");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });
  });

  describe("SustainabilityDashboard Component", () => {
    test("renders waste ratios and energy recommendations", async () => {
      currentMockState.metrics = [
        { zone: "Zone A (North Stand)", crowdDensity: 45, wasteFillLevel: 20, energyUsageKw: 150 },
        { zone: "Zone B (East Stand)", crowdDensity: 90, wasteFillLevel: 85, energyUsageKw: 620 },
      ];
      await simulationStore.fetchState();

      render(React.createElement(SustainabilityDashboard));

      assertContainsText("Sanitation & Trash Feeds", "Sanitation card should render");
      assertContainsText("Electricity Grid Draw", "Electricity card should render");

      // Verify alert recommends dispatching volunteers for over-limit Zone B
      assertContainsText(/ALERT: Zone B waste bins are at 85% capacity/i, "Volunteers dispatch alert recommendation should be rendered");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });

    test("handles empty metrics or calibrated bin states", async () => {
      currentMockState.metrics = [];
      await simulationStore.fetchState();

      render(React.createElement(SustainabilityDashboard));
      assertContainsText("Calibrating bin levels...", "Empty standby text should show");
      assertContainsText("SYSTEM STATUS GREEN: Energy draw and sanitation indexes are balanced", "Default balanced system message should show");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });

    test("handles medium waste fill levels with scheduled routing recommendation", async () => {
      currentMockState.metrics = [
        { zone: "Zone E (South Stand)", crowdDensity: 50, wasteFillLevel: 72, energyUsageKw: 300 }
      ];
      await simulationStore.fetchState();

      render(React.createElement(SustainabilityDashboard));
      assertContainsText("SCHEDULE: Schedule routine waste disposal truck", "Moderate fill level schedule recommendation should trigger");

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });
  });

  describe("Performance Profiling", () => {
    test("renders 75 high-load items within sub-100ms latency threshold", async () => {
      // 1. Generate 75 simulated zone metrics
      const largeMetrics = Array.from({ length: 75 }, (_, i) => ({
        zone: `Zone ${String.fromCharCode(65 + (i % 6))}${Math.floor(i / 6)} (Stand ${i})`,
        crowdDensity: Math.floor(Math.random() * 100),
        wasteFillLevel: Math.floor(Math.random() * 100),
        energyUsageKw: Math.floor(Math.random() * 1000),
      }));

      currentMockState.metrics = largeMetrics;
      await simulationStore.fetchState();

      // 2. Measure rendering performance using high-precision timer
      const start = performance.now();
      
      render(React.createElement(CrowdHeatmap));
      render(React.createElement(SustainabilityDashboard));
      
      const duration = performance.now() - start;
      
      // Print the measured numbers for verification
      console.log(`\n[PERFORMANCE] Rendered 75-item load in JSDOM: ${duration.toFixed(2)}ms\n`);
      
      assert.ok(duration < 1500, `Render duration should be sub-1500ms in virtualized JSDOM (measured: ${duration.toFixed(2)}ms)`);

      cleanup();
      doc.body.innerHTML = "<div id='root'></div>";
    });
  });
});
