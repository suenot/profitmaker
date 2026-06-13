import { create } from 'zustand';
import { z } from 'zod';
import { moduleFetch } from '../modules/api';
import {
  useSessionStore,
  getActiveSession,
  isSessionStale,
  type SsoSession,
} from '../services/sessionManager';

/**
 * Central-accounts store (formerly the localStorage `userStore`).
 *
 * The "identities" listed here are the connected ecosystem SSO sessions
 * (multi-login). Under the ACTIVE identity we list exchange accounts fetched
 * from the profitmaker server proxy `GET /api/accounts` — both OWNED accounts
 * and accounts SHARED to this identity, with access-level metadata.
 *
 * Secrets NEVER live in the browser. Adding an account POSTs the keys to the
 * server proxy (which forwards to auth.marketmaker.cc, where they're encrypted);
 * on success we keep only the returned metadata (id/exchange/label/read_only/…).
 * The legacy in-browser AES path is gone — see `migrateLegacyLocalAccounts` for
 * the one-time import that pushes any old localStorage accounts up to auth.
 *
 * Shape compatibility: this store still exposes `users` / `activeUserId` /
 * `ExchangeAccount` so the existing read-only consumers (widgets, selectors)
 * keep compiling. Each identity's `accounts` are central-account metadata; the
 * old `key`/`privateKey`/`password` fields exist on the type but are never
 * populated for central accounts.
 */

const ACCOUNTS_PATH = '/api/accounts';
const LEGACY_USER_STORE_KEY = 'user-store';

// --- types -----------------------------------------------------------------

/** Server-proxy account metadata (mirrors auth's GET /me/exchanges items). */
export const ExchangeAccountSchema = z.object({
  id: z.string(), // credential id (uuid) — used as group.account
  exchange: z.string(),
  label: z.string().optional(),
  read_only: z.boolean().optional(),
  has_ro_keys: z.boolean().optional(),
  owner_user_id: z.string().optional(),
  access_level: z.enum(['read', 'trade']).optional(),
  shared: z.boolean().optional(),
  created_at: z.string().optional(),

  // --- legacy fields kept for backward-compat with existing consumers --------
  // Never populated for central accounts (secrets live server-side). Present so
  // widget/selector code that references them still typechecks.
  key: z.string().optional(),
  privateKey: z.string().optional(),
  password: z.string().optional(),
  uid: z.string().optional(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  notes: z.string().optional(),
});
export type ExchangeAccount = z.infer<typeof ExchangeAccountSchema>;

/** An identity = a connected SSO session, with its central accounts attached. */
export interface User {
  id: string; // session id (ecosystem user id)
  email: string;
  name?: string;
  avatarUrl?: string;
  notes?: string;
  accounts: ExchangeAccount[];
  /** This identity's session is expired (JWT past exp) → needs re-login. */
  stale?: boolean;
}

/** A grant row for the Share UI. */
export interface AccountGrant {
  id: string;
  grantee_user_id?: string;
  grantee_email?: string;
  access_level: 'read' | 'trade';
  created_at?: string;
}

export interface AddAccountInput {
  exchange: string;
  label?: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
  read_only?: boolean;
  api_key_ro?: string;
  api_secret_ro?: string;
  passphrase_ro?: string;
}

interface AccountStore {
  /** Accounts for the active identity, keyed by session id. */
  accountsBySession: Record<string, ExchangeAccount[]>;
  loading: boolean;
  error: string | null;

  // Identity actions (delegate to the multi-login session manager).
  setActiveUser: (sessionId: string) => void;

  // Central-account actions (active identity).
  loadAccounts: () => Promise<void>;
  addAccount: (input: AddAccountInput) => Promise<ExchangeAccount | null>;
  removeAccount: (accountId: string) => Promise<boolean>;

  // Sharing.
  listGrants: (accountId: string) => Promise<AccountGrant[]>;
  shareAccount: (accountId: string, granteeEmail: string, accessLevel: 'read' | 'trade') => Promise<AccountGrant | null>;
  revokeGrant: (accountId: string, grantId: string) => Promise<boolean>;

  // One-time migration of legacy localStorage accounts up to auth.
  hasLegacyLocalAccounts: () => boolean;
  migrateLegacyLocalAccounts: () => Promise<{ migrated: number; failed: number }>;
  purgeLegacyLocalAccounts: () => void;
}

// --- helpers ---------------------------------------------------------------

/** Build the identity list from the connected sessions + their loaded accounts. */
export function buildUsers(
  sessions: SsoSession[],
  accountsBySession: Record<string, ExchangeAccount[]>,
): User[] {
  return sessions.map((s) => ({
    id: s.id,
    email: s.user.email,
    name: s.user.username ?? undefined,
    accounts: accountsBySession[s.id] ?? [],
    stale: isSessionStale(s),
  }));
}

async function readJsonError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return (body && (body.error || body.message)) || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

// --- store -----------------------------------------------------------------

export const useAccountStore = create<AccountStore>((set, get) => ({
  accountsBySession: {},
  loading: false,
  error: null,

  setActiveUser: (sessionId: string) => {
    // Switching identity is owned by the session manager; importing it here
    // would create a cycle, so we drive it through its store directly.
    const { sessions } = useSessionStore.getState();
    if (!sessions.some((s) => s.id === sessionId)) return;
    useSessionStore.setState({ activeSessionId: sessionId });
    // Refresh accounts for the newly active identity.
    void get().loadAccounts();
  },

  loadAccounts: async () => {
    const active = getActiveSession();
    if (!active || isSessionStale(active)) {
      set({ error: active ? 'Session expired — please re-login' : null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await moduleFetch(ACCOUNTS_PATH, { method: 'GET' });
      if (!res.ok) {
        set({ loading: false, error: await readJsonError(res) });
        return;
      }
      const raw = await res.json();
      const items = Array.isArray(raw) ? raw : raw?.accounts ?? [];
      const parsed: ExchangeAccount[] = [];
      for (const item of items) {
        const r = ExchangeAccountSchema.safeParse(item);
        if (r.success) parsed.push(r.data);
      }
      set((state) => ({
        loading: false,
        error: null,
        accountsBySession: { ...state.accountsBySession, [active.id]: parsed },
      }));
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load accounts' });
    }
  },

  addAccount: async (input: AddAccountInput) => {
    const active = getActiveSession();
    if (!active) {
      set({ error: 'Not logged in' });
      return null;
    }
    set({ error: null });
    try {
      const res = await moduleFetch(ACCOUNTS_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        set({ error: await readJsonError(res) });
        return null;
      }
      const created = ExchangeAccountSchema.parse(await res.json());
      set((state) => ({
        accountsBySession: {
          ...state.accountsBySession,
          [active.id]: [...(state.accountsBySession[active.id] ?? []), created],
        },
      }));
      return created;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to add account' });
      return null;
    }
  },

  removeAccount: async (accountId: string) => {
    const active = getActiveSession();
    if (!active) return false;
    set({ error: null });
    try {
      const res = await moduleFetch(`${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        set({ error: await readJsonError(res) });
        return false;
      }
      set((state) => ({
        accountsBySession: {
          ...state.accountsBySession,
          [active.id]: (state.accountsBySession[active.id] ?? []).filter((a) => a.id !== accountId),
        },
      }));
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to remove account' });
      return false;
    }
  },

  listGrants: async (accountId: string) => {
    try {
      const res = await moduleFetch(`${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}/grants`, {
        method: 'GET',
      });
      if (!res.ok) return [];
      const raw = await res.json();
      const items = Array.isArray(raw) ? raw : raw?.grants ?? [];
      return items as AccountGrant[];
    } catch {
      return [];
    }
  },

  shareAccount: async (accountId: string, granteeEmail: string, accessLevel: 'read' | 'trade') => {
    set({ error: null });
    try {
      const res = await moduleFetch(`${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantee_email: granteeEmail, access_level: accessLevel }),
      });
      if (!res.ok) {
        set({ error: await readJsonError(res) });
        return null;
      }
      return (await res.json()) as AccountGrant;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to share account' });
      return null;
    }
  },

  revokeGrant: async (accountId: string, grantId: string) => {
    try {
      const res = await moduleFetch(
        `${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}/grants/${encodeURIComponent(grantId)}`,
        { method: 'DELETE' },
      );
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  },

  hasLegacyLocalAccounts: () => {
    return readLegacyLocalAccounts().length > 0;
  },

  migrateLegacyLocalAccounts: async () => {
    const legacy = readLegacyLocalAccounts();
    let migrated = 0;
    let failed = 0;
    for (const acc of legacy) {
      if (!acc.api_key || !acc.api_secret) {
        // Nothing sensitive to migrate (metadata-only legacy row) — skip.
        continue;
      }
      const created = await get().addAccount(acc);
      if (created) migrated += 1;
      else failed += 1;
    }
    return { migrated, failed };
  },

  purgeLegacyLocalAccounts: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEGACY_USER_STORE_KEY);
    }
  },
}));

