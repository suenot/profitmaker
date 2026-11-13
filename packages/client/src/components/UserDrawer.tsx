import React, { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useAccountStore, type ExchangeAccount, type AccountGrant } from '@/store/accountStore';
import { useSsoStore, login, addLogin, switchSession, dropSession } from '@/services/ssoClient';
import { useExchangesList } from '@/hooks/useExchangesList';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
  SheetDescription,
} from './ui/sheet';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { SearchableSelect } from './ui/SearchableSelect';
import {
  AlertTriangle, Check, Clock, Eye, Landmark, Loader2, LogIn, Pencil, Plus, Share2, ShieldAlert, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';

interface UserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Identity + accounts panel over the central-accounts model.
 *
 * "Identities" are the connected ecosystem SSO sessions (multi-login): click a
 * row to make it active, add or remove them. Under the ACTIVE identity we list
 * exchange accounts from the server proxy (GET /api/accounts), own + shared,
 * with badges. Adding, editing and sharing happen inline in the list, and
 * deleting asks for confirmation in place. Keys are POSTed to the server
 * (→ auth); nothing sensitive is stored in the browser.
 */
const UserDrawer: React.FC<UserDrawerProps> = ({ open, onOpenChange }) => {
  const { sessions, activeSessionId, status } = useSsoStore();
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loading = useAccountStore((s) => s.loading);
  const error = useAccountStore((s) => s.error);
  const users = useUserStore((s) => s.users);

  const activeUser = users.find((u) => u.id === (activeSessionId ?? sessions[0]?.id));

  // Load the active identity's accounts whenever the drawer opens / identity changes.
  useEffect(() => {
    if (open && activeSessionId) void loadAccounts();
  }, [open, activeSessionId, loadAccounts]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
        <SheetHeader>
          <SheetTitle>Accounts</SheetTitle>
          <SheetDescription>Connected identities and their exchange accounts</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-2 flex-1 overflow-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="text-lg font-semibold">No identity connected</div>
              <div className="text-terminal-muted text-sm">
                Sign in with your MarketMaker account to manage exchange accounts.
              </div>
              <Button onClick={login} className="w-full max-w-xs" variant="outline">
                <LogIn className="mr-2" size={16} /> Login with MarketMaker
              </Button>
            </div>
          ) : (
            <>
              {/* Identities (SSO sessions) */}
              <div className="flex flex-col gap-0.5">
                <div className="text-xs font-semibold text-terminal-muted uppercase tracking-wide mb-1">Identities</div>
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  const stale = s.expiresAt !== undefined && s.expiresAt <= Date.now();
                  return (
                    <div
                      key={s.id}
                      className={`group flex items-center gap-1 rounded ${isActive ? 'bg-terminal-accent/30' : 'hover:bg-terminal-accent/20'}`}
                    >
                      <button
                        onClick={() => (stale ? addLogin() : switchSession(s.id))}
                        className="flex flex-1 min-w-0 items-center gap-2 p-2 text-left"
                        title={stale ? 'Session expired: sign in again' : isActive ? 'Active identity' : 'Make active'}
                      >
                        <Avatar className="w-8 h-8 shrink-0">
                          {s.user.avatarUrl ? <AvatarImage src={s.user.avatarUrl} alt={s.user.email} /> : null}
                          <AvatarFallback className="text-xs">{(s.user.email || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{s.user.username || s.user.email}</div>
                          <div className="text-xs text-terminal-muted truncate">
                            {stale ? (
                              <span className="inline-flex items-center gap-1 text-terminal-negative">
                                <AlertTriangle size={10} /> Session expired, click to sign in
                              </span>
                            ) : (
                              s.user.email
                            )}
                          </div>
                        </div>
                        {isActive && <Check size={16} className="shrink-0 text-terminal-positive" />}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 mr-1 shrink-0 text-terminal-muted hover:text-terminal-negative"
                        onClick={() => dropSession(s.id)}
                        title="Remove identity from this terminal"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  );
                })}
                <button
                  onClick={addLogin}
                  className="flex items-center gap-2 p-2 rounded text-sm text-terminal-muted hover:bg-terminal-accent/20 hover:text-terminal-text"
                >
                  <span className="w-8 h-8 shrink-0 rounded-full border border-dashed border-terminal-border flex items-center justify-center">
                    <Plus size={14} />
                  </span>
                  Add login
                </button>
              </div>

              {/* Active identity's central accounts */}
              {activeUser && (
                <AccountsBlock
                  accounts={activeUser.accounts}
                  loading={loading}
                  error={error}
                  status={status}
                  onRetry={() => void loadAccounts()}
                />
              )}

              <LegacyMigrationBanner />
            </>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// --- central accounts list -------------------------------------------------

const Badge: React.FC<{ className: string; title: string; children: React.ReactNode }> = ({ className, title, children }) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 ${className}`} title={title}>
    {children}
  </span>
);

const LevelBadge: React.FC<{ level: 'read' | 'trade' }> = ({ level }) =>
  level === 'read' ? (
    <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30" title="Read-only access">
      <Eye size={10} /> read
    </Badge>
  ) : (
    <Badge className="bg-green-500/15 text-green-500 border-green-500/30" title="Trade access">
      <ShieldCheck size={10} /> trade
    </Badge>
  );

const AccountBadges: React.FC<{ account: ExchangeAccount }> = ({ account }) => {
  const readOnly = account.read_only || account.access_level === 'read';
  return (
    <div className="flex flex-wrap items-center gap-1">
      {account.shared ? (
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30" title="Shared with you">
          <Users size={10} /> shared
        </Badge>
      ) : (
        <Badge className="bg-terminal-accent/40 text-terminal-text border-terminal-border/40" title="You own this account">
          owner
        </Badge>
      )}
      <LevelBadge level={readOnly ? 'read' : 'trade'} />
      {account.has_ro_keys && (
        <Badge className="bg-terminal-accent/40 text-terminal-muted border-terminal-border/40" title="Has a separate read-only key pair">
          RO keys
        </Badge>
      )}
    </div>
  );
};

const formatDate = (d?: string) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AccountsBlock: React.FC<{
  accounts: ExchangeAccount[];
  loading: boolean;
  error: string | null;
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  onRetry: () => void;
}> = ({ accounts, loading, error, status, onRetry }) => {
  const [adding, setAdding] = useState(false);
  const canAdd = status === 'authenticated';

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="font-semibold">Exchange accounts</div>
        {accounts.length > 0 && <span className="text-xs text-terminal-muted">{accounts.length}</span>}
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-terminal-muted" />}
        {!adding && accounts.length > 0 && (
          <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={() => setAdding(true)} disabled={!canAdd}>
            <Plus className="mr-1" size={14} /> Add
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 text-xs text-terminal-negative bg-terminal-negative/10 border border-terminal-negative/30 rounded px-2 py-1.5 mb-2">
          <div>
            <div className="font-medium">Could not load accounts. Your saved accounts were not changed.</div>
            <div className="mt-0.5 opacity-80">{error}</div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded border border-terminal-negative/40 px-2 py-1 font-medium hover:bg-terminal-negative/10 disabled:opacity-50"
            onClick={onRetry}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      )}

      {adding && <AccountForm onClose={() => setAdding(false)} />}

      {!loading && !error && accounts.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Landmark size={28} className="text-terminal-muted opacity-50" />
          <div className="text-sm text-terminal-muted">
            No exchange accounts yet. Keys are stored encrypted on the server, never in this browser.
          </div>
          <Button onClick={() => setAdding(true)} className="mt-1 w-full" variant="outline" disabled={!canAdd}>
            <Plus className="mr-2" size={16} /> Add exchange account
          </Button>
        </div>
      )}

      {accounts.map((acc) => <AccountRow key={acc.id} account={acc} />)}
    </div>
  );
};

type RowMode = 'view' | 'edit' | 'share' | 'delete';

const AccountRow: React.FC<{ account: ExchangeAccount }> = ({ account }) => {
  const removeAccount = useAccountStore((s) => s.removeAccount);
  const [mode, setMode] = useState<RowMode>('view');
  const [busy, setBusy] = useState(false);
  const owner = !account.shared;
  const accountLabel = account.label || account.id.slice(0, 8);
  const added = formatDate(account.created_at);

  if (mode === 'edit') return <AccountForm account={account} onClose={() => setMode('view')} />;

  const handleDelete = async () => {
    setBusy(true);
    const ok = await removeAccount(account.id);
    setBusy(false);
    if (!ok) setMode('view');
  };

  const toggle = (m: RowMode) => setMode((cur) => (cur === m ? 'view' : m));

  return (
    <div className="p-2 rounded border border-terminal-border/30 bg-terminal-accent/10 mb-1">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-xs font-mono font-semibold">{account.exchange}</span>
            <span className="min-w-0 truncate text-xs text-terminal-muted" title={accountLabel}>/ {accountLabel}</span>
          </div>
          <div className="mt-1.5">
            <AccountBadges account={account} />
          </div>
          {added && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-terminal-muted">
              <Clock size={10} /> Added {added}
            </div>
          )}
        </div>

        {owner && mode !== 'delete' && (
          <div className="flex shrink-0 items-center">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-terminal-muted hover:text-terminal-text" onClick={() => setMode('edit')} title="Edit account">
              <Pencil size={14} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 hover:text-terminal-text ${mode === 'share' ? 'text-terminal-text bg-terminal-accent/40' : 'text-terminal-muted'}`}
              onClick={() => toggle('share')}
              title="Share access"
            >
              <Share2 size={14} />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-terminal-muted hover:text-terminal-negative" onClick={() => setMode('delete')} title="Delete account">
              <Trash2 size={14} />
            </Button>
          </div>
        )}

        {owner && mode === 'delete' && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => void handleDelete()} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMode('view')} disabled={busy}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {mode === 'share' && owner && <SharePanel account={account} />}
    </div>
  );
};

