# Bybit MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

A secure, read-only [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for the [Bybit](https://www.bybit.com/) cryptocurrency exchange V5 API.

> **Security First**: This server implements **read-only operations only**. No trading, withdrawals, or account modifications are possible by design.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [MCP Client Setup](#mcp-client-setup)
- [Available Tools](#available-tools)
- [Tool Reference](#tool-reference)
- [Rate Limiting](#rate-limiting)
- [For AI Agents](#for-ai-agents)
- [Project Structure](#project-structure)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| **Read-only by design** | Cannot execute trades or withdrawals |
| **Secure authentication** | Uses official [bybit-api](https://www.npmjs.com/package/bybit-api) SDK with HMAC SHA256 signing |
| **Testnet support** | Safe testing without real funds |
| **Full V5 API coverage** | 26 tools covering market data, account info, positions, and orders |
| **API key sanitization** | Keys are never exposed in error messages or logs |
| **Graceful rate limiting** | Automatic throttling with exponential backoff retry |

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/trenerok/bybit-mcp-server.git
cd bybit-mcp-server
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your Bybit API credentials
```

### 3. Build

```bash
npm run build
```

### 4. Add to Your MCP Client

See [MCP Client Setup](#mcp-client-setup) for configuration examples.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BYBIT_API_KEY` | Yes* | - | Your Bybit API key |
| `BYBIT_API_SECRET` | Yes* | - | Your Bybit API secret |
| `BYBIT_TESTNET` | No | `false` | Set to `true` for testnet |
| `BYBIT_RECV_WINDOW` | No | `5000` | Request timeout in milliseconds |

*Required only for authenticated endpoints (account, positions, orders). Market data tools work without credentials.

### Getting API Keys

#### Testnet (Recommended for Testing)

1. Visit [testnet.bybit.com](https://testnet.bybit.com/)
2. Create an account or login
3. Go to **API Management** → **Create New Key**
4. Enable **Read** permissions only
5. Copy your API Key and Secret

#### Mainnet (Production)

1. Visit [bybit.com](https://www.bybit.com/)
2. Go to **API Management** → **Create New Key**
3. Enable **Read** permissions only
4. **Recommended**: Set IP restrictions for additional security
5. Copy your API Key and Secret

---

## MCP Client Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bybit": {
      "command": "node",
      "args": ["/absolute/path/to/bybit-mcp-server/dist/index.js"],
      "env": {
        "BYBIT_API_KEY": "your_api_key",
        "BYBIT_API_SECRET": "your_api_secret",
        "BYBIT_TESTNET": "false"
      }
    }
  }
}
```

### Cursor IDE

Add to `.cursor/mcp.json` in your project or global config:

```json
{
  "mcpServers": {
    "bybit": {
      "command": "node",
      "args": ["/absolute/path/to/bybit-mcp-server/dist/index.js"],
      "env": {
        "BYBIT_API_KEY": "your_api_key",
        "BYBIT_API_SECRET": "your_api_secret",
        "BYBIT_TESTNET": "false"
      }
    }
  }
}
```

### Other MCP Clients

Use similar configuration with the appropriate config file format for your client.

---

## Available Tools

### Overview

| Category | Tools | Auth Required | Description |
|----------|-------|---------------|-------------|
| **Market** | 12 | No | Public market data |
| **Account** | 7 | Yes | Wallet and account info |
| **Position** | 3 | Yes | Position management |
| **Order** | 4 | Yes | Order queries |
| **Total** | **26** | - | - |

### Market Data Tools (No Auth Required)

| Tool | Description |
|------|-------------|
| `get_server_time` | Get Bybit server time for synchronization |
| `get_klines` | Get candlestick/OHLCV data for charting |
| `get_tickers` | Get current prices, 24h change, volume, funding rate |
| `get_orderbook` | Get order book depth (bids and asks) |
| `get_instruments_info` | Get trading pair specifications and limits |
| `get_funding_rate_history` | Get historical funding rates for perpetuals |
| `get_open_interest` | Get open interest data for futures |
| `get_recent_trades` | Get recent public trades |
| `get_historical_volatility` | Get implied volatility history (options) |
| `get_risk_limit` | Get risk limit tiers for futures |
| `get_insurance` | Get insurance fund history |
| `get_long_short_ratio` | Get long/short ratio data |

### Account Tools (Auth Required)

| Tool | Description |
|------|-------------|
| `get_wallet_balance` | Get wallet balances for all or specific coins |
| `get_account_info` | Get account type, margin mode, status |
| `get_fee_rate` | Get your trading fee rates |
| `get_transaction_log` | Get transaction history |
| `get_borrow_history` | Get margin borrow records |
| `get_collateral_info` | Get collateral settings and ratios |
| `get_coin_greeks` | Get options greeks for positions |

### Position Tools (Auth Required)

| Tool | Description |
|------|-------------|
| `get_positions` | Get current open positions with PnL |
| `get_closed_pnl` | Get realized profit/loss history |
| `get_execution_list` | Get trade execution history |

### Order Tools (Auth Required)

| Tool | Description |
|------|-------------|
| `get_open_orders` | Get active/pending orders |
| `get_order_history` | Get historical orders (30 days) |
| `get_trade_history` | Get filled trades history |
| `get_borrow_quota` | Get spot margin borrow quota |

---

## Tool Reference

### Common Parameters

#### Category Types

| Value | Description |
|-------|-------------|
| `spot` | Spot trading |
| `linear` | USDT perpetual futures |
| `inverse` | Coin-margined futures |
| `option` | Options trading |

#### Kline Intervals

| Value | Description |
|-------|-------------|
| `1`, `3`, `5`, `15`, `30` | Minutes |
| `60`, `120`, `240`, `360`, `720` | Hours (as minutes) |
| `D` | Daily |
| `W` | Weekly |
| `M` | Monthly |

### Example Tool Calls

#### Get BTC/USDT Price

```json
{
  "tool": "get_tickers",
  "arguments": {
    "category": "linear",
    "symbol": "BTCUSDT"
  }
}
```

#### Get 1-Hour Candles

```json
{
  "tool": "get_klines",
  "arguments": {
    "category": "linear",
    "symbol": "BTCUSDT",
    "interval": "60",
    "limit": 100
  }
}
```

#### Get Wallet Balance

```json
{
  "tool": "get_wallet_balance",
  "arguments": {
    "accountType": "UNIFIED"
  }
}
```

#### Get Order Book

```json
{
  "tool": "get_orderbook",
  "arguments": {
    "category": "linear",
    "symbol": "BTCUSDT",
    "limit": 25
  }
}
```

#### Get Open Positions

```json
{
  "tool": "get_positions",
  "arguments": {
    "category": "linear"
  }
}
```

#### Get Funding Rate History

```json
{
  "tool": "get_funding_rate_history",
  "arguments": {
    "category": "linear",
    "symbol": "BTCUSDT",
    "limit": 50
  }
}
```

---

## Rate Limiting

This server implements graceful rate limiting according to [Bybit V5 API documentation](https://bybit-exchange.github.io/docs/v5/rate-limit).

### Applied Limits

| Category | Limit | Window |
|----------|-------|--------|
| **IP (Global)** | 600 requests | 5 seconds |
| **Market Data** | 120 req/sec | Rolling |
| **Account** | 50 req/sec | Rolling |
| **Position** | 50 req/sec | Rolling |
| **Order** | 20 req/sec | Rolling |

### Rate Limit Features

- **Token Bucket Algorithm**: Tracks requests per endpoint category
- **Automatic Throttling**: Delays requests when approaching limits
- **Exponential Backoff**: Retries on rate limit errors (10006, 10018)
- **Graceful Degradation**: Queues requests instead of failing

### Retry Behavior

When a rate limit error occurs:

1. Wait 1 second (initial delay)
2. Retry up to 3 times
3. Each retry doubles the wait time
4. Maximum wait: 30 seconds

---

## For AI Agents

This section provides guidance for AI agents using this MCP server.

### Server Capabilities

- **Read-only**: This server cannot execute trades, place orders, or modify account settings
- **Real-time data**: Market data is fetched live from Bybit
- **Authentication**: Some tools require API credentials (account, positions, orders)

### Best Practices for AI Agents

1. **Start with market data**: Use `get_tickers` or `get_klines` for price information
2. **Check authentication**: If account tools fail, credentials may not be configured
3. **Use appropriate categories**: 
   - `linear` for USDT perpetual futures (most common)
   - `spot` for spot trading
   - `inverse` for coin-margined futures
4. **Handle rate limits gracefully**: The server handles this automatically
5. **Verify data freshness**: Use `get_server_time` to check connectivity

### Common Workflows

#### Get Current Market Overview

```
1. get_tickers(category: "linear") - Get all perpetual prices
2. get_funding_rate_history(symbol: "BTCUSDT") - Check funding rates
3. get_open_interest(symbol: "BTCUSDT") - Check market positioning
```

#### Check Account Status

```
1. get_account_info() - Verify account type and status
2. get_wallet_balance(accountType: "UNIFIED") - Check balances
3. get_positions(category: "linear") - View open positions
```

#### Analyze Trading Pair

```
1. get_instruments_info(category: "linear", symbol: "BTCUSDT") - Get specs
2. get_klines(symbol: "BTCUSDT", interval: "60", limit: 200) - Price history
3. get_orderbook(symbol: "BTCUSDT", limit: 50) - Current depth
4. get_long_short_ratio(symbol: "BTCUSDT", period: "1h") - Sentiment
```

### Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| "API credentials not configured" | Missing API key/secret | Configure environment variables |
| "Too many requests" (10006) | Rate limited | Server will auto-retry |
| "Invalid symbol" | Symbol doesn't exist | Check `get_instruments_info` for valid symbols |
| "Permission denied" | API key lacks permissions | Create new key with read permissions |

### Response Format

All tools return JSON responses from the Bybit API:

```json
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    // Tool-specific data
  },
  "time": 1699999999999
}
```

- `retCode: 0` indicates success
- Check `retMsg` for error details if `retCode != 0`

---

## Project Structure

```
bybit-mcp-server/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── client.ts         # Bybit API client with rate limiting
│   ├── rate-limiter.ts   # Token bucket rate limiter
│   ├── types.ts          # TypeScript type definitions
│   └── tools/
│       ├── index.ts      # Tool aggregator and exports
│       ├── market.ts     # Market data tools (12)
│       ├── account.ts    # Account tools (7)
│       ├── position.ts   # Position tools (3)
│       └── orders.ts     # Order tools (4)
├── dist/                 # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── LICENSE               # MIT License
└── README.md             # This file
```

---

## Security

### Recommendations

1. **Use read-only API keys** — This server only needs read permissions
2. **Enable IP restrictions** — Whitelist specific IPs in Bybit API settings
3. **Use testnet first** — Always test with testnet before mainnet
4. **Never commit keys** — Use environment variables or secret managers
5. **Rotate keys regularly** — Create new keys periodically

### Security Features

- API keys are never logged or exposed in error messages
- Keys are sanitized from all error outputs
- No trading or withdrawal endpoints are implemented
- Read-only by design — cannot modify account state

---

## Troubleshooting

### Common Issues

#### "Cannot find module" Error

```bash
# Ensure you've built the project
npm run build
```

#### "API credentials not configured"

- Verify `.env` file exists with correct values
- Check environment variables are being passed to the MCP server
- Ensure no spaces around `=` in `.env` file

#### Rate Limit Errors

The server handles rate limits automatically. If you see persistent rate limit errors:

- Reduce request frequency
- The server will retry with exponential backoff
- Check if other applications are using the same API key

#### Connection Timeouts

- Increase `BYBIT_RECV_WINDOW` (default: 5000ms)
- Check network connectivity
- Verify Bybit service status

#### Wrong Network (Testnet vs Mainnet)

- Check `BYBIT_TESTNET` environment variable
- Testnet and mainnet require different API keys
- Testnet: `testnet.bybit.com`
- Mainnet: `bybit.com`

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Run directly (after build)
npm start
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to ensure no errors
5. Submit a pull request

---

## API Reference

This server implements the [Bybit V5 API](https://bybit-exchange.github.io/docs/v5/intro). For detailed API documentation, visit:

- [Bybit V5 API Docs](https://bybit-exchange.github.io/docs/v5/intro)
- [Rate Limit Rules](https://bybit-exchange.github.io/docs/v5/rate-limit)
- [Error Codes](https://bybit-exchange.github.io/docs/v5/error)

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk. The authors are not responsible for any financial losses. Always verify data and test thoroughly before making trading decisions.

**This is not financial advice.** Always do your own research.
