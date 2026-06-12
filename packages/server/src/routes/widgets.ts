import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { dashboards, widgets } from '../db/schema/dashboards';
import { getUserFromRequest } from '../middleware/requireUser';
import { emitStateChanged, clientIdFromRequest } from '../services/stateEvents';

// Helper: verify dashboard belongs to user
const verifyDashboardOwner = async (dashboardId: string, userId: string) => {
  const [dash] = await db.select({ id: dashboards.id }).from(dashboards)
    .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)));
  return !!dash;
};

export const widgetRoutes = new Elysia({ prefix: '/api/widgets' })

  // List widgets for a dashboard
  .get('/dashboard/:dashboardId', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    if (!await verifyDashboardOwner(params.dashboardId, user.id)) {
      set.status = 403; return { error: 'Not your dashboard' };
    }
    const rows = await db.select().from(widgets).where(eq(widgets.dashboardId, params.dashboardId));
    return { success: true, data: rows };
  })

  // Create widget
  .post('/', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    if (!await verifyDashboardOwner(body.dashboardId, user.id)) {
      set.status = 403; return { error: 'Not your dashboard' };
    }
    const [widget] = await db.insert(widgets).values({
      dashboardId: body.dashboardId,
      type: body.type,
      defaultTitle: body.defaultTitle || body.type,
      userTitle: body.userTitle,
      position: body.position,
      config: body.config || {},
      groupId: body.groupId,
      showGroupSelector: body.showGroupSelector ?? true,
      isVisible: body.isVisible ?? true,
      isMinimized: false,
    }).returning();
    emitStateChanged({ userId: user.id, domain: 'widget', action: 'created', id: widget.id, data: widget, origin: clientIdFromRequest(request) });
    return { success: true, data: widget };
  }, {
    body: t.Object({
      dashboardId: t.String(),
      type: t.String(),
      defaultTitle: t.Optional(t.String()),
      userTitle: t.Optional(t.String()),
      position: t.Any(),
      config: t.Optional(t.Any()),
      groupId: t.Optional(t.String()),
      showGroupSelector: t.Optional(t.Boolean()),
      isVisible: t.Optional(t.Boolean()),
    }),
  })

  // Update widget (position, config, title, etc.)
  .put('/:id', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    // First get the widget to check ownership
    const [existing] = await db.select().from(widgets).where(eq(widgets.id, params.id));
    if (!existing) { set.status = 404; return { error: 'Widget not found' }; }
    if (!await verifyDashboardOwner(existing.dashboardId, user.id)) {
      set.status = 403; return { error: 'Not your widget' };
    }
    const [widget] = await db.update(widgets)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(widgets.id, params.id))
      .returning();
    emitStateChanged({ userId: user.id, domain: 'widget', action: 'updated', id: widget.id, data: widget, origin: clientIdFromRequest(request) });
    return { success: true, data: widget };
  }, {
    body: t.Object({
      userTitle: t.Optional(t.String()),
      position: t.Optional(t.Any()),
      preCollapsePosition: t.Optional(t.Any()),
      config: t.Optional(t.Any()),
      groupId: t.Optional(t.String()),
      showGroupSelector: t.Optional(t.Boolean()),
      isVisible: t.Optional(t.Boolean()),
      isMinimized: t.Optional(t.Boolean()),
    }),
  })

  // Batch update widgets (for drag-and-drop rearrangement)
  .put('/batch', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const results = [];
    for (const item of body.widgets) {
      const [existing] = await db.select().from(widgets).where(eq(widgets.id, item.id));
      if (!existing) continue;
      if (!await verifyDashboardOwner(existing.dashboardId, user.id)) continue;
      const [updated] = await db.update(widgets)
        .set({ position: item.position, updatedAt: new Date() })
        .where(eq(widgets.id, item.id))
        .returning();
      if (updated) results.push(updated);
    }
    const origin = clientIdFromRequest(request);
    for (const updated of results) {
      emitStateChanged({ userId: user.id, domain: 'widget', action: 'updated', id: updated.id, data: updated, origin });
    }
    return { success: true, data: results };
  }, {
    body: t.Object({
      widgets: t.Array(t.Object({ id: t.String(), position: t.Any() })),
    }),
  })

  // Delete widget
  .delete('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [existing] = await db.select().from(widgets).where(eq(widgets.id, params.id));
    if (!existing) { set.status = 404; return { error: 'Widget not found' }; }
    if (!await verifyDashboardOwner(existing.dashboardId, user.id)) {
      set.status = 403; return { error: 'Not your widget' };
    }
    await db.delete(widgets).where(eq(widgets.id, params.id));
    emitStateChanged({ userId: user.id, domain: 'widget', action: 'deleted', id: existing.id, data: existing, origin: clientIdFromRequest(request) });
    return { success: true };
  });
