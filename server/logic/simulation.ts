import { SimulationState, StadiumZone, Incident, TransportFeed, ZoneMetrics, IncidentType, PriorityLevel, IncidentStatus } from "../../src/types.js";
import { sanitizeStr, sanitizeVal } from "../../src/utils/sanitize.js";
import { processEventThroughDecisionEngine } from "./decisionEngine.js";

// In-memory simulation state
let state: SimulationState = {
  metrics: [
    { zone: StadiumZone.ZONE_A, crowdDensity: 45, wasteFillLevel: 20, energyUsageKw: 350 },
    { zone: StadiumZone.ZONE_B, crowdDensity: 60, wasteFillLevel: 45, energyUsageKw: 420 },
    { zone: StadiumZone.ZONE_C, crowdDensity: 75, wasteFillLevel: 80, energyUsageKw: 510 }, // High trash, close to alerting
    { zone: StadiumZone.ZONE_D, crowdDensity: 30, wasteFillLevel: 15, energyUsageKw: 280 },
    { zone: StadiumZone.ZONE_E, crowdDensity: 55, wasteFillLevel: 30, energyUsageKw: 480 },
    { zone: StadiumZone.ZONE_F, crowdDensity: 82, wasteFillLevel: 65, energyUsageKw: 620 }, // High crowd density
  ],
  incidents: [
    {
      id: "inc-1",
      zone: StadiumZone.ZONE_C,
      description: "High crowd congestion reported near southern entrance gate 4.",
      type: "crowd",
      severity: "high",
      status: "dispatching",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      recommendedAction: "Dispatching flow coordinators to Gate 4. Restricting inbound fan lanes.",
      assignedVolunteer: "Alex",
      reportedBy: "sensor",
    },
    {
      id: "inc-2",
      zone: StadiumZone.ZONE_F,
      description: "Fan reported lost backpack near the merchandise kiosk.",
      type: "other",
      severity: "low",
      status: "triaged",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      recommendedAction: "Instruct volunteer to check the local lost and found chest at Kiosk 3.",
      assignedVolunteer: null,
      reportedBy: "fan",
    },
    {
      id: "inc-3",
      zone: StadiumZone.ZONE_E,
      description: "Liquid spill detected near the main concession block, causing slipping hazard.",
      type: "sustainability",
      severity: "medium",
      status: "resolved",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      recommendedAction: "Deploy cleanup volunteers and place hazard sign.",
      assignedVolunteer: "Diana",
      reportedBy: "staff",
    },
  ],
  transportFeeds: [
    {
      id: "feed-metro",
      name: "Stadium Metro Express (Line 1)",
      type: "metro",
      status: "smooth",
      baseWaitTimeMin: 4,
      aiEstimatedWaitTimeMin: 4,
      description: "High-speed rail operating on standard schedules.",
    },
    {
      id: "feed-shuttle-a",
      name: "North Parking Shuttle A",
      type: "shuttle",
      status: "delayed",
      baseWaitTimeMin: 8,
      aiEstimatedWaitTimeMin: 14,
      description: "Congestion on local stadium ring-road is causing delay.",
    },
    {
      id: "feed-shuttle-b",
      name: "East Transit Hub Shuttle B",
      type: "shuttle",
      status: "smooth",
      baseWaitTimeMin: 6,
      aiEstimatedWaitTimeMin: 6,
      description: "Continuous operations, regular boarding.",
    },
    {
      id: "feed-parking-west",
      name: "West Parking Lot Access",
      type: "parking",
      status: "congested",
      baseWaitTimeMin: 15,
      aiEstimatedWaitTimeMin: 28,
      description: "Heavy match-day occupancy, delays at terminal tollbooths.",
    },
  ],
  lastUpdated: new Date().toISOString(),
};

/**
 * Retrieves the current simulation state.
 */
export function getSimulationState(): SimulationState {
  return state;
}

/**
 * Modifies simulation metrics incrementally over time (simulated interval updates).
 * Runs background ticks, auto-generating incidents for threshold breaches.
 */
