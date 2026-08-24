import React, { useCallback, useEffect, useState } from 'react';
import type { InstalledModule, ModulePermission } from '@profitmaker/module-sdk';
import { Search, RefreshCw, Trash2, AlertTriangle, Package, Download, Lock, KeyRound } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

import { moduleFetch } from './api';
import { getAdminToken, setAdminToken, withAdminToken } from './adminToken';
import { loadModules, unloadModule } from './loader';
import { useModuleLoadStore } from './loaderState';
import { useBuiltinModulesStore } from './builtinModules';
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

function InstalledTab() {
  const [modules, setModules] = useState<InstalledModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadErrors = useModuleLoadStore((s) => s.errors);
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
      const data = (await res.json()) as { modules?: InstalledModule[] };
      setModules(data.modules ?? []);
    } catch (err) {
      showError('Failed to load installed modules', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={m.enabled}
                  disabled={busyId === m.id}
                  onCheckedChange={() => void toggleEnabled(m)}
                  aria-label={m.enabled ? 'Disable module' : 'Enable module'}
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
  // Select the actions, not the whole store: subscribing to the store object
  // makes every new notification a re-render + a fresh `notify` identity, which
  // re-runs the effects below — one failed request then loops forever.
  const showError = useNotificationStore((s) => s.showError);
  const showSuccess = useNotificationStore((s) => s.showSuccess);

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

  // Initial unfiltered listing of available modules.
  useEffect(() => {
    void search('');
  }, [search]);

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
    } catch (err) {
      showError(`Failed to install "${pkg.name}"`, err instanceof Error ? err.message : String(err));
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
        {results.map((pkg) => (
          <div key={pkg.name} className="rounded-md border border-terminal-border bg-terminal-widget/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-terminal-text truncate">{pkg.name}</span>
                  <span className="text-xs text-terminal-muted">v{pkg.version}</span>
                </div>
                {pkg.description && <div className="text-xs text-terminal-muted mt-0.5">{pkg.description}</div>}
              </div>
              <Button
                size="sm"
                disabled={installing === pkg.name}
                onClick={() => void install(pkg)}
                className="shrink-0"
              >
                {installing === pkg.name ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                Install
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget shell
// ---------------------------------------------------------------------------

const ModuleStoreWidget: React.FC = () => {
  const [adminToken, setAdminTokenState] = useState(getAdminToken());

  return (
    <div className="flex flex-col h-full bg-terminal-bg text-terminal-text">
      <Tabs defaultValue="browse" className="flex flex-col h-full">
        <div className="mx-3 mt-2 flex items-center gap-2">
          <KeyRound size={14} className="shrink-0 text-terminal-muted" />
          <Input
            type="password"
            value={adminToken}
            onChange={(e) => {
              setAdminTokenState(e.target.value);
              setAdminToken(e.target.value);
            }}
            placeholder="Operator token — required to install or remove modules"
            autoComplete="off"
            className="h-8 bg-terminal-widget/40 border-terminal-border text-terminal-text"
            title="Sent as X-Modules-Admin-Token. The server operator sets the same value in MODULES_ADMIN_TOKEN."
          />
        </div>
        <TabsList className="mx-3 mt-2 self-start">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1 px-3 py-2">
          <TabsContent value="browse" className="mt-0">
            <BrowseTab />
          </TabsContent>
          <TabsContent value="installed" className="mt-0">
            <InstalledTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default ModuleStoreWidget;
