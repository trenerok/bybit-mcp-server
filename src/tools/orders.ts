/**
 * Orders Tools - Authenticated read endpoints for orders
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

// Helper to accept string or number and convert to string
const stringOrNumber = z.union([z.string(), z.number()]).transform(val => String(val)).optional();

export const GetOpenOrdersSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).default('linear').describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  settleCoin: z.string().optional().describe('Settlement coin filter'),
  orderId: stringOrNumber.describe('Order ID filter'),
  orderLinkId: stringOrNumber.describe('User custom order ID filter'),
  openOnly: z.number().optional().describe('0: all statuses, 1: open/partial only, 2: conditional triggered'),
  orderFilter: z.enum(['Order', 'tpslOrder', 'StopOrder']).optional().describe('Order filter'),
  limit: z.number().optional().describe('Number of results (default: 20, max: 50)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetOrderHistorySchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).default('linear').describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  orderId: stringOrNumber.describe('Order ID filter'),
  orderLinkId: stringOrNumber.describe('User custom order ID filter'),
  orderFilter: z.enum(['Order', 'tpslOrder', 'StopOrder']).optional().describe('Order filter'),
  orderStatus: z.string().optional().describe('Order status filter'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  limit: z.number().optional().describe('Number of results (default: 20, max: 50)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetTradeHistorySchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).default('linear').describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  orderId: stringOrNumber.describe('Order ID filter'),
  orderLinkId: stringOrNumber.describe('User custom order ID filter'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  execType: z.enum(['Trade', 'AdlTrade', 'Funding', 'BustTrade', 'Delivery', 'BlockTrade']).optional()
    .describe('Execution type filter'),
  limit: z.number().optional().describe('Number of results (default: 50, max: 100)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetBorrowQuotaSchema = z.object({
  category: z.literal('spot').describe('Must be "spot"'),
  symbol: z.string().describe('Trading pair symbol'),
  side: z.enum(['Buy', 'Sell']).describe('Order side'),
});

// ============ Tool Definitions ============

export const ordersToolDefinitions = [
  {
    name: 'get_open_orders',
    description: 'Get active/open orders. Auth required.',
    inputSchema: GetOpenOrdersSchema,
  },
  {
    name: 'get_order_history',
    description: 'Get historical orders (filled, cancelled, etc.) from the last 30 days. Auth required.',
    inputSchema: GetOrderHistorySchema,
  },
  {
    name: 'get_trade_history',
    description: 'Get filled trades history. Auth required.',
    inputSchema: GetTradeHistorySchema,
  },
  {
    name: 'get_borrow_quota',
    description: 'Get spot margin borrow quota. Auth required.',
    inputSchema: GetBorrowQuotaSchema,
  },
];

// ============ Handlers ============
// All handlers use executeWithRateLimit for graceful rate limiting

export async function handleGetOpenOrders(params: z.infer<typeof GetOpenOrdersSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_open_orders', () =>
      client.getActiveOrders({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
        settleCoin: params.settleCoin,
        orderId: params.orderId,
        orderLinkId: params.orderLinkId,
        openOnly: params.openOnly as 0 | 1 | 2 | undefined,
        orderFilter: params.orderFilter,
        limit: params.limit,
        cursor: params.cursor,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetOrderHistory(params: z.infer<typeof GetOrderHistorySchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_order_history', () =>
      client.getHistoricOrders({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
        orderId: params.orderId,
        orderLinkId: params.orderLinkId,
        orderFilter: params.orderFilter,
        orderStatus: params.orderStatus as Parameters<typeof client.getHistoricOrders>[0]['orderStatus'],
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

export async function handleGetTradeHistory(params: z.infer<typeof GetTradeHistorySchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_trade_history', () =>
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

export async function handleGetBorrowQuota(params: z.infer<typeof GetBorrowQuotaSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_borrow_quota', () =>
      client.getSpotBorrowCheck(params.symbol, params.side)
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}
