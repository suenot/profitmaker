import { Elysia, t } from 'elysia';
import { getUserFromRequest } from '../middleware/requireUser';
import { dispatchUiCommand } from '../services/uiCommands';

/**
 * Validate a ui:command payload against the known command vocabulary.
 * Returns an error string when invalid, or null when the payload is acceptable.
 *
 * The vocabulary is intentionally narrow and UI-only — these are verbs a client
 * must execute (focus a widget, switch a tab) that have no REST/DB equivalent.
 */
function validateCommand(type: string, payload: any): string | null {
  switch (type) {
    case 'set_active_dashboard':
      if (!payload || typeof payload.dashboardId !== 'string')
        return 'set_active_dashboard requires { dashboardId: string }';
      return null;
    case 'bring_widget_to_front':
      if (!payload || typeof payload.dashboardId !== 'string' || typeof payload.widgetId !== 'string')
        return 'bring_widget_to_front requires { dashboardId: string, widgetId: string }';
      return null;
    case 'set_widget_settings':
      if (!payload || typeof payload.widgetId !== 'string' || typeof payload.widgetType !== 'string')
        return 'set_widget_settings requires { widgetId: string, widgetType: string, settings: object }';
      if (payload.settings === undefined || payload.settings === null || typeof payload.settings !== 'object')
        return 'set_widget_settings requires a settings object';
      return null;
    case 'get_ui_state':
      return null; // no payload required
    default:
      return `Unknown ui:command type '${type}'`;
  }
}

export const uiRoutes = new Elysia({ prefix: '/api/ui' })

  // POST /api/ui/command — dispatch a UI verb to the user's connected clients
  // and await an ack. 503 when no client is connected; 504 on timeout.
  .post('/command', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }

    const validationError = validateCommand(body.type, body.payload);
    if (validationError) { set.status = 400; return { error: validationError }; }

    const result = await dispatchUiCommand({
      userId: user.id,
      type: body.type,
      payload: body.payload ?? {},
      timeoutMs: body.timeoutMs,
    });

    if (!result.ok) {
      // Distinguish "nobody home" (503) from "client took too long" (504).
      set.status = result.error?.includes('No UI client') ? 503 : 504;
      return { success: false, id: result.id, error: result.error };
    }

    return { success: true, id: result.id, data: result.data };
  }, {
    body: t.Object({
      type: t.String(),
      payload: t.Optional(t.Any()),
      timeoutMs: t.Optional(t.Number()),
    }),
  });
