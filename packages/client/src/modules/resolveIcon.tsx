import React from 'react';
import {
  ArrowUpDown,
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  Database,
  FileText,
  Globe,
  Handshake,
  LineChart,
  Package,
  PieChart,
  Puzzle,
  Server,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  type LucideProps,
} from 'lucide-react';

/**
 * Curated lucide icon map for widget definitions.
 *
 * We intentionally do NOT import lucide's `icons` barrel — that pulls every icon
 * into the bundle (~660 kB) and defeats tree-shaking. Instead we register the
 * names built-in widgets use; add new entries here when a widget needs an icon
 * not already listed. Unknown names fall back to the puzzle icon (matching the
 * SDK contract for module-provided icons).
 */
const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  ArrowUpDown,
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  Database,
  FileText,
  Globe,
  Handshake,
  LineChart,
  Package,
  PieChart,
  Server,
  Settings,
  TrendingUp,
  Users,
  Wallet,
};

/**
 * Resolve a lucide-react icon name (e.g. "LineChart") to its component, falling
 * back to a puzzle-piece icon when the name is unknown or omitted. Used to turn
 * a `WidgetDefinition.icon` string into a rendered icon in menus and headers.
 */
export function resolveIcon(name: string | undefined, props?: LucideProps): React.ReactElement {
  const Icon = (name && ICONS[name]) || Puzzle;
  return <Icon {...props} />;
}
