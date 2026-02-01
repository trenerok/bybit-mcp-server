/**
 * Bybit V5 API Client
 * Uses official bybit-api SDK for reliable API access
 * Integrated with rate limiting for graceful API usage
 */

import { RestClientV5 } from 'bybit-api';
import type { BybitMode } from './types.js';
import { getRateLimiter, RATE_LIMIT_ERROR_CODES } from './rate-limiter.js';

// ============ Response Normalization ============

/**
 * Fields that should always be strings (even if API returns numbers)
 * These are typically ID fields that may be empty or contain numeric values
 */
const STRING_FIELDS = new Set([
  'orderLinkId',
  'orderId',
  'execId',
  'blockTradeId',
  'symbol',
  'side',
  'orderType',
  'stopOrderType',
  'orderStatus',
  'execType',
  'category',
  'positionIdx',
  'tradeId',
  'leavesQty',
  'leavesValue',
]);

/**
 * Fields that should always be numbers (even if API returns strings)
 * These are typically timestamp or numeric ID fields
 */
const NUMBER_FIELDS = new Set([
  'createdTime',
  'updatedTime',
  'createdAt',
  'updatedAt',
  'transactionTime',
  'execTime',
  'fillTime',
]);

/**
 * Normalize a single value based on field name
 */
function normalizeValue(key: string, value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  // Convert to string if field should be string
  if (STRING_FIELDS.has(key) && typeof value === 'number') {
    return String(value);
  }

  // Convert to number if field should be number
  if (NUMBER_FIELDS.has(key) && typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  }

  return value;
}

/**
 * Recursively normalize an object's field types
 */
function normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? normalizeObject(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = normalizeObject(value as Record<string, unknown>);
    } else {
      result[key] = normalizeValue(key, value);
    }
  }
  
  return result;
}

/**
 * Normalize API response to ensure consistent field types
 * Bybit API sometimes returns inconsistent types for certain fields
 */
export function normalizeResponse<T>(response: T): T {
  if (typeof response !== 'object' || response === null) {
    return response;
  }
  
  return normalizeObject(response as Record<string, unknown>) as T;
}

/**
 * Custom JSON parser that normalizes field types during parsing
 * This intercepts the raw JSON response before any library validation
 */
function normalizeJsonParse(text: string): unknown {
  try {
    const parsed = JSON.parse(text);
    return normalizeResponse(parsed);
  } catch {
    return text;
  }
}

/**
 * Create axios transformResponse that normalizes data during parsing
 */
function createTransformResponse() {
  return [
    (data: string) => {
      // Only transform if it's a string (raw response)
      if (typeof data === 'string') {
        return normalizeJsonParse(data);
      }
      return data;
    },
  ];
}

// Singleton client instance
let clientInstance: RestClientV5 | null = null;

/**
 * Get or create the Bybit REST client
 */
export function getClient(): RestClientV5 {
  if (!clientInstance) {
    clientInstance = new RestClientV5(
      {
        key: process.env.BYBIT_API_KEY || '',
        secret: process.env.BYBIT_API_SECRET || '',
        testnet: process.env.BYBIT_TESTNET === 'true',
        recv_window: parseInt(process.env.BYBIT_RECV_WINDOW || '5000', 10),
      },
      {
        // Use custom transformResponse to normalize data types at the axios level
        // This ensures data is normalized before any library-level validation
        transformResponse: createTransformResponse(),
      }
    );
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
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    // Handle error objects from bybit-api library
    const errObj = error as Record<string, unknown>;
    if ('message' in errObj && typeof errObj.message === 'string') {
      message = errObj.message;
    } else if ('retMsg' in errObj && typeof errObj.retMsg === 'string') {
      // Bybit API error format
      message = `Bybit API Error: ${errObj.retMsg}${errObj.retCode ? ` (code: ${errObj.retCode})` : ''}`;
    } else if ('body' in errObj && typeof errObj.body === 'object' && errObj.body !== null) {
      // HTTP error with body
      const body = errObj.body as Record<string, unknown>;
      message = body.retMsg ? String(body.retMsg) : JSON.stringify(errObj.body);
    } else {
      // Fallback: stringify the entire error object
      try {
        message = JSON.stringify(error);
      } catch {
        message = 'Unknown error occurred';
      }
    }
  } else {
    message = String(error);
  }
  
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
 * Execute an API call with rate limiting, automatic retry, and response normalization
 * This is the main wrapper for all Bybit API calls
 * 
 * @param endpoint - The endpoint/tool name for rate limit categorization
 * @param apiCall - The async function that makes the API call
 * @returns The normalized API response
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
    
    // Normalize response to ensure consistent field types
    return normalizeResponse(result);
  });
}

/**
 * Get rate limiter statistics for monitoring
 */
export function getRateLimitStats() {
  return getRateLimiter().getStats();
}
