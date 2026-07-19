/**
 * StadiumIQ Operational Constants & Thresholds
 */

// Crowd density thresholds (%)
export const DENSITY_WARN = 60;
export const DENSITY_MED = 70;
export const DENSITY_REROUTE_THRESHOLD = 75;
export const DENSITY_HIGH = 80;
export const DENSITY_CRITICAL = 85;
export const DENSITY_ALERT_TRIGGER = 92;
export const DENSITY_DEFAULT_FALLBACK = 50;

// Waste fill thresholds (%)
export const WASTE_FILL_CRITICAL = 90;

// Rate limiting configurations
export const RATE_LIMIT_CAPACITY = 15;
export const RATE_LIMIT_REFILL_RATE = 0.5; // tokens/second
