import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleToolCall } from './tools.js';
import { SYSTEM_PROMPT } from './prompt.js';

const server = new McpServer({
  name: 'acme-store',
  version: '0.0.1',
});

// --- Tools ---

server.registerTool(
  'lookup_order',
  {
    description: 'Look up an order by order ID to get order details',
    inputSchema: z.object({
      order_id: z.string().describe('The order ID (e.g., ORD-12345)'),
    }),
  },
  async ({ order_id }) => ({
    content: [{ type: 'text' as const, text: handleToolCall('lookup_order', { order_id }) }],
  }),
);

server.registerTool(
  'get_product_info',
  {
    description: 'Get product information by product name or ID',
    inputSchema: z.object({
      product: z.string().describe('Product name or ID'),
    }),
  },
  async ({ product }) => ({
    content: [{ type: 'text' as const, text: handleToolCall('get_product_info', { product }) }],
  }),
);

server.registerTool(
  'process_refund',
  {
    description: 'Process a refund for an order',
    inputSchema: z.object({
      order_id: z.string().describe('The order ID to refund'),
      reason: z.string().describe('Reason for the refund'),
    }),
  },
  async ({ order_id, reason }) => ({
    content: [{ type: 'text' as const, text: handleToolCall('process_refund', { order_id, reason }) }],
  }),
);

server.registerTool(
  'check_shipping',
  {
    description: 'Check shipping status for an order',
    inputSchema: z.object({
      order_id: z.string().describe('The order ID to check'),
    }),
  },
  async ({ order_id }) => ({
    content: [{ type: 'text' as const, text: handleToolCall('check_shipping', { order_id }) }],
  }),
);

// --- Prompts ---

server.registerPrompt(
  'customer_support',
  {
    description: 'System prompt for the Acme Store customer support agent',
  },
  () => ({
    messages: [
      {
        role: 'assistant' as const,
        content: { type: 'text' as const, text: SYSTEM_PROMPT },
      },
    ],
  }),
);

server.registerPrompt(
  'order_summary',
  {
    description: 'Generate a summary for a specific order',
    argsSchema: {
      order_id: z.string().describe('The order ID to summarize'),
    },
  },
  ({ order_id }) => {
    const orderData = handleToolCall('lookup_order', { order_id });
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Summarize this order in a friendly way for the customer:\n\n${orderData}`,
          },
        },
      ],
    };
  },
);

// --- Resources ---

server.registerResource(
  'store-policies',
  'policy://refund',
  { description: 'Acme Store refund policy', mimeType: 'text/plain' },
  async () => ({
    contents: [
      {
        uri: 'policy://refund',
        text: [
          'Acme Store Refund Policy',
          '- Refunds under $100 are auto-approved.',
          '- Refunds over $100 require manager approval.',
          '- Refund requests must include a reason.',
          '- Refunds are processed within 5-7 business days.',
        ].join('\n'),
      },
    ],
  }),
);

server.registerResource(
  'store-config',
  'config://store',
  { description: 'Store configuration', mimeType: 'application/json' },
  async () => ({
    contents: [
      {
        uri: 'config://store',
        text: JSON.stringify({
          storeName: 'Acme Store',
          currency: 'USD',
          supportEmail: 'support@acme.store',
          maxAutoRefund: 100,
        }),
      },
    ],
  }),
);

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
