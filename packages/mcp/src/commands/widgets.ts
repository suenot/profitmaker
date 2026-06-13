import { z } from 'zod';
import { BUILTIN_WIDGET_TYPES } from '@profitmaker/types';
import { defineCommand, type Command } from '../command';

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number().optional(),
});

export const widgetCommands: Command[] = [
  defineCommand({
    name: 'widgets_list_types',
    description: 'List every widget type that can be added: the built-in types (chart, orderbook, trades, orderForm, userBalances, …) plus any module-provided widget types (<moduleId>.<widget>). Call before widgets_add.',
    input: z.object({}),
    run: async ({ api }) => {
      const builtin = [...BUILTIN_WIDGET_TYPES].map((type) => ({ type, source: 'builtin' as const }));
      let moduleWidgets: Array<{ type: string; source: 'module'; moduleId: string; title?: string }> = [];
      try {
        const r = await api.get('/api/modules');
        const mods = (r?.modules ?? r?.data ?? []) as any[];
        for (const m of mods) {
          const widgets = m?.manifest?.frontend?.widgets ?? m?.frontend?.widgets ?? [];
          for (const w of widgets) {
            if (w?.type) moduleWidgets.push({ type: w.type, source: 'module', moduleId: m.id ?? m.manifest?.id, title: w.title });
          }
        }
      } catch {
        // modules endpoint optional — built-ins are always available
      }
      return { builtin, module: moduleWidgets };
    },
  }),

  defineCommand({
    name: 'widgets_list',
    description: 'List the widgets on a dashboard.',
    input: z.object({ dashboardId: z.string() }),
    run: async ({ api }, { dashboardId }) => {
      const r = await api.get(`/api/widgets/dashboard/${dashboardId}`);
      return r.data;
    },
  }),

  defineCommand({
    name: 'widgets_add',
    description: 'Add a widget to a dashboard. `type` is a value from widgets_list_types. `position` is pixels {x,y,width,height}. Optionally bind it to a group (groupId) so it follows that group\'s instrument. Appears live.',
    input: z.object({
      dashboardId: z.string(),
      type: z.string().describe('Widget type from widgets_list_types'),
      position: PositionSchema,
      defaultTitle: z.string().optional(),
      userTitle: z.string().optional(),
      groupId: z.string().optional(),
      config: z.record(z.any()).optional(),
      showGroupSelector: z.boolean().optional(),
      isVisible: z.boolean().optional(),
    }),
    run: async ({ api }, body) => {
      const r = await api.post('/api/widgets', body);
      return r.data;
    },
  }),

  defineCommand({
    name: 'widgets_update',
    description: "Update a widget's title, config, group binding, or visibility. Only passed fields change.",
    input: z.object({
      widgetId: z.string(),
      userTitle: z.string().optional(),
      config: z.record(z.any()).optional(),
      groupId: z.string().optional(),
      showGroupSelector: z.boolean().optional(),
      isVisible: z.boolean().optional(),
      isMinimized: z.boolean().optional(),
    }),
    run: async ({ api }, { widgetId, ...patch }) => {
      const r = await api.put(`/api/widgets/${widgetId}`, patch);
      return r.data;
    },
  }),

  defineCommand({
    name: 'widgets_move',
    description: 'Move a widget to a new {x,y} pixel position (keeps its current size). The widget visibly moves in any open browser.',
    input: z.object({ widgetId: z.string(), x: z.number(), y: z.number() }),
    run: async ({ api }, { widgetId, x, y }) => {
      // Preserve width/height/zIndex by reading the widget's current position.
      const cur = await fetchWidget(api, widgetId);
      const position = { ...cur.position, x, y };
      const r = await api.put(`/api/widgets/${widgetId}`, { position });
      return r.data;
    },
  }),

  defineCommand({
    name: 'widgets_resize',
    description: 'Resize a widget to a new width/height in pixels (keeps its position). Visible live.',
    input: z.object({ widgetId: z.string(), width: z.number(), height: z.number() }),
    run: async ({ api }, { widgetId, width, height }) => {
      const cur = await fetchWidget(api, widgetId);
      const position = { ...cur.position, width, height };
      const r = await api.put(`/api/widgets/${widgetId}`, { position });
      return r.data;
    },
  }),

  defineCommand({
    name: 'widgets_remove',
    description: 'Remove a widget from its dashboard. Disappears live.',
    input: z.object({ widgetId: z.string() }),
    run: async ({ api }, { widgetId }) => {
      await api.delete(`/api/widgets/${widgetId}`);
      return { success: true, id: widgetId };
    },
  }),
];

/**
 * Fetch a single widget by id. The server has no GET /api/widgets/:id, so we
 * locate it by scanning the user's dashboards — fine for the move/resize helpers
 * which need the current position to preserve the other dimensions.
 */
async function fetchWidget(api: import('../client').ApiClient, widgetId: string): Promise<any> {
  const list = await api.get('/api/dashboards');
  for (const d of list.data ?? []) {
    const full = await api.get(`/api/dashboards/${d.id}`);
    const w = (full.data?.widgets ?? []).find((x: any) => x.id === widgetId);
    if (w) return w;
  }
  throw new Error(`widget ${widgetId} not found on any dashboard`);
}
