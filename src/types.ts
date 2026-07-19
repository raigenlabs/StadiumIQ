/**
 * Standard Stadium Zones for FIFA World Cup 2026.
 */
export enum StadiumZone {
  ZONE_A = "Zone A (North Stand)",
  ZONE_B = "Zone B (East Stand)",
  ZONE_C = "Zone C (South Stand)",
  ZONE_D = "Zone D (West Stand)",
  ZONE_E = "Zone E (Concourse)",
  ZONE_F = "Zone F (Fan Festival)",
}

/**
 * Types of stadium incidents.
 */
export type IncidentType = "crowd" | "security" | "medical" | "sustainability" | "other";

/**
 * Priority levels determined by the AI Decision Engine.
 */
export type PriorityLevel = "low" | "medium" | "high" | "critical";

/**
 * Workflow status of a ticket/incident.
 */
export type IncidentStatus = "reported" | "triaged" | "dispatching" | "resolving" | "resolved";

/**
 * Structure of a stadium incident report.
 */
export interface Incident {
  id: string;
  zone: StadiumZone;
  description: string;
  type: IncidentType;
  severity: PriorityLevel;
  status: IncidentStatus;
  timestamp: string;
  recommendedAction: string;
  assignedVolunteer: string | null;
  reportedBy: "sensor" | "fan" | "staff";
}

/**
 * Transit/Transport mode statuses.
 */
export interface TransportFeed {
  id: string;
  name: string; // e.g., "Metro Line 1", "Express Shuttle", "South Parking Area"
  type: "metro" | "shuttle" | "parking";
  status: "smooth" | "congested" | "delayed" | "critical";
  baseWaitTimeMin: number; // base wait time in minutes
  aiEstimatedWaitTimeMin: number; // estimated by AI decision engine based on density
  description: string;
}

/**
 * Zone-specific metrics for sustainability and crowds.
 */
export interface ZoneMetrics {
  zone: StadiumZone;
  crowdDensity: number; // percentage (0-100)
  wasteFillLevel: number; // percentage (0-100)
  energyUsageKw: number; // kW power draw
}

/**
 * Full state structure returned by the simulation.
 */
export interface SimulationState {
  metrics: ZoneMetrics[];
  incidents: Incident[];
  transportFeeds: TransportFeed[];
  lastUpdated: string;
}

/**
 * Output of the AI Decision Engine logic.
 */
export interface DecisionResult {
  severity: PriorityLevel;
  type: IncidentType;
  recommendedAction: string;
  targetAudience: "fan" | "volunteer" | "ops";
  taskTitle?: string;
}

/**
 * End-of-Day Operations Summary (AI Digest).
 */
export interface AIDigestReport {
  timestamp: string;
  executiveSummary: string;
  crowdInsight: string;
  sustainabilityInsight: string;
  incidentSummary: string;
  actionItems: string[];
}

/**
 * Represent a multilingual chat message.
 */
export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  languageDetected?: string;
}
