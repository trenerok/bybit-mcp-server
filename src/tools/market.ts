/**
 * Market Tools - Public endpoints (no auth required)
 * All handlers use rate limiting for graceful API usage
 */

import { z } from 'zod';
import { getClient, sanitizeError, executeWithRateLimit } from '../client.js';

// ============ Schemas ============

export const GetServerTimeSchema = z.object({}).describe('Get Bybit server time');

export const GetKlinesSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse']).describe('Product category'),
  symbol: z.string().describe('Trading pair symbol (e.g., BTCUSDT)'),
  interval: z.enum(['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M'])
    .describe('Kline interval (1=1min, D=1day, etc.)'),
  limit: z.number().optional().describe('Number of candles (default: 200, max: 1000)'),
  start: z.number().optional().describe('Start timestamp in ms'),
  end: z.number().optional().describe('End timestamp in ms'),
});

export const GetTickersSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol (optional, returns all if not specified)'),
  baseCoin: z.string().optional().describe('Base coin filter (for option category)'),
  expDate: z.string().optional().describe('Expiry date filter for options (e.g., 25DEC22)'),
});

export const GetOrderbookSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).describe('Product category'),
  symbol: z.string().describe('Trading pair symbol'),
  limit: z.number().optional().describe('Order book depth (1-500, default: 25)'),
});

export const GetInstrumentsInfoSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol (optional)'),
  baseCoin: z.string().optional().describe('Base coin filter'),
  limit: z.number().optional().describe('Number of results (default: 500)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetFundingRateHistorySchema = z.object({
  category: z.enum(['linear', 'inverse']).describe('Product category (futures only)'),
  symbol: z.string().describe('Trading pair symbol'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  limit: z.number().optional().describe('Number of results (default: 200)'),
});