export async function runSimulationTick(): Promise<void> {
  // 1. Update zone metrics naturally
  state.metrics = state.metrics.map((metric) => {
    // Fluctuating density: -3% to +4%
    const dDelta = Math.floor(Math.random() * 8) - 3;
    const newDensity = Math.max(5, Math.min(100, metric.crowdDensity + dDelta));

    // Trash fill levels grow over time (+1% to +3% per tick)
    const tDelta = Math.floor(Math.random() * 3) + 1;
    let newTrash = Math.max(0, Math.min(100, metric.wasteFillLevel + tDelta));

    // Reset if an active/resolved cleanup happened recently (this is hand-waved by ticket resolution, below)
    
    // Fluctuating energy: -20kW to +30kW
    const eDelta = Math.floor(Math.random() * 51) - 20;
    const newEnergy = Math.max(100, Math.min(1200, metric.energyUsageKw + eDelta));

    return {
      zone: metric.zone,
      crowdDensity: newDensity,
      wasteFillLevel: newTrash,
      energyUsageKw: newEnergy,
    };
  });

  // 2. Adjust transit wait times based on crowd density of Zone F (Fan festival) and Zone E (Concourse)
  const fDensity = state.metrics.find(m => m.zone === StadiumZone.ZONE_F)?.crowdDensity || 50;
  const eDensity = state.metrics.find(m => m.zone === StadiumZone.ZONE_E)?.crowdDensity || 50;

  state.transportFeeds = state.transportFeeds.map((feed) => {
    let multiplier = 1.0;
    if (fDensity > 80 || eDensity > 80) {
      multiplier = 2.2;
      feed.status = "critical";
    } else if (fDensity > 60 || eDensity > 60) {
      multiplier = 1.5;
      feed.status = "congested";
    } else {
      feed.status = "smooth";
    }
    const aiEst = Math.round(feed.baseWaitTimeMin * multiplier);
    return {
      ...feed,
      aiEstimatedWaitTimeMin: aiEst,
    };
  });

  // 3. Auto-trigger alerts/incidents if thresholds are breached
  for (const metric of state.metrics) {
    if (metric.wasteFillLevel >= 90) {
      // Check if an unresolved waste incident already exists for this zone
      const existing = state.incidents.find(
        (inc) => inc.zone === metric.zone && inc.type === "sustainability" && inc.status !== "resolved"
      );
      if (!existing) {
        await createNewIncident(
          `Waste container in ${metric.zone} has exceeded 90% threshold capacity. Immediate clearing required.`,
          metric.zone,
          "sustainability",
          "sensor"
        );
      }
    }

    if (metric.crowdDensity >= 92) {
      // Check if an unresolved crowd density incident already exists
      const existing = state.incidents.find(
        (inc) => inc.zone === metric.zone && inc.type === "crowd" && inc.status !== "resolved"
      );
      if (!existing) {
        await createNewIncident(
          `Sensor reports critical crowd density of ${metric.crowdDensity}% in ${metric.zone}. Route bypass protocols recommended.`,
          metric.zone,
          "crowd",
          "sensor"
        );
      }
    }
  }

  state.lastUpdated = new Date().toISOString();
}

/**
 * Creates and registers a new incident report, routing it through the AI Decision Engine.
 */
export async function createNewIncident(
  description: string,
  zone: StadiumZone,
  type: IncidentType,
  reportedBy: "sensor" | "fan" | "staff"
): Promise<Incident> {
  const cleanDesc = sanitizeStr(description);
  const zoneMetrics = state.metrics.find((m) => m.zone === zone);
  const currentDensity = zoneMetrics ? zoneMetrics.crowdDensity : 50;

  // Run through our AI Decision Engine logic
  const decision = await processEventThroughDecisionEngine(cleanDesc, zone, type, currentDensity);

  const newInc: Incident = {
    id: `inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    zone,
    description: cleanDesc,
    type: decision.type,
    severity: decision.severity,
    status: "reported",
    timestamp: new Date().toISOString(),
    recommendedAction: decision.recommendedAction,
    assignedVolunteer: null,
    reportedBy,
  };

  state.incidents.unshift(newInc); // Prepend to the incident list
  state.lastUpdated = new Date().toISOString();
  return newInc;
}

/**
 * Assigns a volunteer to an incident, or clears the assignment.
 */
export function assignVolunteerToIncident(incidentId: string, volunteerName: string | null): Incident | null {
  const inc = state.incidents.find((i) => i.id === incidentId);
  if (!inc) return null;

  inc.assignedVolunteer = volunteerName ? sanitizeStr(volunteerName) : null;
  if (inc.status === "reported") {
    inc.status = "triaged"; // auto-advance status
  }
  state.lastUpdated = new Date().toISOString();
  return inc;
}

/**
 * Updates the resolution/progress status of an incident.
 */
export function updateIncidentStatus(incidentId: string, status: IncidentStatus): Incident | null {
  const inc = state.incidents.find((i) => i.id === incidentId);
  if (!inc) return null;

  inc.status = status;

  // If incident is resolved and it's a sustainability task, decrement waste level in that zone as a fun feedback loop!
  if (status === "resolved") {
    if (inc.type === "sustainability") {
      const zoneMetric = state.metrics.find((m) => m.zone === inc.zone);
      if (zoneMetric) {
        zoneMetric.wasteFillLevel = Math.max(10, zoneMetric.wasteFillLevel - 50); // emptied!
      }
    } else if (inc.type === "crowd") {
      const zoneMetric = state.metrics.find((m) => m.zone === inc.zone);
      if (zoneMetric) {
        zoneMetric.crowdDensity = Math.max(15, zoneMetric.crowdDensity - 20); // crowd dissipated!
      }
    }
  }

  state.lastUpdated = new Date().toISOString();
  return inc;
}
