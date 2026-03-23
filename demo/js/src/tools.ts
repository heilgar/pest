import type { ToolDefinition } from '@heilgar/pest-core';

export const tools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'lookup_order',
      description: 'Look up an order by order ID to get order details',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order ID (e.g., ORD-12345)',
          },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_info',
      description: 'Get product information by product name or ID',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Product name or ID' },
        },
        required: ['product'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'process_refund',
      description: 'Process a refund for an order',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'The order ID to refund' },
          reason: { type: 'string', description: 'Reason for the refund' },
        },
        required: ['order_id', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_shipping',
      description: 'Check shipping status for an order',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'The order ID to check' },
        },
        required: ['order_id'],
      },
    },
  },
];

// Mock data for tool responses
const orders: Record<
  string,
  { status: string; total: number; items: string[]; date: string }
> = {
  'ORD-12345': {
    status: 'delivered',
    total: 49.99,
    items: ['Widget Pro'],
    date: '2026-03-10',
  },
  'ORD-67890': {
    status: 'shipped',
    total: 149.99,
    items: ['Gadget X', 'Cable Kit'],
    date: '2026-03-14',
  },
  'ORD-11111': {
    status: 'processing',
    total: 29.99,
    items: ['Basic Widget'],
    date: '2026-03-16',
  },
};

const products: Record<
  string,
  { price: number; description: string; inStock: boolean }
> = {
  'widget pro': {
    price: 49.99,
    description: 'Premium widget with advanced features',
    inStock: true,
  },
  'gadget x': {
    price: 99.99,
    description: 'Next-gen gadget for power users',
    inStock: true,
  },
  'basic widget': {
    price: 29.99,
    description: 'Affordable entry-level widget',
    inStock: false,
  },
  'cable kit': {
    price: 19.99,
    description: 'Universal cable set',
    inStock: true,
  },
};

export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): string {
  switch (name) {
    case 'lookup_order': {
      const id = args.order_id as string;
      const order = orders[id];
      if (!order) return JSON.stringify({ error: `Order ${id} not found` });
      return JSON.stringify(order);
    }
    case 'get_product_info': {
      const query = (args.product as string).toLowerCase();
      const product = products[query];
      if (!product)
        return JSON.stringify({ error: `Product "${args.product}" not found` });
      return JSON.stringify(product);
    }
    case 'process_refund': {
      const id = args.order_id as string;
      const order = orders[id];
      if (!order) return JSON.stringify({ error: `Order ${id} not found` });
      if (order.total > 100)
        return JSON.stringify({
          status: 'escalated',
          message: 'Requires manager approval',
        });
      return JSON.stringify({ status: 'approved', refund_amount: order.total });
    }
    case 'check_shipping': {
      const id = args.order_id as string;
      const order = orders[id];
      if (!order) return JSON.stringify({ error: `Order ${id} not found` });
      return JSON.stringify({
        order_id: id,
        shipping_status: order.status,
        estimated_delivery: '2026-03-18',
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
