import React, { useCallback, useEffect, useState } from 'react';
import type { InstalledModule, ModulePermission } from '@profitmaker/module-sdk';
import { Search, RefreshCw, Trash2, AlertTriangle, Package, Download, Lock, KeyRound, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { moduleFetch } from './api';
import { getAdminToken, setAdminToken, withAdminToken } from './adminToken';
import { loadModules, unloadModule } from './loader';
import { useModuleLoadStore } from './loaderState';
import { useBuiltinModulesStore } from './builtinModules';
import { useUserModulesStore } from './userModules';
import { useWidgetRegistry } from './registry';
import { listBuiltinModules } from './builtinCatalog';
import { resolveIcon } from './resolveIcon';
import { useNotificationStore } from '@/store/notificationStore';

interface SearchResult {
  name: string;
  version: string;
  description: string;
  keywords?: string[];
}

const PERMISSION_LABEL: Record<ModulePermission, string> = {
  'market-data': 'market data',
  'private-data': 'private data',
  orders: 'orders',
  network: 'network',
  storage: 'storage',
  jobs: 'jobs',
  provider: 'data provider',
};

function PermissionBadges({ permissions }: { permissions: string[] }) {
  if (!permissions.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {permissions.map((p) => (
        <Badge key={p} variant="outline" className="text-[10px] text-terminal-muted border-terminal-border">
          {PERMISSION_LABEL[p as ModulePermission] ?? p}
        </Badge>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Installed tab
// ---------------------------------------------------------------------------

/**
 * Built-in widgets, listed as modules. They ship with the terminal, so there is
 * no version, no uninstall and no npm package behind them — only a switch. The
 * Module Store row is locked on (see builtinModules.ts).
 */
function BuiltinSection() {
  const modules = listBuiltinModules();
  const { disabled, busyType, hydrate, setEnabled } = useBuiltinModulesStore();
  // Select the actions, not the whole store: subscribing to the store object
  // makes every new notification a re-render + a fresh `notify` identity, which
  // re-runs the effects below — one failed request then loops forever.
  const showError = useNotificationStore((s) => s.showError);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const toggle = async (type: string, title: string, enabled: boolean) => {
    try {
      await setEnabled(type, enabled);
    } catch (err) {
      showError(`Failed to ${enabled ? 'enable' : 'disable'} "${title}"`, err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-terminal-muted pt-1">Built-in</div>
      {modules.map((m) => {
        const enabled = !disabled.includes(m.type);
        return (
          <div key={m.type} className="rounded-md border border-terminal-border bg-terminal-widget/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {resolveIcon(m.icon, { size: 14, className: 'text-terminal-muted shrink-0' })}
                  <span className="font-medium text-terminal-text truncate">{m.title}</span>
                  <Badge variant="outline" className="text-[10px] text-terminal-muted border-terminal-border">
                    {m.category}
                  </Badge>
                  {m.dev && <Badge variant="secondary" className="text-[10px]">dev</Badge>}
                </div>
                {m.description && <div className="text-xs text-terminal-muted mt-0.5 truncate">{m.description}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.locked ? (
                  <span title="Required — this is the UI that manages modules" className="text-terminal-muted">
                    <Lock size={14} />
                  </span>
                ) : (
                  <Switch
                    checked={enabled}
                    disabled={busyType === m.type}
                    onCheckedChange={() => void toggle(m.type, m.title, !enabled)}
                    aria-label={enabled ? `Disable ${m.title}` : `Enable ${m.title}`}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InstalledTab({ hasOperatorToken }: { hasOperatorToken: boolean }) {
  const [modules, setModules] = useState<InstalledModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Server truth: does THIS caller manage module lifecycle (verified SSO
  // admin/superuser)? Falls back to the operator token for self-hosted
  // local-session operators, for whom the server can only say `false`.
  const [canManage, setCanManage] = useState(false);
  const manageAllowed = canManage || hasOperatorToken;
  const loadErrors = useModuleLoadStore((s) => s.errors);
  // Per-user visibility state. Select the slices, not the whole store — see the
  // notification note below for why object subscriptions are avoided here.
  const hiddenModules = useUserModulesStore((s) => s.disabled);
  const visibilityBusyId = useUserModulesStore((s) => s.busyId);
  const setHidden = useUserModulesStore((s) => s.setEnabled);
  const hydrateVisibility = useUserModulesStore((s) => s.hydrate);
  // Select the actions, not the whole store: subscribing to the store object
  // makes every new notification a re-render + a fresh `notify` identity, which
  // re-runs the effects below — one failed request then loops forever.
  const showError = useNotificationStore((s) => s.showError);
  const showSuccess = useNotificationStore((s) => s.showSuccess);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await moduleFetch('/api/modules');
      if (!res.ok) throw new Error(`GET /api/modules -> ${res.status}`);
      const data = (await res.json()) as {
        modules?: InstalledModule[];
        viewer?: { canManage?: boolean };
      };
      setModules(data.modules ?? []);
      setCanManage(data.viewer?.canManage ?? false);
    } catch (err) {
      showError('Failed to load installed modules', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // main.tsx hydrates the hidden list at startup and on every SSO transition;
  // this is the same defensive re-read BuiltinSection does for built-ins.
  useEffect(() => {
    void hydrateVisibility();
  }, [hydrateVisibility]);

  /**
   * Per-user visibility (userModules.ts): hiding only unregisters the module's
   * widget types in THIS browser — the module keeps running for everyone. This
   * is deliberately NOT the /api/modules lifecycle route above, which is
   * admin-gated and changes the installation for every user.
   */
  const toggleVisibility = async (m: InstalledModule) => {
    const title = m.manifest.displayName || m.id;
    const wasHidden = useUserModulesStore.getState().isHidden(m.id);
    try {
      if (!wasHidden) {
        // Hide: setEnabled applies it locally (and rolls back on failure).
        await setHidden(m.id, false);
        return;
      }
      // Un-hide: persist, then re-register the widgets in this browser.
      await setHidden(m.id, true);
      await loadModules();
      // Race guard: a loadModules() already in flight when the un-hide landed
      // computed its load list while the module was still hidden, and the await
      // above returned that stale shared run — nothing got registered. One
      // fresh run now sees the module un-hidden. No loop: a module that
      // legitimately fails to register stays error-flagged, as on any load.
      if (
        m.manifest.frontend &&
        useWidgetRegistry.getState().typesByOwner(m.id).length === 0
      ) {
        await loadModules();
      }
      await refresh();
    } catch (err) {
      showError(
        `Failed to ${wasHidden ? 'show' : 'hide'} "${title}"`,
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const toggleEnabled = async (m: InstalledModule) => {
    setBusyId(m.id);
    try {
      const action = m.enabled ? 'disable' : 'enable';
      const res = await moduleFetch(`/api/modules/${m.id}/${action}`, withAdminToken({ method: 'POST' }));
      if (!res.ok) throw new Error(`${action} -> ${res.status}`);
      if (m.enabled) {
        // Just disabled — unregister its widget types so open widgets fall back
        // to the UnknownWidgetPlaceholder.
        unloadModule(m);
      } else {
        // Just enabled — (re)load and register its frontend bundle.
        await loadModules();
      }
      await refresh();
    } catch (err) {
      showError(`Failed to ${m.enabled ? 'disable' : 'enable'} "${m.id}"`, err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const uninstall = async (m: InstalledModule) => {
    setBusyId(m.id);
    try {
      const res = await moduleFetch(`/api/modules/${m.id}`, withAdminToken({ method: 'DELETE' }));
      if (!res.ok) throw new Error(`uninstall -> ${res.status}`);
      const data = (await res.json()) as { pendingRestart?: boolean };
      // Unregister its widget types so open widgets fall back to the placeholder.
      unloadModule(m);
      showSuccess(`Uninstalled "${m.id}"`, data.pendingRestart ? 'Restart the server to fully remove it.' : undefined);
      await refresh();
    } catch (err) {
      showError(`Failed to uninstall "${m.id}"`, err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading} className="text-terminal-muted">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <BuiltinSection />

      <div className="text-xs uppercase tracking-wide text-terminal-muted pt-3">Installed</div>
      {!loading && modules.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-terminal-muted text-sm">
          <Package size={24} />
          <div>No modules installed</div>
          <div className="text-xs">Find modules in the Browse tab.</div>
        </div>
      )}

      {modules.map((m) => {
        const clientError = loadErrors[m.id];
        const serverError = m.error;
        const title = m.manifest.displayName || m.id;
        const hidden = hiddenModules.includes(m.id);
        return (
          <div key={m.id} className="rounded-md border border-terminal-border bg-terminal-widget/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-terminal-text truncate">{m.manifest.displayName || m.id}</span>
                  <span className="text-xs text-terminal-muted">v{m.version}</span>
                  {m.dev && <Badge variant="secondary" className="text-[10px]">dev</Badge>}
                  {m.pendingRestart && <Badge variant="outline" className="text-[10px] text-yellow-500 border-yellow-500/40">restart pending</Badge>}
                </div>
                {m.manifest.description && (
                  <div className="text-xs text-terminal-muted mt-0.5 truncate">{m.manifest.description}</div>
                )}
                <PermissionBadges permissions={m.manifest.permissions ?? []} />
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {/* Per-user visibility — the one control EVERY user gets. The
                    eye icon + "for me" label keep it visually distinct from the
                    server-wide switch below, which only managers see. */}
                <div
                  className="flex items-center gap-1.5"
                  title="Per-user: hide this module's widgets from your own terminal. It keeps running for everyone else."
                >
                  {hidden ? (
                    <EyeOff size={14} className="text-terminal-muted shrink-0" aria-hidden="true" />
                  ) : (
                    <Eye size={14} className="text-terminal-muted shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-[10px] uppercase tracking-wide text-terminal-muted">for me</span>
                  <Switch
                    checked={!hidden}
                    disabled={visibilityBusyId === m.id}
                    onCheckedChange={() => void toggleVisibility(m)}
                    aria-label={`Show ${title} in my terminal`}
                  />
                </div>
                {/* Server-wide lifecycle — only for callers the server marked
                    canManage, or after entering an operator token. */}
                {manageAllowed && (
                  <div
                    className="flex items-center gap-2"
                    title="Server-wide: affects every user of this server."
                  >
                    <Switch
                      checked={m.enabled}
                      disabled={busyId === m.id}
                      onCheckedChange={() => void toggleEnabled(m)}
                      aria-label={`${m.enabled ? 'Disable' : 'Enable'} ${title} server-wide`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-terminal-muted hover:text-destructive"
                      disabled={busyId === m.id}
                      onClick={() => void uninstall(m)}
                      title="Uninstall"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {(serverError || clientError) && (
              <div className="mt-2 flex items-start gap-2 rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  {serverError && <div className="break-words">Backend: {serverError}</div>}
                  {clientError && <div className="break-words">Frontend: {clientError}</div>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Browse tab
// ---------------------------------------------------------------------------

function BrowseTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  // Installed packages by npm name, so the Browse rows can show Installed/Update
  // instead of a perpetually-offerable Install button. Keyed by npmName because
  // that is what search results carry; module id only appears on installed rows.
  const [installed, setInstalled] = useState<Record<string, InstalledModule>>({});
  // Select the actions, not the whole store: subscribing to the store object
  // makes every new notification a re-render + a fresh `notify` identity, which
  // re-runs the effects below — one failed request then loops forever.
  const showError = useNotificationStore((s) => s.showError);
  const showSuccess = useNotificationStore((s) => s.showSuccess);

  const refreshInstalled = useCallback(async () => {
    try {
      const res = await moduleFetch('/api/modules');
      if (!res.ok) throw new Error(`GET /api/modules -> ${res.status}`);
      const data = (await res.json()) as { modules?: InstalledModule[] };
      setInstalled(Object.fromEntries((data.modules ?? []).map((m) => [m.npmName, m])));
    } catch {
      // Browse stays fully functional without the marker — rows just show
      // Install again. No banner: the Installed tab surfaces real failures.
      setInstalled({});
    }
  }, []);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await moduleFetch(`/api/modules/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`search -> ${res.status}`);
      const data = (await res.json()) as { results?: SearchResult[]; error?: string };
      if (data.error) throw new Error(data.error);
      setResults(data.results ?? []);
    } catch (err) {
      showError('Module search failed', err instanceof Error ? err.message : String(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Initial unfiltered listing of available modules, plus the installed map
  // that decides Install vs Installed/Update per row.
  useEffect(() => {
    void search('');
    void refreshInstalled();
  }, [search, refreshInstalled]);

  const install = async (pkg: SearchResult) => {
    setInstalling(pkg.name);
    try {
      const res = await moduleFetch('/api/modules/install', withAdminToken({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pkg.name, version: pkg.version }),
      }));
      const data = (await res.json()) as { module?: InstalledModule; error?: string; details?: string };
      if (!res.ok || data.error) throw new Error(data.details || data.error || `install -> ${res.status}`);
      showSuccess(`Installed "${pkg.name}"`);
      // Load the newly installed module's frontend without a page reload.
      await loadModules();
      await refreshInstalled();
    } catch (err) {
      showError(`Failed to install "${pkg.name}"`, err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(null);
    }
  };

  // Registry version differs from the installed one — upgrade to latest. The
  // server always upgrades to its registry's latest (no version pinning on the
  // route), which is the right action whether the registry row is newer or
  // merely stale.
  const upgrade = async (pkg: SearchResult, id: string) => {
    setInstalling(pkg.name);
    try {
      const res = await moduleFetch(`/api/modules/${encodeURIComponent(id)}/upgrade`, withAdminToken({ method: 'POST' }));
      const data = (await res.json()) as { module?: InstalledModule; error?: string; details?: string };
      if (!res.ok || data.error) throw new Error(data.details || data.error || `upgrade -> ${res.status}`);
      showSuccess(`Updated "${pkg.name}"`);
      await loadModules();
      await refreshInstalled();
    } catch (err) {
      showError(`Failed to update "${pkg.name}"`, err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-terminal-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="pl-8 bg-terminal-widget/40 border-terminal-border text-terminal-text"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Search'}
        </Button>
      </form>

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-terminal-muted text-sm">
          <Package size={28} />
          <div>No modules found</div>
        </div>
      )}

      <div className="space-y-2">
        {results.map((pkg) => {
          const inst = installed[pkg.name];
          const upToDate = !!inst && inst.version === pkg.version;
          return (
            <div key={pkg.name} className="rounded-md border border-terminal-border bg-terminal-widget/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-terminal-text truncate">{pkg.name}</span>
                    <span className="text-xs text-terminal-muted">v{pkg.version}</span>
                  </div>
                  {pkg.description && <div className="text-xs text-terminal-muted mt-0.5">{pkg.description}</div>}
                </div>
                {upToDate ? (
                  <Button size="sm" variant="ghost" disabled className="shrink-0 text-terminal-muted">
                    <Check size={14} />
                    Installed
                  </Button>
                ) : inst ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={installing === pkg.name}
                    onClick={() => void upgrade(pkg, inst.id)}
                    className="shrink-0"
                  >
                    {installing === pkg.name ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    Update
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={installing === pkg.name}
                    onClick={() => void install(pkg)}
                    className="shrink-0"
                  >
                    {installing === pkg.name ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    Install
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget shell
// ---------------------------------------------------------------------------

const ModuleStoreWidget: React.FC = () => {
  const [adminToken, setAdminTokenState] = useState(getAdminToken());
  const [tokenOpen, setTokenOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-terminal-bg text-terminal-text">
      <Tabs defaultValue="browse" className="flex flex-col h-full">
        {/* Operator token as a collapsed disclosure: SSO admins never need it
            (the server authorizes their verified role), and for everyone else
            it is a one-time entry, not a fixture at the top of the store. */}
        <Collapsible open={tokenOpen} onOpenChange={setTokenOpen} className="mx-3 mt-2">
          <CollapsibleTrigger
            className="flex w-full items-center gap-1.5 text-xs text-terminal-muted hover:text-terminal-text"
            title="Only needed when the server does not grant you an admin role (e.g. self-hosted without SSO)."
          >
            <KeyRound size={12} className="shrink-0" />
            <span>Operator token{adminToken ? ' — saved' : ''}</span>
            <ChevronDown
              size={12}
              className={`ml-auto shrink-0 transition-transform ${tokenOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Input
              type="password"
              value={adminToken}
              onChange={(e) => {
                setAdminTokenState(e.target.value);
                setAdminToken(e.target.value);
              }}
              placeholder="Only needed without an admin role"
              autoComplete="off"
              className="mt-2 h-8 bg-terminal-widget/40 border-terminal-border text-terminal-text"
              title="Sent as X-Modules-Admin-Token. The server operator sets the same value in MODULES_ADMIN_TOKEN."
            />
          </CollapsibleContent>
        </Collapsible>
        <TabsList className="mx-3 mt-2 self-start">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1 px-3 py-2">
          <TabsContent value="browse" className="mt-0">
            <BrowseTab />
          </TabsContent>
          <TabsContent value="installed" className="mt-0">
            <InstalledTab hasOperatorToken={!!adminToken} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default ModuleStoreWidget;
