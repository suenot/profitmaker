import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { groups } from '../db/schema/groups';
import { getUserFromRequest } from '../middleware/requireUser';
import { emitStateChanged, clientIdFromRequest } from '../services/stateEvents';

export const groupRoutes = new Elysia({ prefix: '/api/groups' })

  // List all groups for current user
  .get('/', async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const rows = await db.select().from(groups).where(eq(groups.userId, user.id));
    return { success: true, data: rows };
  })

  // Get single group
  .get('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [group] = await db.select().from(groups)
      .where(and(eq(groups.id, params.id), eq(groups.userId, user.id)));
    if (!group) { set.status = 404; return { error: 'Group not found' }; }
    return { success: true, data: group };
  })

  // Create group
  .post('/', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [group] = await db.insert(groups).values({
      userId: user.id,
      name: body.name,
      color: body.color || 'transparent',
      tradingPair: body.tradingPair,
      account: body.account,
      exchange: body.exchange,
      market: body.market,
      description: body.description,
    }).returning();
    emitStateChanged({ userId: user.id, domain: 'group', action: 'created', id: group.id, data: group, origin: clientIdFromRequest(request) });
    return { success: true, data: group };
  }, {
    body: t.Object({
      name: t.String(),
      color: t.Optional(t.String()),
      tradingPair: t.Optional(t.String()),
      account: t.Optional(t.String()),
      exchange: t.Optional(t.String()),
      market: t.Optional(t.String()),
      description: t.Optional(t.String()),
    }),
  })

  // Update group
  .put('/:id', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [group] = await db.update(groups)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(groups.id, params.id), eq(groups.userId, user.id)))
      .returning();
    if (!group) { set.status = 404; return { error: 'Group not found' }; }
    emitStateChanged({ userId: user.id, domain: 'group', action: 'updated', id: group.id, data: group, origin: clientIdFromRequest(request) });
    return { success: true, data: group };
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      color: t.Optional(t.String()),
      tradingPair: t.Optional(t.String()),
      account: t.Optional(t.String()),
      exchange: t.Optional(t.String()),
      market: t.Optional(t.String()),
      description: t.Optional(t.String()),
    }),
  })

  // Delete group
  .delete('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [group] = await db.delete(groups)
      .where(and(eq(groups.id, params.id), eq(groups.userId, user.id)))
      .returning();
    if (!group) { set.status = 404; return { error: 'Group not found' }; }
    emitStateChanged({ userId: user.id, domain: 'group', action: 'deleted', id: group.id, data: group, origin: clientIdFromRequest(request) });
    return { success: true };
  });
