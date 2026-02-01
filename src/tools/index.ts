/**
 * Tools Index - Exports all tool definitions and handlers
 */

import { z } from 'zod';

// Import tool definitions and handlers from each module
import {
  marketToolDefinitions,
  handleGetServerTime,
  handleGetKlines,
  handleGetTickers,
  handleGetOrderbook,
  handleGetInstrumentsInfo,
  handleGetFundingRateHistory,
  handleGetOpenInterest,
  handleGetRecentTrades,
  handleGetHistoricalVolatility,
  handleGetRiskLimit,
  handleGetInsurance,
  handleGetLongShortRatio,
  GetServerTimeSchema,
  GetKlinesSchema,
  GetTickersSchema,
  GetOrderbookSchema,
  GetInstrumentsInfoSchema,
  GetFundingRateHistorySchema,
  GetOpenInterestSchema,
  GetRecentTradesSchema,
  GetHistoricalVolatilitySchema,
  GetRiskLimitSchema,
  GetInsuranceSchema,
  GetLongShortRatioSchema,
} from './market.js';

import {
  accountToolDefinitions,
  handleGetWalletBalance,
  handleGetAccountInfo,
  handleGetFeeRate,
  handleGetTransactionLog,
  handleGetBorrowHistory,
  handleGetCollateralInfo,
  handleGetCoinGreeks,
  GetWalletBalanceSchema,
  GetAccountInfoSchema,
  GetFeeRateSchema,
  GetTransactionLogSchema,
  GetBorrowHistorySchema,
  GetCollateralInfoSchema,
  GetCoinGreeksSchema,
} from './account.js';

import {
  positionToolDefinitions,
  handleGetPositions,
  handleGetClosedPnl,
  handleGetExecutionList,
  GetPositionsSchema,
  GetClosedPnlSchema,
  GetExecutionListSchema,
} from './position.js';

import {
  ordersToolDefinitions,
  handleGetOpenOrders,
  handleGetOrderHistory,
  handleGetTradeHistory,
  handleGetBorrowQuota,
  GetOpenOrdersSchema,
  GetOrderHistorySchema,
  GetTradeHistorySchema,
  GetBorrowQuotaSchema,
} from './orders.js';

// ============ Combined Tool Definitions ============

export const ALL_TOOL_DEFINITIONS = [
  ...marketToolDefinitions,
  ...accountToolDefinitions,
  ...positionToolDefinitions,
  ...ordersToolDefinitions,
];

// ============ Tool Handler Map ============

type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

export const TOOL_HANDLERS: Record<string, { schema: z.ZodType; handler: ToolHandler }> = {
  // Market tools
  get_server_time: { schema: GetServerTimeSchema, handler: handleGetServerTime as ToolHandler },
  get_klines: { schema: GetKlinesSchema, handler: handleGetKlines as ToolHandler },
  get_tickers: { schema: GetTickersSchema, handler: handleGetTickers as ToolHandler },
  get_orderbook: { schema: GetOrderbookSchema, handler: handleGetOrderbook as ToolHandler },
  get_instruments_info: { schema: GetInstrumentsInfoSchema, handler: handleGetInstrumentsInfo as ToolHandler },
  get_funding_rate_history: { schema: GetFundingRateHistorySchema, handler: handleGetFundingRateHistory as ToolHandler },
  get_open_interest: { schema: GetOpenInterestSchema, handler: handleGetOpenInterest as ToolHandler },
  get_recent_trades: { schema: GetRecentTradesSchema, handler: handleGetRecentTrades as ToolHandler },
  get_historical_volatility: { schema: GetHistoricalVolatilitySchema, handler: handleGetHistoricalVolatility as ToolHandler },
  get_risk_limit: { schema: GetRiskLimitSchema, handler: handleGetRiskLimit as ToolHandler },
  get_insurance: { schema: GetInsuranceSchema, handler: handleGetInsurance as ToolHandler },
  get_long_short_ratio: { schema: GetLongShortRatioSchema, handler: handleGetLongShortRatio as ToolHandler },
  
  // Account tools
  get_wallet_balance: { schema: GetWalletBalanceSchema, handler: handleGetWalletBalance as ToolHandler },
  get_account_info: { schema: GetAccountInfoSchema, handler: handleGetAccountInfo as ToolHandler },
  get_fee_rate: { schema: GetFeeRateSchema, handler: handleGetFeeRate as ToolHandler },
  get_transaction_log: { schema: GetTransactionLogSchema, handler: handleGetTransactionLog as ToolHandler },
  get_borrow_history: { schema: GetBorrowHistorySchema, handler: handleGetBorrowHistory as ToolHandler },
  get_collateral_info: { schema: GetCollateralInfoSchema, handler: handleGetCollateralInfo as ToolHandler },
  get_coin_greeks: { schema: GetCoinGreeksSchema, handler: handleGetCoinGreeks as ToolHandler },
  
  // Position tools
  get_positions: { schema: GetPositionsSchema, handler: handleGetPositions as ToolHandler },
  get_closed_pnl: { schema: GetClosedPnlSchema, handler: handleGetClosedPnl as ToolHandler },
  get_execution_list: { schema: GetExecutionListSchema, handler: handleGetExecutionList as ToolHandler },
  
  // Order tools
  get_open_orders: { schema: GetOpenOrdersSchema, handler: handleGetOpenOrders as ToolHandler },
  get_order_history: { schema: GetOrderHistorySchema, handler: handleGetOrderHistory as ToolHandler },
  get_trade_history: { schema: GetTradeHistorySchema, handler: handleGetTradeHistory as ToolHandler },
  get_borrow_quota: { schema: GetBorrowQuotaSchema, handler: handleGetBorrowQuota as ToolHandler },
};

// Re-export everything
export * from './market.js';
export * from './account.js';
export * from './position.js';
export * from './orders.js';
