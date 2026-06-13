import { z } from 'zod';
import { defineCommand, type Command } from '../command';

export const moduleCommands: Command[] = [
  defineCommand({
    name: 'modules_search',
    description: 'Search the npm registry for installable Profitmaker modules (packages with the profitmaker-module keyword).',
    input: z.object({ query: z.string().describe('Search text') }),
    run: async ({ api }, { query }) => {
      const r = await api.get(`/api/modules/search?q=${encodeURIComponent(query)}`);
      return r.data ?? r.objects ?? r;
    },
  }),

  defineCommand({
    name: 'modules_install',
    description: 'Install a Profitmaker module from npm by package name. It becomes available with no server restart.',
    input: z.object({ name: z.string(), version: z.string().optional() }),
    run: async ({ api }, body) => {
      const r = await api.post('/api/modules/install', body);
      return r;
    },
  }),

  defineCommand({
    name: 'modules_enable',
    description: 'Enable an installed module by id (registers its widgets/backend, no restart).',
    input: z.object({ id: z.string() }),
    run: async ({ api }, { id }) => {
      const r = await api.post(`/api/modules/${id}/enable`, {});
      return r;
    },
  }),

  defineCommand({
    name: 'modules_disable',
    description: 'Disable an installed module by id (unregisters it, no restart).',
    input: z.object({ id: z.string() }),
    run: async ({ api }, { id }) => {
      const r = await api.post(`/api/modules/${id}/disable`, {});
      return r;
    },
  }),
];