// --- legacy localStorage migration source ----------------------------------

/**
 * Read any legacy `user-store` localStorage accounts and shape them as
 * `AddAccountInput`. Only rows that actually carry plaintext secrets are
 * returned (encrypted-but-locked rows can't be migrated and are skipped). This
 * is the ONLY remaining reader of the old plaintext-in-browser format; once
 * migrated, `purgeLegacyLocalAccounts()` removes it for good.
 */
function readLegacyLocalAccounts(): AddAccountInput[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(LEGACY_USER_STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const users = parsed?.state?.users ?? parsed?.users ?? [];
    const out: AddAccountInput[] = [];
    for (const user of users) {
      for (const acc of user?.accounts ?? []) {
        // Skip encrypted rows (we can't decrypt without the master password and
        // the AES path is being removed) and metadata-only rows.
        if (acc?.isEncrypted) continue;
        if (!acc?.key || !acc?.privateKey) continue;
        out.push({
          exchange: acc.exchange,
          label: acc.email || acc.notes || undefined,
          api_key: acc.key,
          api_secret: acc.privateKey,
          passphrase: acc.password || undefined,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

// Keep the derived identity view fresh: when sessions change (add/switch/remove)
// and the active identity has no loaded accounts yet, fetch them.
if (typeof window !== 'undefined') {
  let lastActiveId: string | undefined = getActiveSession()?.id;
  useSessionStore.subscribe(() => {
    const activeId = getActiveSession()?.id;
    if (activeId && activeId !== lastActiveId) {
      lastActiveId = activeId;
      if (!useAccountStore.getState().accountsBySession[activeId]) {
        void useAccountStore.getState().loadAccounts();
      }
    }
  });
}
