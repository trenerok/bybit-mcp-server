/**
 * Position Tools - Authenticated read endpoints for positions
 * All handlers use rate limiting for graceful API usage
 */

import { z } from 'zod';
import { getClient, sanitizeError, isConfigured, executeWithRateLimit } from '../client.js';

// ============ Auth Check ============

function checkAuth() {
  if (!isConfigured()) {
    throw new Error('API credentials not configured. Set BYBIT_API_KEY and BYBIT_API_SECRET environment variables.');
  }
}

// ============ Schemas ============

export const GetPositionsSchema = z.object({
  category: z.enum(['linear', 'inverse', 'option']).default('linear').describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol (e.g., BTCUSDT)'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  settleCoin: z.string().optional().describe('Settlement coin filter'),
  limit: z.number().optional().describe('Number of results (default: 20, max: 200)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetClosedPnlSchema = z.object({
  category: z.enum(['linear', 'inverse']).default('linear').describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  limit: z.number().optional().describe('Number of results (default: 50, max: 100)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetExecutionListSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).default('linear').describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  orderId: z.string().optional().describe('Order ID filter'),
  orderLinkId: z.string().optional().describe('User custom order ID filter'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  execType: z.enum(['Trade', 'AdlTrade', 'Funding', 'BustTrade', 'Delivery', 'BlockTrade']).optional()
    .describe('Execution type filter'),
  limit: z.number().optional().describe('Number of results (default: 50, max: 100)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

// ============ Tool Definitions ============

export const positionToolDefinitions = [
  {
    name: 'get_positions',
    description: 'Get current open positions for futures/options. Shows size, entry price, unrealized PnL, leverage, and liquidation price. Auth required.',
    inputSchema: GetPositionsSchema,
  },
  {
    name: 'get_closed_pnl',
    description: 'Get realized profit and loss history from closed positions. Shows entry/exit prices and actual PnL. Auth required.',
    inputSchema: GetClosedPnlSchema,
  },
  {
    name: 'get_execution_list',
    description: 'Get trade/execution history. Auth required.',
    inputSchema: GetExecutionListSchema,
  },
];

// ============ Handlers ============
// All handlers use executeWithRateLimit for graceful rate limiting

export async function handleGetPositions(params: z.infer<typeof GetPositionsSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_positions', () =>
      client.getPositionInfo({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
        settleCoin: params.settleCoin,
        limit: params.limit,
        cursor: params.cursor,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetClosedPnl(params: z.infer<typeof GetClosedPnlSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_closed_pnl', () =>
      client.getClosedPnL({
        category: params.category,
        symbol: params.symbol,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
        cursor: params.cursor,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetExecutionList(params: z.infer<typeof GetExecutionListSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_execution_list', () =>
      client.getExecutionList({
        category: params.category,
        symbol: params.symbol,
        orderId: params.orderId,
        orderLinkId: params.orderLinkId,
        baseCoin: params.baseCoin,
        startTime: params.startTime,
        endTime: params.endTime,
        execType: params.execType as Parameters<typeof client.getExecutionList>[0]['execType'],
        limit: params.limit,
        cursor: params.cursor,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}
