import { z } from 'zod';
import { GroupColors } from '@profitmaker/types';
import { defineCommand, type Command } from '../command';

export const groupCommands: Command[] = [
  defineCommand({
    name: 'groups_list',
    description: 'List instrument groups. A group carries an exchange/market/tradingPair context; widgets bound to a group all follow it. Returns id, name, color, and the current context.',
    input: z.object({}),
    run: async ({ api }) => {
      const r = await api.get('/api/groups');
      return r.data;
    },
  }),

  defineCommand({
    name: 'groups_create',
    description: 'Create an instrument group with an exchange/market/tradingPair context. Bind widgets to it (widgets_add groupId, or groups_assign_widget) so they all show the same instrument.',
    input: z.object({
      name: z.string(),
      color: z.enum(GroupColors).optional().describe('Group color; "transparent" = no color label'),
      tradingPair: z.string().optional().describe('e.g. BTC/USDT'),
      exchange: z.string().optional().describe('e.g. binance, bybit'),
      market: z.string().optional().describe('e.g. spot, futures'),
      account: z.string().optional(),
      description: z.string().optional(),
    }),
    run: async ({ api }, body) => {
      const r = await api.post('/api/groups', body);
      return r.data;
    },
  }),

  defineCommand({
    name: 'groups_set_group_context',
    description: "Change a group's instrument context (exchange/market/tradingPair). EVERY widget bound to this group retargets live — chart, order book and trades all resubscribe to the new symbol.",
    input: z.object({
      groupId: z.string(),
      tradingPair: z.string().optional(),
      exchange: z.string().optional(),
      market: z.string().optional(),
      account: z.string().optional(),
    }),
    run: async ({ api }, { groupId, ...patch }) => {
      const r = await api.put(`/api/groups/${groupId}`, patch);
      return r.data;
    },
  }),

  defineCommand({
    name: 'groups_assign_widget',
    description: 'Bind a widget to a group so it follows that group\'s instrument context.',
    input: z.object({ widgetId: z.string(), groupId: z.string() }),
    run: async ({ api }, { widgetId, groupId }) => {
      const r = await api.put(`/api/widgets/${widgetId}`, { groupId });
      return r.data;
    },
  }),
];
