import { z } from 'zod';
import { defineCommand, type Command } from '../command';

export const providerCommands: Command[] = [
  defineCommand({
    name: 'providers_list_available',
    description: 'List the server-side data/trading providers registered on the server (id, displayName, supported exchanges, priority, whether it came from a module). Pass an id as `providerId` to market-data commands to select it. Built-in is "ccxt".',
    input: z.object({}),
    run: async ({ api }) => {
      try {
        const r = await api.get('/api/providers/available');
        return r.data;
      } catch (err: any) {
        // Feature-detect: older servers without #13's endpoint only have ccxt.
        if (err?.status === 404) {
          return [{ id: 'ccxt', displayName: 'CCXT', exchanges: '*', priority: 0, note: 'endpoint /api/providers/available not present; only the built-in ccxt provider is available' }];
        }
        throw err;
      }
    },
  }),
];
