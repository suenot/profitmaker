import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { dataProviders } from '../db/schema/providers';
import { getUserFromRequest } from '../middleware/requireUser';
import { emitStateChanged, clientIdFromRequest } from '../services/stateEvents';

export const providerRoutes = new Elysia({ prefix: '/api/providers' })

  // List all providers for current user
  .get('/', async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const rows = await db.select().from(dataProviders).where(eq(dataProviders.userId, user.id));
    return { success: true, data: rows };
  })

  // Create provider
  .post('/', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [provider] = await db.insert(dataProviders).values({
      id: body.id || crypto.randomUUID(),
      userId: user.id,
      name: body.name,
      type: body.type,
      status: body.status || 'connected',
      exchanges: body.exchanges || ['*'],
      priority: body.priority ?? 100,
      config: body.config || {},
    }).returning();
    emitStateChanged({ userId: user.id, domain: 'provider', action: 'created', id: provider.id, data: provider, origin: clientIdFromRequest(request) });
    return { success: true, data: provider };
  }, {
    body: t.Object({
      id: t.Optional(t.String()),
      name: t.String(),
      type: t.String(),
      status: t.Optional(t.String()),
      exchanges: t.Optional(t.Any()),
      priority: t.Optional(t.Number()),
      config: t.Optional(t.Any()),
    }),
  })

  // Update provider
  .put('/:id', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [provider] = await db.update(dataProviders)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(dataProviders.id, params.id), eq(dataProviders.userId, user.id)))
      .returning();
    if (!provider) { set.status = 404; return { error: 'Provider not found' }; }
    emitStateChanged({ userId: user.id, domain: 'provider', action: 'updated', id: provider.id, data: provider, origin: clientIdFromRequest(request) });
    return { success: true, data: provider };
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      type: t.Optional(t.String()),
      status: t.Optional(t.String()),
      exchanges: t.Optional(t.Any()),
      priority: t.Optional(t.Number()),
      config: t.Optional(t.Any()),
    }),
  })

  // Delete provider
  .delete('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [provider] = await db.delete(dataProviders)
      .where(and(eq(dataProviders.id, params.id), eq(dataProviders.userId, user.id)))
      .returning();
    if (!provider) { set.status = 404; return { error: 'Provider not found' }; }
    emitStateChanged({ userId: user.id, domain: 'provider', action: 'deleted', id: provider.id, data: provider, origin: clientIdFromRequest(request) });
    return { success: true };
  });
