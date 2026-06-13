import { z } from 'zod';
import { defineCommand, type Command } from '../command';

const DashboardId = z.object({ dashboardId: z.string().describe('Dashboard id (uuid)') });

export const dashboardCommands: Command[] = [
  defineCommand({
    name: 'dashboards_list',
    description: 'List all dashboards for the current user (id, title, isDefault). Use this first to discover dashboard ids.',
    input: z.object({}),
    run: async ({ api }) => {
      const r = await api.get('/api/dashboards');
      return r.data;
    },
  }),

  defineCommand({
    name: 'dashboards_get',
    description: 'Get one dashboard with all of its widgets (positions, types, groups, visibility).',
    input: DashboardId,
    run: async ({ api }, { dashboardId }) => {
      const r = await api.get(`/api/dashboards/${dashboardId}`);
      return r.data;
    },
  }),

  defineCommand({
    name: 'dashboards_create',
    description: 'Create a new dashboard (a tab in the terminal). Returns the created dashboard incl. its new id. Appears live in any open browser.',
    input: z.object({
      title: z.string().describe('Tab title'),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
    run: async ({ api }, body) => {
      const r = await api.post('/api/dashboards', body);
      return r.data;
    },
  }),

  defineCommand({
    name: 'dashboards_update',
    description: "Update a dashboard's title/description/layout/isDefault. Only the fields you pass change.",
    input: z.object({
      dashboardId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
      layout: z.any().optional(),
    }),
    run: async ({ api }, { dashboardId, ...patch }) => {
      const r = await api.put(`/api/dashboards/${dashboardId}`, patch);
      return r.data;
    },
  }),

  defineCommand({
    name: 'dashboards_delete',
    description: 'Delete a dashboard and all of its widgets (cascades). The tab disappears live.',
    input: DashboardId,
    run: async ({ api }, { dashboardId }) => {
      await api.delete(`/api/dashboards/${dashboardId}`);
      return { success: true, id: dashboardId };
    },
  }),

  defineCommand({
    name: 'dashboards_set_active',
    description: 'Switch the active dashboard tab in the live UI (ui:command). Requires a browser to be open and connected; returns 503 otherwise.',
    input: DashboardId,
    run: async ({ api }, { dashboardId }) => {
      const r = await api.post('/api/ui/command', { type: 'set_active_dashboard', payload: { dashboardId } });
      return r;
    },
  }),
];
