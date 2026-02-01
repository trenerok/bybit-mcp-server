/**
 * Rate Limiter for Bybit V5 API
 * 
 * Implements graceful rate limiting according to official Bybit documentation:
 * - IP Limit: 600 requests per 5 seconds
 * - Per-endpoint limits vary (10-50 requests/second)
 * - Exponential backoff on rate limit errors (10006, 10018)
 * - Response header parsing for proactive rate management
 * 
 * @see https://bybit-exchange.github.io/docs/v5/rate-limit
 */

import type { APIResponseV3WithTime } from 'bybit-api';

// ============ Types ============

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Minimum delay between requests in ms */
  minDelayMs: number;
}

export interface EndpointRateLimits {
  /** Default rate limit for unknown endpoints */
  default: RateLimitConfig;
  /** Market data endpoints (public) */
  market: RateLimitConfig;
  /** Account endpoints */
  account: RateLimitConfig;
  /** Position endpoints */
  position: RateLimitConfig;
  /** Order endpoints */
  order: RateLimitConfig;
}

export interface RateLimitState {
  /** Timestamps of recent requests */
  timestamps: number[];
  /** Remaining requests from last API response header */
  remaining?: number;
  /** Reset timestamp from last API response header */
  resetTimestamp?: number;
}

export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay before first retry in ms */
  initialDelayMs: number;
  /** Maximum delay between retries in ms */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

// ============ Constants ============

/**
 * Bybit V5 API Rate Limits by endpoint category
 * Based on official documentation
 */
export const BYBIT_RATE_LIMITS: EndpointRateLimits = {
  default: {
    maxRequests: 50,
    windowMs: 1000,
    minDelayMs: 20,
  },
  market: {
    // Public endpoints have higher limits
    maxRequests: 120,
    windowMs: 1000,
    minDelayMs: 10,
  },
  account: {
    maxRequests: 50,
    windowMs: 1000,
    minDelayMs: 20,
  },
  position: {
    maxRequests: 50,
    windowMs: 1000,
    minDelayMs: 20,
  },
  order: {
    maxRequests: 20,
    windowMs: 1000,
    minDelayMs: 50,
  },
};

/**
 * IP-level rate limit (global across all endpoints)
 * 600 requests per 5 seconds = 120 requests per second
 */
export const IP_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 600,
  windowMs: 5000,
  minDelayMs: 5,
};

/**
 * Default retry configuration with exponential backoff
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Bybit error codes that indicate rate limiting
 */
export const RATE_LIMIT_ERROR_CODES = [10006, 10018] as const;

/**
 * Endpoint category mapping based on tool name prefixes
 */
const ENDPOINT_CATEGORY_MAP: Record<string, keyof EndpointRateLimits> = {
  get_server_time: 'market',
  get_klines: 'market',
  get_tickers: 'market',
  get_orderbook: 'market',
  get_instruments_info: 'market',
  get_funding_rate_history: 'market',
  get_open_interest: 'market',
  get_recent_trades: 'market',
  get_historical_volatility: 'market',
  get_risk_limit: 'market',
  get_insurance: 'market',
  get_long_short_ratio: 'market',
  get_wallet_balance: 'account',
  get_account_info: 'account',
  get_fee_rate: 'account',
  get_transaction_log: 'account',
  get_borrow_history: 'account',
  get_collateral_info: 'account',
  get_coin_greeks: 'account',
  get_positions: 'position',
  get_closed_pnl: 'position',
  get_execution_list: 'position',
  get_open_orders: 'order',
  get_order_history: 'order',
  get_trade_history: 'order',
  get_borrow_quota: 'order',
};

// ============ Rate Limiter Class ============

/**
 * Rate limiter implementing token bucket algorithm with exponential backoff
 */
