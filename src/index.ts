#!/usr/bin/env node
/**
 * Bybit MCP Server
 * Read-only access to Bybit V5 API via Model Context Protocol
 * 
 * Security: Only implements read-only endpoints. No trading operations.
 * 
 * Environment variables:
 *   BYBIT_API_KEY     - Your Bybit API key
 *   BYBIT_API_SECRET  - Your Bybit API secret
 *   BYBIT_TESTNET     - Use testnet if "true" (default: false)
 *   BYBIT_RECV_WINDOW - Request timeout in ms (default: 5000)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { isConfigured, isTestnet } from './client.js';
import { ALL_TOOL_DEFINITIONS, TOOL_HANDLERS } from './tools/index.js';

// ============ Server Setup ============

const server = new Server(
  {
    name: 'bybit-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============ List Tools Handler ============

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOL_DEFINITIONS.map(tool => {
      // Convert Zod schema to JSON Schema using zod-to-json-schema
      const jsonSchema = zodToJsonSchema(tool.inputSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      });

      // Remove the outer wrapper if present
      const inputSchema = typeof jsonSchema === 'object' && jsonSchema !== null
        ? jsonSchema
        : { type: 'object', properties: {} };

      return {
        name: tool.name,
        description: tool.description,
        inputSchema,
      };
    }),
  };
});

// ============ Call Tool Handler ============

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const toolConfig = TOOL_HANDLERS[name];
  
  if (!toolConfig) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    // Parse and validate input with Zod schema
    const parsed = toolConfig.schema.parse(args || {});
    
    // Execute the handler
    const result = await toolConfig.handler(parsed);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    // Sanitize error message to remove any API keys
    let message = error instanceof Error ? error.message : String(error);
    const apiKey = process.env.BYBIT_API_KEY;
    const apiSecret = process.env.BYBIT_API_SECRET;
    if (apiKey) message = message.replace(new RegExp(apiKey, 'g'), '[REDACTED]');
    if (apiSecret) message = message.replace(new RegExp(apiSecret, 'g'), '[REDACTED]');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ============ Main ============

async function main() {
  const toolCount = ALL_TOOL_DEFINITIONS.length;
  const network = isTestnet() ? 'TESTNET' : 'MAINNET';
  const authStatus = isConfigured() ? 'configured' : 'NOT CONFIGURED';

  console.error('[Bybit MCP Server] Starting...');
  console.error(`[Bybit MCP Server] Network: ${network}`);
  console.error(`[Bybit MCP Server] API credentials: ${authStatus}`);
  console.error(`[Bybit MCP Server] Tools available: ${toolCount}`);
  
  if (!isConfigured()) {
    console.error('[Bybit MCP Server] WARNING: API credentials not configured!');
    console.error('[Bybit MCP Server] Set BYBIT_API_KEY and BYBIT_API_SECRET environment variables.');
    console.error('[Bybit MCP Server] Public endpoints (market data) will still work.');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[Bybit MCP Server] Connected and ready.');
}

main().catch((error) => {
  console.error('[Bybit MCP Server] Fatal error:', error);
  process.exit(1);
});
