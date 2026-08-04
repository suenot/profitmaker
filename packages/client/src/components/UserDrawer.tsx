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
import { Avatar, AvatarFallback } from './ui/avatar';
import { SearchableSelect } from './ui/SearchableSelect';
import { Plus, Trash2, Check, Loader2, LogIn, Share2, ShieldAlert, ShieldCheck, Eye, Pencil } from 'lucide-react';

interface UserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Identity + accounts panel over the central-accounts model.
 *
 * "Identities" are the connected ecosystem SSO sessions (multi-login): switch,
 * add, or remove them. Under the ACTIVE identity we list exchange accounts from
 * the server proxy (GET /api/accounts) — own + shared — with badges. Adding an
 * account POSTs the keys to the server (→ auth); nothing sensitive is stored in
 * the browser. Owned accounts can be shared by email + access level.
 */
const UserDrawer: React.FC<UserDrawerProps> = ({ open, onOpenChange }) => {
  const { sessions, activeSessionId, status } = useSsoStore();
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loading = useAccountStore((s) => s.loading);
  const error = useAccountStore((s) => s.error);
  const users = useUserStore((s) => s.users);

  const activeUser = users.find((u) => u.id === (activeSessionId ?? sessions[0]?.id));

  const [addingAccount, setAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ExchangeAccount | null>(null);
  const [shareFor, setShareFor] = useState<ExchangeAccount | null>(null);

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
          {/* Identities (SSO sessions) */}
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
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-terminal-muted uppercase tracking-wide">Identities</div>
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border border-terminal-border/50 ${isActive ? 'bg-terminal-accent/30' : ''}`}
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarFallback>{(s.user.email || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.user.username || s.user.email}</div>
                        <div className="text-xs text-terminal-muted truncate">{s.user.email}</div>
                      </div>
                      {s.expiresAt !== undefined && s.expiresAt <= Date.now() && (
                        <button
                          onClick={login}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-negative/20 text-terminal-negative border border-terminal-negative/40"
                          title="Session expired — click to re-login"
                        >
                          stale · re-login
                        </button>
                      )}
                      <Button
                        size="icon"
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => switchSession(s.id)}
                        title="Make active"
                      >
                        {isActive ? <Check size={16} /> : <span className="w-4 h-4 rounded-full border border-terminal-border" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => dropSession(s.id)}
                        title="Remove identity"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                })}
                <Button onClick={addLogin} className="w-full" variant="outline">
                  <Plus className="mr-2" size={16} /> Add login
                </Button>
              </div>

              {/* Active identity's central accounts */}
              {activeUser && (
                <AccountsBlock
                  accounts={activeUser.accounts}
                  loading={loading}
                  error={error}
                  status={status}
                  onRetry={() => void loadAccounts()}
                  onAddAccount={() => setAddingAccount(true)}
                  onEdit={(acc) => setEditingAccount(acc)}
                  onShare={(acc) => setShareFor(acc)}
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

      {addingAccount && <AccountSheet onClose={() => setAddingAccount(false)} />}
      {editingAccount && <AccountSheet account={editingAccount} onClose={() => setEditingAccount(null)} />}
      {shareFor && <ShareAccountSheet account={shareFor} onClose={() => setShareFor(null)} />}
    </Sheet>
  );
};

// --- central accounts list -------------------------------------------------

const AccountBadges: React.FC<{ account: ExchangeAccount }> = ({ account }) => {
  const shared = !!account.shared;
  const readOnly = account.read_only || account.access_level === 'read';
  return (
    <div className="flex items-center gap-1">
      {shared ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30" title="Shared with you">
          shared
        </span>
      ) : (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-accent/40 text-terminal-text border border-terminal-border/40" title="You own this account">
          owner
        </span>
      )}
      {readOnly ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 inline-flex items-center gap-0.5" title="Read-only access">
          <Eye size={10} /> read
        </span>
      ) : (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 border border-green-500/30 inline-flex items-center gap-0.5" title="Trade access">
          <ShieldCheck size={10} /> trade
        </span>
      )}
    </div>
  );
};

const AccountsBlock: React.FC<{
  accounts: ExchangeAccount[];
  loading: boolean;
  error: string | null;
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  onRetry: () => void;
  onAddAccount: () => void;
  onEdit: (acc: ExchangeAccount) => void;
  onShare: (acc: ExchangeAccount) => void;
}> = ({ accounts, loading, error, status, onRetry, onAddAccount, onEdit, onShare }) => {
  const removeAccount = useAccountStore((s) => s.removeAccount);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Exchange accounts</div>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-terminal-muted" />}
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

      {!loading && !error && accounts.length === 0 && (
        <div className="text-sm text-terminal-muted mb-2">No accounts yet for this identity.</div>
      )}

      {accounts.map((acc) => {
        const owner = !acc.shared;
        const accountLabel = acc.label || acc.id.slice(0, 8);
        return (
          <div key={acc.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 p-2 rounded border border-terminal-border/30 bg-terminal-accent/10 mb-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-mono px-1 py-0.5 rounded bg-terminal-widget/80 border border-terminal-border/30">{acc.exchange}</span>
              <span className="min-w-0 truncate text-xs" title={accountLabel}>{accountLabel}</span>
            </div>
            {owner && (
              <div className="row-span-2 flex shrink-0 items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onEdit(acc)} title="Edit account">
                  <Pencil size={14} />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onShare(acc)} title="Share account">
                  <Share2 size={14} />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => void removeAccount(acc.id)} title="Remove account">
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
            {owner && (
              <div className="min-w-0">
                <AccountBadges account={acc} />
              </div>
            )}
            {!owner && <AccountBadges account={acc} />}
          </div>
        );
      })}

      <Button
        onClick={onAddAccount}
        className="w-full mt-2"
        variant="outline"
        disabled={status !== 'authenticated'}
      >
        <Plus className="mr-2" size={16} /> Add account
      </Button>
    </div>
  );
};

// --- add/edit account (write-only keys; no client-side storage) -------------

const AccountSheet: React.FC<{ account?: ExchangeAccount; onClose: () => void }> = ({ account, onClose }) => {
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
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit account' : 'Add account'}</SheetTitle>
          <SheetDescription>
            {editing
              ? 'Update account details or rotate credentials. Existing keys are never shown; leave key fields blank to keep them.'
              : 'Keys are sent to your terminal server and stored encrypted in the central account service — never in this browser.'}
          </SheetDescription>
        </SheetHeader>
        <form className="flex flex-col gap-3 mt-3 flex-1" onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
          <div className="space-y-2">
            <label className="text-xs font-medium">Exchange *</label>
            <SearchableSelect
              value={exchange}
              onValueChange={setExchange}
              options={exchanges.map((ex) => ex.id)}
              optionLabels={exchanges.reduce((labels, ex) => ({ ...labels, [ex.id]: ex.name }), {})}
              placeholder={loadingExchanges ? 'Loading exchanges...' : 'Select exchange'}
              searchPlaceholder="Search exchanges (e.g., binance, bybit, okx)..."
              loading={loadingExchanges}
              disabled={loadingExchanges || editing}
              className="w-full"
            />
          </div>
          <Input placeholder="Label (optional, e.g. 'Main spot')" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full" />
          {editing && account.api_key_suffix && (
            <div className="rounded-md border border-terminal-border/60 bg-terminal-accent/10 px-3 py-2 text-xs text-terminal-muted">
              Current API key ends in <span className="font-mono text-terminal-text">••••{account.api_key_suffix}</span>
            </div>
          )}
          <Input placeholder={editing ? 'New API Key (leave blank to keep current)' : 'API Key *'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full" autoComplete="off" />
          <Input placeholder={editing ? 'New secret (leave blank to keep current)' : 'Secret *'} type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full" autoComplete="off" />
          <Input placeholder={editing ? 'New passphrase (leave blank to keep current)' : 'Passphrase (optional, required for some exchanges like BitGet)'} type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="w-full" autoComplete="off" />
          <label className="flex items-center gap-2 text-xs text-terminal-muted">
            <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
            Read-only account (server will never trade with it)
          </label>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <div className="flex gap-2 mt-2">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? 'Save' : 'Add')}
            </Button>
            <Button type="button" className="flex-1" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

// --- share account (grants) ------------------------------------------------

const ShareAccountSheet: React.FC<{ account: ExchangeAccount; onClose: () => void }> = ({ account, onClose }) => {
  const listGrants = useAccountStore((s) => s.listGrants);
  const shareAccount = useAccountStore((s) => s.shareAccount);
  const revokeGrant = useAccountStore((s) => s.revokeGrant);

  const [grants, setGrants] = useState<AccountGrant[]>([]);
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
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
        <SheetHeader>
          <SheetTitle>Share {account.exchange} account</SheetTitle>
          <SheetDescription>{account.label || account.id}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 mt-3 flex-1 overflow-auto">
          <Input placeholder="Grantee email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLevel('read')}
              className={`flex-1 text-xs px-2 py-1.5 rounded border inline-flex items-center justify-center gap-1 ${level === 'read' ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/40' : 'border-terminal-border/40 text-terminal-muted'}`}
            >
              <Eye size={12} /> read
            </button>
            <button
              type="button"
              onClick={() => setLevel('trade')}
              className={`flex-1 text-xs px-2 py-1.5 rounded border inline-flex items-center justify-center gap-1 ${level === 'trade' ? 'bg-green-500/15 text-green-500 border-green-500/40' : 'border-terminal-border/40 text-terminal-muted'}`}
            >
              <ShieldCheck size={12} /> trade
            </button>
          </div>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <Button onClick={() => void handleShare()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Share2 className="mr-2" size={14} /> Share</>)}
          </Button>

          <div className="mt-2">
            <div className="text-xs font-semibold text-terminal-muted uppercase tracking-wide mb-1">Current grants</div>
            {grants.length === 0 && <div className="text-sm text-terminal-muted">Not shared with anyone.</div>}
            {grants.map((g) => (
              <div key={g.id} className="flex items-center gap-2 p-1.5 rounded border border-terminal-border/30 mb-1">
                <span className="truncate text-xs flex-1">{g.grantee_email || g.grantee_user_id}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${g.access_level === 'trade' ? 'bg-green-500/15 text-green-500 border-green-500/30' : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'}`}>
                  {g.access_level}
                </span>
                <Button size="icon" variant="outline" onClick={async () => { await revokeGrant(account.id, g.id); await refresh(); }} title="Revoke">
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
