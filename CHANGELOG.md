# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-01

### Added

- Initial release with 26 read-only tools for Bybit V5 API
- **Market Data Tools** (12 tools, no auth required):
  - `get_server_time` - Bybit server time
  - `get_klines` - Candlestick/OHLCV data
  - `get_tickers` - Current prices and 24h stats
  - `get_orderbook` - Order book depth
  - `get_instruments_info` - Trading pair specifications
  - `get_funding_rate_history` - Historical funding rates
  - `get_open_interest` - Open interest data
  - `get_recent_trades` - Recent public trades
  - `get_historical_volatility` - IV history for options
  - `get_risk_limit` - Risk limit tiers
  - `get_insurance` - Insurance fund history
  - `get_long_short_ratio` - Long/short ratio data

- **Account Tools** (7 tools, auth required):
  - `get_wallet_balance` - Wallet balances
  - `get_account_info` - Account type and status
  - `get_fee_rate` - Trading fee rates
  - `get_transaction_log` - Transaction history
  - `get_borrow_history` - Margin borrow records
  - `get_collateral_info` - Collateral settings
  - `get_coin_greeks` - Options greeks

- **Position Tools** (3 tools, auth required):
  - `get_positions` - Current open positions
  - `get_closed_pnl` - Realized P&L history
  - `get_execution_list` - Trade execution history

- **Order Tools** (4 tools, auth required):
  - `get_open_orders` - Active/pending orders
  - `get_order_history` - Historical orders
  - `get_trade_history` - Filled trades
  - `get_borrow_quota` - Spot margin borrow quota

- **Rate Limiting System**:
  - Token bucket algorithm for request tracking
  - Per-endpoint category limits (market, account, position, order)
  - Global IP rate limit (600 req/5sec)
  - Exponential backoff retry on rate limit errors
  - Automatic request throttling

- **Security Features**:
  - Read-only by design (no trading operations)
  - API key sanitization in error messages
  - Testnet support for safe testing

### Security

- No trading, withdrawal, or account modification endpoints
- API keys never exposed in logs or errors
- Uses official bybit-api SDK with HMAC SHA256 signing
