/**
 * Sanitizes input strings by trimming, limiting length, and removing control characters.
 */
export function sanitizeStr(val: unknown, maxLen = 500): string {
  return String(val ?? "").trim().slice(0, maxLen).replace(/[\x00-\x1F\x7F]/g, "");
}

/**
 * Sanitizes numerical values, falling back to a default value if not a valid number, and clamping to non-negative.
 */
export function sanitizeVal(val: unknown, fallback = 0): number {
  const num = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isNaN(num) ? fallback : Math.max(0, num);
}