export const GetOpenInterestSchema = z.object({
  category: z.enum(['linear', 'inverse']).describe('Product category (futures only)'),
  symbol: z.string().describe('Trading pair symbol'),
  intervalTime: z.enum(['5min', '15min', '30min', '1h', '4h', '1d']).describe('Data interval'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
  limit: z.number().optional().describe('Number of results (default: 50)'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export const GetRecentTradesSchema = z.object({
  category: z.enum(['spot', 'linear', 'inverse', 'option']).describe('Product category'),
  symbol: z.string().optional().describe('Trading pair symbol'),
  baseCoin: z.string().optional().describe('Base coin filter (for option)'),
  optionType: z.enum(['Call', 'Put']).optional().describe('Option type filter'),
  limit: z.number().optional().describe('Number of trades (default: 60, max: 1000)'),
});

export const GetHistoricalVolatilitySchema = z.object({
  category: z.literal('option').describe('Must be "option"'),
  baseCoin: z.string().optional().describe('Base coin (e.g., BTC, ETH)'),
  period: z.number().optional().describe('Period in days'),
  startTime: z.number().optional().describe('Start timestamp in ms'),
  endTime: z.number().optional().describe('End timestamp in ms'),
});

export const GetRiskLimitSchema = z.object({
  category: z.enum(['linear', 'inverse']).describe('Product category (futures only)'),
  symbol: z.string().optional().describe('Trading pair symbol'),
});

export const GetInsuranceSchema = z.object({
  coin: z.string().optional().describe('Coin filter (e.g., BTC, USDT)'),
});

export const GetLongShortRatioSchema = z.object({
  category: z.enum(['linear', 'inverse']).describe('Product category'),
  symbol: z.string().describe('Trading pair symbol'),
  period: z.enum(['5min', '15min', '30min', '1h', '4h', '1d']).describe('Data interval'),
  limit: z.number().optional().describe('Number of results (default: 50)'),
});

// ============ Tool Definitions ============

export const marketToolDefinitions = [
  {
    name: 'get_server_time',
    description: 'Get Bybit server time. Public endpoint (no auth required).',
    inputSchema: GetServerTimeSchema,
  },
  {
    name: 'get_klines',
    description: 'Get candlestick/OHLCV data for a trading pair. Public endpoint (no auth required).',
    inputSchema: GetKlinesSchema,
  },
  {
    name: 'get_tickers',
    description: 'Get current ticker prices for one or all trading pairs. Shows last price, 24h change, volume, funding rate, and bid/ask. Public endpoint (no auth required).',
    inputSchema: GetTickersSchema,
  },
  {
    name: 'get_orderbook',
    description: 'Get order book depth for a trading pair. Public endpoint (no auth required).',
    inputSchema: GetOrderbookSchema,
  },
  {
    name: 'get_instruments_info',
    description: 'Get trading pair/instrument specifications. Public endpoint (no auth required).',
    inputSchema: GetInstrumentsInfoSchema,
  },
  {
    name: 'get_funding_rate_history',
    description: 'Get historical funding rates for perpetual contracts. Public endpoint (no auth required).',
    inputSchema: GetFundingRateHistorySchema,
  },
  {
    name: 'get_open_interest',
    description: 'Get open interest data for futures contracts. Public endpoint (no auth required).',
    inputSchema: GetOpenInterestSchema,
  },
  {
    name: 'get_recent_trades',
    description: 'Get recent public trades for a trading pair. Public endpoint (no auth required).',
    inputSchema: GetRecentTradesSchema,
  },
  {
    name: 'get_historical_volatility',
    description: 'Get historical implied volatility for options. Public endpoint (no auth required).',
    inputSchema: GetHistoricalVolatilitySchema,
  },
  {
    name: 'get_risk_limit',
    description: 'Get risk limit tiers for futures trading. Public endpoint (no auth required).',
    inputSchema: GetRiskLimitSchema,
  },
  {
    name: 'get_insurance',
    description: 'Get insurance fund history. Public endpoint (no auth required).',
    inputSchema: GetInsuranceSchema,
  },
  {
    name: 'get_long_short_ratio',
    description: 'Get long/short ratio data for futures. Public endpoint (no auth required).',
    inputSchema: GetLongShortRatioSchema,
  },
];

// ============ Handlers ============
// All handlers use executeWithRateLimit for graceful rate limiting

export async function handleGetServerTime() {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_server_time', () => client.getServerTime());
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetKlines(params: z.infer<typeof GetKlinesSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_klines', () =>
      client.getKline({
        category: params.category,
        symbol: params.symbol,
        interval: params.interval,
        limit: params.limit,
        start: params.start,
        end: params.end,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetTickers(params: z.infer<typeof GetTickersSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_tickers', () =>
      client.getTickers({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
        expDate: params.expDate,
      } as unknown as Parameters<typeof client.getTickers>[0])
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetOrderbook(params: z.infer<typeof GetOrderbookSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_orderbook', () =>
      client.getOrderbook({
        category: params.category,
        symbol: params.symbol,
        limit: params.limit,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetInstrumentsInfo(params: z.infer<typeof GetInstrumentsInfoSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_instruments_info', () =>
      client.getInstrumentsInfo({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
        limit: params.limit,
        cursor: params.cursor,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetFundingRateHistory(params: z.infer<typeof GetFundingRateHistorySchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_funding_rate_history', () =>
      client.getFundingRateHistory({
        category: params.category,
        symbol: params.symbol,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetOpenInterest(params: z.infer<typeof GetOpenInterestSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_open_interest', () =>
      client.getOpenInterest({
        category: params.category,
        symbol: params.symbol,
        intervalTime: params.intervalTime,
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

export async function handleGetRecentTrades(params: z.infer<typeof GetRecentTradesSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_recent_trades', () =>
      client.getPublicTradingHistory({
        category: params.category,
        symbol: params.symbol,
        baseCoin: params.baseCoin,
        optionType: params.optionType,
        limit: params.limit,
      } as Parameters<typeof client.getPublicTradingHistory>[0])
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetHistoricalVolatility(params: z.infer<typeof GetHistoricalVolatilitySchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_historical_volatility', () =>
      client.getHistoricalVolatility({
        category: params.category,
        baseCoin: params.baseCoin || 'BTC',
        period: params.period as 7 | 14 | 21 | 30 | 60 | 90 | 180 | 270 | undefined,
        startTime: params.startTime,
        endTime: params.endTime,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetRiskLimit(params: z.infer<typeof GetRiskLimitSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_risk_limit', () =>
      client.getRiskLimit({
        category: params.category,
        symbol: params.symbol,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetInsurance(params: z.infer<typeof GetInsuranceSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_insurance', () =>
      client.getInsurance({
        coin: params.coin,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function handleGetLongShortRatio(params: z.infer<typeof GetLongShortRatioSchema>) {
  try {
    const client = getClient();
    return await executeWithRateLimit('get_long_short_ratio', () =>
      client.getLongShortRatio({
        category: params.category,
        symbol: params.symbol,
        period: params.period,
        limit: params.limit,
      })
    );
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}
