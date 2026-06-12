import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { dashboards, widgets } from '../db/schema/dashboards';
import { getUserFromRequest } from '../middleware/requireUser';
import { emitStateChanged, clientIdFromRequest } from '../services/stateEvents';

export const dashboardRoutes = new Elysia({ prefix: '/api/dashboards' })

  // List all dashboards for current user
  .get('/', async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const rows = await db.select().from(dashboards).where(eq(dashboards.userId, user.id));
    return { success: true, data: rows };
  })

  // Get single dashboard with widgets
  .get('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [dash] = await db.select().from(dashboards)
      .where(and(eq(dashboards.id, params.id), eq(dashboards.userId, user.id)));
    if (!dash) { set.status = 404; return { error: 'Dashboard not found' }; }
    const widgetRows = await db.select().from(widgets).where(eq(widgets.dashboardId, params.id));
    return { success: true, data: { ...dash, widgets: widgetRows } };
  })

  // Create dashboard
  .post('/', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [dash] = await db.insert(dashboards).values({
      userId: user.id,
      title: body.title,
      description: body.description,
      layout: body.layout || {},
      isDefault: body.isDefault || false,
    }).returning();
    emitStateChanged({ userId: user.id, domain: 'dashboard', action: 'created', id: dash.id, data: dash, origin: clientIdFromRequest(request) });
    return { success: true, data: dash };
  }, {
    body: t.Object({
      title: t.String(),
      description: t.Optional(t.String()),
      layout: t.Optional(t.Any()),
      isDefault: t.Optional(t.Boolean()),
    }),
  })

  // Update dashboard
  .put('/:id', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [dash] = await db.update(dashboards)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(dashboards.id, params.id), eq(dashboards.userId, user.id)))
      .returning();
    if (!dash) { set.status = 404; return { error: 'Dashboard not found' }; }
    emitStateChanged({ userId: user.id, domain: 'dashboard', action: 'updated', id: dash.id, data: dash, origin: clientIdFromRequest(request) });
    return { success: true, data: dash };
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      layout: t.Optional(t.Any()),
      isDefault: t.Optional(t.Boolean()),
    }),
  })

  // Delete dashboard
  .delete('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [dash] = await db.delete(dashboards)
      .where(and(eq(dashboards.id, params.id), eq(dashboards.userId, user.id)))
      .returning();
    if (!dash) { set.status = 404; return { error: 'Dashboard not found' }; }
    emitStateChanged({ userId: user.id, domain: 'dashboard', action: 'deleted', id: dash.id, data: dash, origin: clientIdFromRequest(request) });
    return { success: true };
  });
