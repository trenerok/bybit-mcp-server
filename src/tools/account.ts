/**
 * Account Tools - Authenticated read endpoints
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

export const GetWalletBalanceSchema = z.object({
  accountType: z.enum(['UNIFIED', 'CONTRACT', 'SPOT', 'FUND']).default('UNIFIED').describe('Account type'),
  coin: z.string().optional().describe('Specific coin to query (e.g., USDT, BTC)'),
});

export const GetAccountInfoSchema = z.object({}).describe('Get account information');

export const GetFeeRateSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  baseCoin: z.string().optional().describe('Base coin filter'),
});

export const GetTransactionLogSchema = z.object({
  accountType: z.enum(['UNIFIED', 'CONTRACT', 'SPOT']).optional().describe('Account type'),
  category: z.enum(['spot', 'linear', 'inverse', 'option']).optional().describe('Product category'),
  currency: z.string().optional().describe('Currency filter (e.g., USDT)'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  type: z.string().optional().describe('Transaction type filter'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  limit: z.number().optional().describe('Number of results (default: 20, max: 50)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetBorrowHistorySchema = z.object({
  currency: z.string().optional().describe('Currency filter'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  limit: z.number().optional().describe('Number of results (default: 20)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetCollateralInfoSchema = z.object({
  currency: z.string().optional().describe('Currency filter (e.g., BTC, ETH)'),
});

export const GetCoinGreeksSchema = z.object({
  baseCoin: z.string().optional().describe('Base coin filter (e.g., BTC, ETH)'),
});

// ============ Tool Definitions ============

export const accountToolDefinitions = [
  {
    name: 'get_wallet_balance',
    description: 'Get wallet balance for all or specific coins. Auth required.',
    inputSchema: GetWalletBalanceSchema,
  },
  {
    name: 'get_account_info',
    description: 'Get account information including margin mode and account type. Auth required.',
    inputSchema: GetAccountInfoSchema,
  },
  {
    name: 'get_fee_rate',
    description: 'Get trading fee rates for your account. Auth required.',
    inputSchema: GetFeeRateSchema,
  },
  {
    name: 'get_transaction_log',
    description: 'Get transaction history (deposits, withdrawals, trades, etc.). Auth required.',
    inputSchema: GetTransactionLogSchema,
  },
  {
    name: 'get_borrow_history',
    description: 'Get borrow records for margin trading. Auth required.',
    inputSchema: GetBorrowHistorySchema,
  },
  {
    name: 'get_collateral_info',
    description: 'Get collateral information and settings. Auth required.',
    inputSchema: GetCollateralInfoSchema,
  },
  {
    name: 'get_coin_greeks',
    description: 'Get greeks for options positions. Auth required.',
    inputSchema: GetCoinGreeksSchema,
  },
];

// ============ Handlers ============
// All handlers use executeWithRateLimit for graceful rate limiting

export async function handleGetWalletBalance(params: z.infer<typeof GetWalletBalanceSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_wallet_balance', () =>
      client.getWalletBalance({
        accountType: params.accountType,
        coin: params.coin,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetAccountInfo() {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_account_info', () => client.getAccountInfo());
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetFeeRate(params: z.infer<typeof GetFeeRateSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_fee_rate', () =>
      client.getFeeRate({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetTransactionLog(params: z.infer<typeof GetTransactionLogSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_transaction_log', () =>
      client.getTransactionLog({
        accountType: params.accountType,
        category: params.category,
        currency: params.currency,
        baseCoin: params.baseCoin,
        type: params.type,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
        cursor: params.cursor,
      } as Parameters<typeof client.getTransactionLog>[0])
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetBorrowHistory(params: z.infer<typeof GetBorrowHistorySchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_borrow_history', () =>
      client.getBorrowHistory({
        currency: params.currency,
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

export async function handleGetCollateralInfo(params: z.infer<typeof GetCollateralInfoSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_collateral_info', () =>
      client.getCollateralInfo(params.currency)
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetCoinGreeks(params: z.infer<typeof GetCoinGreeksSchema>) {
  try {
    checkAuth();
    const client = getClient();
    return await executeWithRateLimit('get_coin_greeks', () =>
      client.getCoinGreeks(params.baseCoin)
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}
