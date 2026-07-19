/**
 * Simple in-memory Token Bucket rate limiter class.
 */
export class TokenBucket {
  private capacity: number;
  private refillRate: number; // tokens per second
  private tokens: number;
  private lastRefill: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Refills the bucket based on elapsed time and consumes the specified amount of tokens if available.
   * @returns true if tokens were successfully consumed, false otherwise.
   */
  public consume(amount = 1): boolean {
    this.refill();
    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
  }

  /**
   * Retrieves the current count of available tokens.
   */
  public getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

const limiters = new Map<string, TokenBucket>();

/**
 * Checks if a given key is rate limited. Uses an in-memory token bucket registry.
 * Default capacity of 10 requests, refilling at 0.5 tokens per second (1 token every 2 seconds).
 */
export function isRateLimited(key: string, capacity = 10, refillRate = 0.5): boolean {
  let bucket = limiters.get(key);
  if (!bucket) {
    bucket = new TokenBucket(capacity, refillRate);
    limiters.set(key, bucket);
  }
  return !bucket.consume(1);
}