// --- add/edit account inline (write-only keys; no client-side storage) ------

const AccountForm: React.FC<{ account?: ExchangeAccount; onClose: () => void }> = ({ account, onClose }) => {
  const addAccount = useAccountStore((s) => s.addAccount);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const { exchanges, loading: loadingExchanges } = useExchangesList();
  const editing = account !== undefined;
  const [exchange, setExchange] = useState(account?.exchange ?? '');
  const [label, setLabel] = useState(account?.label ?? '');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [readOnly, setReadOnly] = useState(account?.read_only ?? false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!exchange) {
      setError('Exchange is required');
      return;
    }
    if (!editing && (!apiKey.trim() || !apiSecret.trim())) {
      setError('API key and secret are required');
      return;
    }
    if (editing && Boolean(apiKey.trim()) !== Boolean(apiSecret.trim())) {
      setError('Enter both a new API key and secret, or leave both blank');
      return;
    }
    setSaving(true);
    setError('');
    const saved = editing
      ? await updateAccount(account.id, {
          label: label.trim() || 'default',
          read_only: readOnly,
          ...(apiKey.trim() && apiSecret.trim() ? {
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim(),
          } : {}),
          ...(passphrase.trim() ? { passphrase: passphrase.trim() } : {}),
        })
      : await addAccount({
          exchange,
          label: label.trim() || undefined,
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim(),
          passphrase: passphrase.trim() || undefined,
          read_only: readOnly,
        });
    setSaving(false);
    if (saved) {
      onClose();
    } else {
      setError(useAccountStore.getState().error || `Failed to ${editing ? 'update' : 'add'} account`);
    }
  };

  return (
    <form
      className="flex flex-col gap-2 p-2 rounded border border-terminal-border bg-terminal-accent/10 mb-1"
      onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
      onKeyDown={(e) => { if (e.key === 'Escape' && !saving) { e.stopPropagation(); onClose(); } }}
    >
      <div className="text-xs font-semibold">{editing ? `Edit ${account.exchange} account` : 'Add exchange account'}</div>
      <SearchableSelect
        value={exchange}
        onValueChange={setExchange}
        options={exchanges.map((ex) => ex.id)}
        optionLabels={exchanges.reduce((labels, ex) => ({ ...labels, [ex.id]: ex.name }), {})}
        placeholder={loadingExchanges ? 'Loading exchanges...' : 'Select exchange *'}
        searchPlaceholder="Search exchanges (e.g., binance, bybit, okx)..."
        loading={loadingExchanges}
        disabled={loadingExchanges || editing}
        className="w-full"
      />
      <Input placeholder="Label (optional, e.g. 'Main spot')" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full" autoFocus={editing} />
      {editing && account.api_key_suffix && (
        <div className="text-xs text-terminal-muted">
          Current API key ends in <span className="font-mono text-terminal-text">••••{account.api_key_suffix}</span>. Leave the key fields blank to keep it.
        </div>
      )}
      <Input placeholder={editing ? 'New API key' : 'API key *'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full font-mono" autoComplete="off" />
      <Input placeholder={editing ? 'New secret' : 'Secret *'} type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full font-mono" autoComplete="off" />
      <Input placeholder={editing ? 'New passphrase' : 'Passphrase (only some exchanges need it)'} type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="w-full font-mono" autoComplete="off" />
      <label className="flex items-center gap-2 text-xs text-terminal-muted">
        <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
        Read-only account (server will never trade with it)
      </label>
      {!editing && (
        <div className="text-[10px] text-terminal-muted">
          Keys go to your terminal server and are stored encrypted in the central account service, never in this browser.
        </div>
      )}
      {error && <div className="text-terminal-negative text-xs">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? 'Save' : 'Add account')}
        </Button>
        <Button type="button" size="sm" className="flex-1" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
};

