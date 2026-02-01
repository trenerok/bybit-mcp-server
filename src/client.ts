/**
 * Bybit V5 API Client
 * Uses official bybit-api SDK for reliable API access
 * Integrated with rate limiting for graceful API usage
 */

import { RestClientV5 } from 'bybit-api';
import type { BybitMode } from './types.js';
import { getRateLimiter, RATE_LIMIT_ERROR_CODES } from './rate-limiter.js';

// Singleton client instance
let clientInstance: RestClientV5 | null = null;

/**
 * Get or create the Bybit REST client
 */
export function getClient(): RestClientV5 {
  if (!clientInstance) {
    clientInstance = new RestClientV5({
      key: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_API_SECRET || '',
      testnet: process.env.BYBIT_TESTNET === 'true',
      recv_window: parseInt(process.env.BYBIT_RECV_WINDOW || '5000', 10),
    });
  }
  return clientInstance;
}

/**
 * Check if API credentials are configured
 */
export function isConfigured(): boolean {
  return !!(process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET);
}

/**
 * Get current mode from environment
 */
export function getMode(): BybitMode {
  const mode = process.env.BYBIT_MODE || 'readonly';
  if (mode === 'trading') return 'trading';
  return 'readonly';
}

/**
 * Check if trading mode is enabled
 */
export function isTradingEnabled(): boolean {
  return getMode() === 'trading';
}

/**
 * Check if testnet is enabled
 */
export function isTestnet(): boolean {
  return process.env.BYBIT_TESTNET === 'true';
}

/**
 * Sanitize error messages to remove API keys
 */
export function sanitizeError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  
  // Remove any API key/secret that might appear in error messages
  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;
  
  if (apiKey) {
    message = message.replace(new RegExp(apiKey, 'g'), '[REDACTED_KEY]');
  }
  if (apiSecret) {
    message = message.replace(new RegExp(apiSecret, 'g'), '[REDACTED_SECRET]');
  }
  
  return message;
}

/**
 * Format result for MCP response
 */
export function formatResult(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Check if an API response indicates a rate limit error
 */
export function isRateLimitResponse(response: unknown): boolean {
  if (typeof response === 'object' && response !== null) {
    const resp = response as Record<string, unknown>;
    if ('retCode' in resp && typeof resp.retCode === 'number') {
      return RATE_LIMIT_ERROR_CODES.includes(resp.retCode as 10006 | 10018);
    }
  }
  return false;
}

/**
 * Execute an API call with rate limiting and automatic retry
 * This is the main wrapper for all Bybit API calls
 * 
 * @param endpoint - The endpoint/tool name for rate limit categorization
 * @param apiCall - The async function that makes the API call
 * @returns The API response
 */
export async function executeWithRateLimit<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const rateLimiter = getRateLimiter();
  
  return rateLimiter.execute(endpoint, async () => {
    const result = await apiCall();
    
    // Check for rate limit in successful response (Bybit returns 200 with error codes)
    if (isRateLimitResponse(result)) {
      const retCode = (result as Record<string, unknown>).retCode as number;
      const retMsg = (result as Record<string, unknown>).retMsg as string || 'Rate limit exceeded';
      throw new Error(`Bybit API rate limit error (${retCode}): ${retMsg}`);
    }
    
    return result;
  });
}

/**
 * Get rate limiter statistics for monitoring
 */
export function getRateLimitStats() {
  return getRateLimiter().getStats();
}
