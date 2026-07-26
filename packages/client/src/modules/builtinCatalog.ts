import type { WidgetDefinition } from '@profitmaker/module-sdk';

/**
 * Catalog of the built-in widget definitions registered this session.
 *
 * Kept in its own module — NOT in builtinWidgets.tsx — to break an import cycle:
 * builtinWidgets imports the Module Store widget (it is one of the built-ins),
 * and the Module Store needs the catalog to list them. Importing it from here
 * means neither file has to reach into the other.
 */

/**
 * Built-in widget definition. Extends the SDK contract with `menuLabel`, a
 * presentation-only override for the add-widget menu (the SDK `title` drives the
 * widget *header*, which intentionally differs from the menu text for built-ins
 * such as "Order Book" vs "Order Book (not ready)").
 */
export type BuiltinWidgetDefinition = WidgetDefinition & {
  /** Menu text override; falls back to `title` when omitted. */
  menuLabel?: string;
  /** One-line summary shown in the Module Store. */
  description?: string;
  /**
   * Cannot be turned off. Reserved for the Module Store itself — switching it
   * off would remove the only UI that can switch anything back on.
   */
  locked?: boolean;
  /**
   * Hidden from the Module Store. Used for legacy aliases (`custom`,
   * `orderBook`) that render another widget's component: they are not separate
   * things a user can enable or disable.
   */
  hiddenFromStore?: boolean;
};

/** A built-in widget as the Module Store lists it. */
export interface BuiltinModuleInfo {
  /** The widget type — doubles as the module id for built-ins. */
  type: string;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  locked: boolean;
  /** Registered only in dev builds. */
  dev: boolean;
}

/**
 * Every built-in definition registered this session, by type. A widget switched
 * off in the Module Store is unregistered from the widget registry, which drops
 * its definition — this is where it comes back from when switched on again.
 */
const CATALOG = new Map<string, BuiltinWidgetDefinition>();
const DEV_TYPES = new Set<string>();

/** Record definitions as they are registered. Called by builtinWidgets. */
export function addToBuiltinCatalog(defs: BuiltinWidgetDefinition[], opts: { dev?: boolean } = {}): void {
  for (const def of defs) {
    CATALOG.set(def.type, def);
    if (opts.dev) DEV_TYPES.add(def.type);
  }
}

/** The built-in definition for `type`, or undefined if it was never registered. */
export function getBuiltinDefinition(type: string): BuiltinWidgetDefinition | undefined {
  return CATALOG.get(type);
}

/**
 * Built-ins as the Module Store lists them — one entry per widget. Aliases are
 * excluded (they are not independently switchable); dev-only widgets appear only
 * in the builds that registered them.
 */
export function listBuiltinModules(): BuiltinModuleInfo[] {
  return Array.from(CATALOG.values())
    .filter((def) => !def.hiddenFromStore)
    .map((def) => ({
      type: def.type,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category ?? 'system',
      locked: !!def.locked,
      dev: DEV_TYPES.has(def.type),
    }));
}
