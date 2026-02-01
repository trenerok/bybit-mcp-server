/**
 * Bybit V5 API TypeScript Types
 * Read-only operations only
 */

// ============ Common Types ============

export type CategoryV5 = 'spot' | 'linear' | 'inverse' | 'option';
export type AccountType = 'UNIFIED' | 'CONTRACT' | 'SPOT' | 'FUND';
export type KlineInterval = '1' | '3' | '5' | '15' | '30' | '60' | '120' | '240' | '360' | '720' | 'D' | 'W' | 'M';
export type OrderSide = 'Buy' | 'Sell';
export type OrderType = 'Market' | 'Limit';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
export type PositionMode = 'MergedSingle' | 'BothSide';
export type MarginMode = 'REGULAR_MARGIN' | 'PORTFOLIO_MARGIN';
export type BybitMode = 'readonly' | 'trading';

// ============ Rate Limit Types ============

/** Error codes that indicate rate limiting */
export type RateLimitErrorCode = 10006 | 10018;

/** Rate limit category for different endpoint types */
export type RateLimitCategory = 'market' | 'account' | 'position' | 'order' | 'default';

// ============ Bybit Error Codes ============

export const BYBIT_ERROR_CODES: Record<number, string> = {
  0: 'Success',
  10001: 'Parameter error',
  10002: 'Invalid request',
  10003: 'Invalid API key',
  10004: 'Invalid sign',
  10005: 'Permission denied',
  10006: 'Too many requests (rate limit)',
  10007: 'Invalid IP address',
  10008: 'Invalid timestamp',
  10009: 'Invalid recv_window',
  10010: 'Invalid API key permissions',
  10016: 'Server error',
  10017: 'Route not found',
  10018: 'Exceeded rate limit',
  10024: 'API key is not unified margin account',
  33004: 'API key has no permission',
  110001: 'Order does not exist',
  110003: 'Price exceeds liquidation price',
  110007: 'Available balance insufficient',
  110012: 'Insufficient account balance',
  110017: 'TP/SL must be set',
  110043: 'Set leverage not modified',
  110044: 'Available margin is insufficient',
  130021: 'Reach daily withdrawal limit',
  131001: 'Missing required parameter',
};

/**
 * Get human-readable error message for Bybit error code
 */
export function getErrorMessage(code: number): string {
  return BYBIT_ERROR_CODES[code] || `Unknown error (code: ${code})`;
}

/**
 * Check if an error code indicates rate limiting
 */
export function isRateLimitErrorCode(code: number): boolean {
  return code === 10006 || code === 10018;
}
