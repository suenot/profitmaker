import { z } from 'zod';
import { defineCommand, type Command } from '../command';

export const uiCommands: Command[] = [
  defineCommand({
    name: 'ui_get_ui_state',
    description: 'Ask the live UI what it currently shows: the active dashboard id and the open widgets (id + type). Requires a browser to be open and connected (ui:command); returns a 503 error otherwise. Useful to see what the user is looking at before acting.',
    input: z.object({}),
    run: async ({ api }) => {
      const r = await api.post('/api/ui/command', { type: 'get_ui_state', payload: {} });
      return r.data;
    },
  }),

  defineCommand({
    name: 'ui_bring_widget_to_front',
    description: 'Raise a widget above the others (z-order) in the live UI. Requires a connected browser.',
    input: z.object({ dashboardId: z.string(), widgetId: z.string() }),
    run: async ({ api }, payload) => {
      const r = await api.post('/api/ui/command', { type: 'bring_widget_to_front', payload });
      return r;
    },
  }),

  defineCommand({
    name: 'ui_set_widget_settings',
    description: 'Apply per-widget settings live (e.g. a chart timeframe). `settings` is free-form and the client maps it to that widget type\'s store. Requires a connected browser.',
    input: z.object({
      widgetId: z.string(),
      widgetType: z.string().describe('e.g. chart, orderbook, trades'),
      settings: z.record(z.any()).describe('e.g. { "timeframe": "5m" } for a chart'),
    }),
    run: async ({ api }, payload) => {
      const r = await api.post('/api/ui/command', { type: 'set_widget_settings', payload });
      return r;
    },
  }),
];