// --- share account inline (grants) -----------------------------------------

const SharePanel: React.FC<{ account: ExchangeAccount }> = ({ account }) => {
  const listGrants = useAccountStore((s) => s.listGrants);
  const shareAccount = useAccountStore((s) => s.shareAccount);
  const revokeGrant = useAccountStore((s) => s.revokeGrant);

  const [grants, setGrants] = useState<AccountGrant[] | null>(null);
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState<'read' | 'trade'>('read');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = React.useCallback(async () => {
    setGrants(await listGrants(account.id));
  }, [listGrants, account.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleShare = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    setError('');
    const grant = await shareAccount(account.id, email.trim(), level);
    setBusy(false);
    if (grant) {
      setEmail('');
      await refresh();
    } else {
      setError(useAccountStore.getState().error || 'Failed to share');
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-terminal-border/40 flex flex-col gap-1.5">
      <div className="text-xs font-semibold flex items-center gap-1"><Users size={12} /> Shared access</div>
      {grants === null ? (
        <div className="flex items-center gap-1 text-xs text-terminal-muted"><Loader2 size={12} className="animate-spin" /> Loading…</div>
      ) : grants.length === 0 ? (
        <div className="text-xs text-terminal-muted">Not shared with anyone yet.</div>
      ) : (
        grants.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <span className="truncate text-xs flex-1">{g.grantee_email || g.grantee_user_id}</span>
            <LevelBadge level={g.access_level === 'trade' ? 'trade' : 'read'} />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-terminal-muted hover:text-terminal-negative"
              onClick={async () => { await revokeGrant(account.id, g.id); await refresh(); }}
              title="Revoke"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        ))
      )}
      <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); void handleShare(); }}>
        <Input type="email" placeholder="Grantee email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 flex-1 text-xs" autoComplete="off" />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as 'read' | 'trade')}
          className="h-8 rounded-md border border-input bg-background px-1 text-xs"
          aria-label="Access level"
        >
          <option value="read">read</option>
          <option value="trade">trade</option>
        </select>
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Share'}
        </Button>
      </form>
      {account.read_only && level === 'trade' && (
        <div className="text-[10px] text-terminal-muted">This account is read-only, so a trade grant still allows only reading.</div>
      )}
      {error && <div className="text-terminal-negative text-xs">{error}</div>}
    </div>
  );
};