export class RateLimiter {
  private state: Map<string, RateLimitState> = new Map();
  private globalState: RateLimitState = { timestamps: [] };
  private retryConfig: RetryConfig;
  private enabled: boolean = true;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
  }

  /**
   * Enable or disable rate limiting (useful for testing)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get the rate limit category for a given endpoint/tool name
   */
  getCategory(endpoint: string): keyof EndpointRateLimits {
    return ENDPOINT_CATEGORY_MAP[endpoint] || 'default';
  }

  /**
   * Get rate limit config for an endpoint
   */
  getConfig(endpoint: string): RateLimitConfig {
    const category = this.getCategory(endpoint);
    return BYBIT_RATE_LIMITS[category];
  }

  /**
   * Get or initialize state for an endpoint
   */
  private getState(endpoint: string): RateLimitState {
    if (!this.state.has(endpoint)) {
      this.state.set(endpoint, { timestamps: [] });
    }
    return this.state.get(endpoint)!;
  }

  /**
   * Clean up old timestamps outside the rate limit window
   */
  private cleanupTimestamps(timestamps: number[], windowMs: number): number[] {
    const cutoff = Date.now() - windowMs;
    return timestamps.filter(ts => ts > cutoff);
  }

  /**
   * Calculate delay needed before next request can be made
   */
  calculateDelay(endpoint: string): number {
    if (!this.enabled) return 0;

    const config = this.getConfig(endpoint);
    const state = this.getState(endpoint);
    const now = Date.now();

    // Clean up old timestamps
    state.timestamps = this.cleanupTimestamps(state.timestamps, config.windowMs);
    this.globalState.timestamps = this.cleanupTimestamps(this.globalState.timestamps, IP_RATE_LIMIT.windowMs);

    // Check if we have rate limit info from API headers
    if (state.remaining !== undefined && state.remaining <= 1 && state.resetTimestamp) {
      const headerDelay = state.resetTimestamp - now;
      if (headerDelay > 0) {
        return headerDelay + 100; // Add 100ms buffer
      }
    }

    // Check endpoint-specific rate limit
    if (state.timestamps.length >= config.maxRequests) {
      const oldestTimestamp = state.timestamps[0];
      const endpointDelay = oldestTimestamp + config.windowMs - now;
      if (endpointDelay > 0) {
        return endpointDelay + config.minDelayMs;
      }
    }

    // Check global IP rate limit
    if (this.globalState.timestamps.length >= IP_RATE_LIMIT.maxRequests) {
      const oldestGlobalTimestamp = this.globalState.timestamps[0];
      const globalDelay = oldestGlobalTimestamp + IP_RATE_LIMIT.windowMs - now;
      if (globalDelay > 0) {
        return globalDelay + IP_RATE_LIMIT.minDelayMs;
      }
    }

    // Apply minimum delay between requests
    const lastRequest = state.timestamps[state.timestamps.length - 1];
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < config.minDelayMs) {
        return config.minDelayMs - timeSinceLastRequest;
      }
    }

    return 0;
  }

  /**
   * Record a request being made
   */
  recordRequest(endpoint: string): void {
    if (!this.enabled) return;

    const state = this.getState(endpoint);
    const now = Date.now();

    state.timestamps.push(now);
    this.globalState.timestamps.push(now);
  }

  /**
   * Update rate limit state from API response headers
   * Call this after each API response
   */
  updateFromHeaders(endpoint: string, headers: {
    'x-bapi-limit-status'?: string;
    'x-bapi-limit'?: string;
    'x-bapi-limit-reset-timestamp'?: string;
  }): void {
    if (!this.enabled) return;

    const state = this.getState(endpoint);

    if (headers['x-bapi-limit-status']) {
      state.remaining = parseInt(headers['x-bapi-limit-status'], 10);
    }
    if (headers['x-bapi-limit-reset-timestamp']) {
      state.resetTimestamp = parseInt(headers['x-bapi-limit-reset-timestamp'], 10);
    }
  }

  /**
   * Check if an error is a rate limit error
   */
  isRateLimitError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      
      // Check retCode in response
      if ('retCode' in errorObj && typeof errorObj.retCode === 'number') {
        return RATE_LIMIT_ERROR_CODES.includes(errorObj.retCode as 10006 | 10018);
      }
      
      // Check for code property
      if ('code' in errorObj && typeof errorObj.code === 'number') {
        return RATE_LIMIT_ERROR_CODES.includes(errorObj.code as 10006 | 10018);
      }

      // Check error message
      if ('message' in errorObj && typeof errorObj.message === 'string') {
        const msg = errorObj.message.toLowerCase();
        return msg.includes('rate limit') || msg.includes('too many') || msg.includes('10006') || msg.includes('10018');
      }
    }
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Wait for the specified delay
   */
  async wait(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async execute<T>(
    endpoint: string,
    fn: () => Promise<T>,
    options?: { skipRetry?: boolean }
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Wait for rate limit if needed
        const delay = this.calculateDelay(endpoint);
        if (delay > 0) {
          await this.wait(delay);
        }

        // Record the request
        this.recordRequest(endpoint);

        // Execute the function
        const result = await fn();

        // Check if the result itself indicates a rate limit error (Bybit returns 200 with error code)
        if (this.isApiRateLimitResponse(result)) {
          throw result;
        }

        return result;
      } catch (error) {
        lastError = error;

        // If it's a rate limit error and we should retry
        if (this.isRateLimitError(error) && !options?.skipRetry && attempt < this.retryConfig.maxRetries) {
          const retryDelay = this.calculateRetryDelay(attempt);
          console.error(`[RateLimiter] Rate limited on ${endpoint}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
          await this.wait(retryDelay);
          continue;
        }

        // Not a rate limit error or max retries exceeded
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Check if an API response indicates rate limiting
   */
  private isApiRateLimitResponse(response: unknown): boolean {
    if (typeof response === 'object' && response !== null) {
      const resp = response as Record<string, unknown>;
      if ('retCode' in resp && typeof resp.retCode === 'number') {
        return RATE_LIMIT_ERROR_CODES.includes(resp.retCode as 10006 | 10018);
      }
    }
    return false;
  }

  /**
   * Get current rate limit statistics
   */
  getStats(): {
    endpoints: Record<string, { requestsInWindow: number; remaining?: number }>;
    global: { requestsInWindow: number };
  } {
    const endpoints: Record<string, { requestsInWindow: number; remaining?: number }> = {};

    for (const [endpoint, state] of this.state.entries()) {
      const config = this.getConfig(endpoint);
      const cleanedTimestamps = this.cleanupTimestamps(state.timestamps, config.windowMs);
      endpoints[endpoint] = {
        requestsInWindow: cleanedTimestamps.length,
        remaining: state.remaining,
      };
    }

    return {
      endpoints,
      global: {
        requestsInWindow: this.cleanupTimestamps(this.globalState.timestamps, IP_RATE_LIMIT.windowMs).length,
      },
    };
  }

  /**
   * Reset all rate limit state (useful for testing)
   */
  reset(): void {
    this.state.clear();
    this.globalState = { timestamps: [] };
  }
}

// ============ Singleton Instance ============

let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get the singleton rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.reset();
  }
  rateLimiterInstance = null;
}
