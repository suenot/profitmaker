import { z } from 'zod';

// Widget position and size schema
export const WidgetPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number().optional().default(1),
});
export type WidgetPosition = z.infer<typeof WidgetPositionSchema>;

// Widget configuration schema
export const WidgetConfigSchema = z.record(z.any()).optional();
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// Built-in widget types. Kept for reference/defaults; the schema no longer
// restricts `type` to this list so module-provided widget types validate too.
export const BUILTIN_WIDGET_TYPES = ['chart', 'portfolio', 'orderForm', 'transactionHistory', 'custom', 'orderbook', 'trades', 'deals', 'tradesV2', 'dataProviderSettings', 'dataProviderDemo', 'dataProviderSetup', 'dataProviderDebug', 'notificationTest', 'debugUserData', 'debugCCXTCache', 'debugBingX', 'exchanges', 'markets', 'pairs', 'userBalances', 'userTradingData', 'leverages', 'heatmap', 'footprint', 'dom', 'scalper'] as const;

// Widget schema
export const WidgetSchema = z.object({
  id: z.string(), // uuid
  type: z.string().min(1), // built-in or '<moduleId>.<widgetName>'; see BUILTIN_WIDGET_TYPES
  title: z.string(), // deprecated - keep for compatibility
  defaultTitle: z.string(),
  userTitle: z.string().optional(),
  position: WidgetPositionSchema,
  config: WidgetConfigSchema,
  groupId: z.string().optional(), // Widget group ID
  showGroupSelector: z.boolean().optional().default(true), // optional display of group selector circle
  isVisible: z.boolean().default(true),
  isMinimized: z.boolean().default(false),
  // Store previous state before collapsing for restoration
  preCollapsePosition: WidgetPositionSchema.optional(),
});
export type Widget = z.infer<typeof WidgetSchema>;

// Dashboard layout schema
export const DashboardLayoutSchema = z.object({
  gridSize: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
  }),
  snapToGrid: z.boolean().default(true),
  gridStep: z.number().default(10),
});
export type DashboardLayout = z.infer<typeof DashboardLayoutSchema>;

// Dashboard schema
export const DashboardSchema = z.object({
  id: z.string(), // uuid
  title: z.string(),
  description: z.string().optional(),
  widgets: z.array(WidgetSchema),
  layout: DashboardLayoutSchema,
  createdAt: z.string(), // ISO date
  updatedAt: z.string(), // ISO date
  isDefault: z.boolean().default(false),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

// Dashboard store state schema
export const DashboardStoreStateSchema = z.object({
  dashboards: z.array(DashboardSchema),
  activeDashboardId: z.string().optional(),
});
export type DashboardStoreState = z.infer<typeof DashboardStoreStateSchema>;

// Types for creating new entities (without id and dates)
export type CreateDashboardData = Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateWidgetData = Omit<Widget, 'id'>;
export type UpdateDashboardData = Partial<Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>>;
export type UpdateWidgetData = Partial<Omit<Widget, 'id'>>; 