// --- one-time legacy localStorage migration --------------------------------

const LegacyMigrationBanner: React.FC = () => {
  const hasLegacy = useAccountStore((s) => s.hasLegacyLocalAccounts);
  const migrate = useAccountStore((s) => s.migrateLegacyLocalAccounts);
  const purge = useAccountStore((s) => s.purgeLegacyLocalAccounts);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => { setShow(hasLegacy()); }, [hasLegacy]);

  if (!show) return null;

  const handleMigrate = async () => {
    setBusy(true);
    const { migrated, failed } = await migrate();
    purge();
    await loadAccounts();
    setBusy(false);
    setResult(`Migrated ${migrated} account(s)${failed ? `, ${failed} failed` : ''}. Local secrets purged.`);
    setShow(false);
  };

  const handleDismiss = () => {
    // Purge without uploading — removes plaintext secrets from this browser.
    purge();
    setShow(false);
  };

  return (
    <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs space-y-2">
      <div className="flex items-center gap-1.5 font-semibold text-yellow-500">
        <ShieldAlert size={14} /> Legacy local accounts found
      </div>
      <p className="text-terminal-muted">
        This browser has exchange keys stored locally. Push them to the central account service (encrypted, server-side)
        and remove them from this browser.
      </p>
      {result && <p className="text-green-500">{result}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void handleMigrate()} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Migrate & purge'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDismiss} disabled={busy}>
          Discard local
        </Button>
      </div>
    </div>
  );
};

export default UserDrawer;
