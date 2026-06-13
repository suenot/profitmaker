import { create } from 'zustand';
import {
  useAccountStore,
  buildUsers,
  ExchangeAccountSchema,
  type ExchangeAccount,
  type User,
  type AddAccountInput,
} from './accountStore';
import { useSessionStore, getActiveSession } from '../services/sessionManager';

/**
 * Backward-compatible projection of the central-accounts model onto the old
 * `userStore` shape.
 *
 * The terminal moved exchange accounts off browser localStorage into the central
 * auth service (see {@link useAccountStore}). Many read-only consumers (widgets,
 * selectors, GroupSelector) still program against the historical `userStore`
 * shape — `users` (identities), `activeUserId`, and `ExchangeAccount`. This store
 * preserves that surface as REACTIVE state: it subscribes to the multi-login
 * session manager and the account store and recomputes `users`/`activeUserId`
 * whenever either changes, so `useUserStore((s) => s.users)` re-renders correctly.
 *
 * The in-browser AES path and localStorage secret storage are GONE. The old
 * encryption-related fields (`isLocked`, `needsMasterPassword`, `unlockStore`,
 * …) remain as inert shims so legacy callers compile: there is nothing to lock
 * (no secrets in the browser), so the store reports itself permanently unlocked.
 */

export { ExchangeAccountSchema };
export type { ExchangeAccount, User };

interface UserStoreShim {
  users: User[];
  activeUserId: string | undefined;

  // --- identity / account management (delegates to central stores) -----------
  setActiveUser: (userId: string) => void;
  addAccount: (userId: string, account: Partial<ExchangeAccount> & { exchange: string }) => Promise<void>;
  removeAccount: (userId: string, accountId: string) => Promise<void>;
  reloadAccounts: () => Promise<void>;

  // --- legacy demo-seed helpers (no-ops under central accounts) ---------------
  addUser: (data: { email: string; avatarUrl?: string; notes?: string; name?: string }) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<Omit<User, 'id' | 'accounts'>>) => void;
  updateAccount: (userId: string, account: ExchangeAccount) => void;

  // --- legacy encryption shims (always unlocked; no secrets in browser) -------
  isLocked: boolean;
  needsMasterPassword: boolean;
  unlockStore: (password: string) => Promise<boolean>;
  lockStore: () => void;
  setupMasterPassword: (password: string) => Promise<boolean>;
  getDecryptedAccount: (userId: string, accountId: string) => Promise<ExchangeAccount | null>;
}

function project(): { users: User[]; activeUserId: string | undefined } {
  const { sessions } = useSessionStore.getState();
  const { accountsBySession } = useAccountStore.getState();
  return {
    users: buildUsers(sessions, accountsBySession),
    activeUserId: getActiveSession()?.id,
  };
}

export const useUserStore = create<UserStoreShim>((set) => ({
  ...project(),

  // Encryption shims: the browser holds no secrets, so the store is always
  // "unlocked" and never needs a master password.
  isLocked: false,
  needsMasterPassword: false,

  setActiveUser: (userId: string) => {
    useAccountStore.getState().setActiveUser(userId);
  },

  addAccount: async (_userId, account) => {
    // Central accounts require real keys; metadata-only adds are ignored.
    if (!account.key || !account.privateKey) return;
    const input: AddAccountInput = {
      exchange: account.exchange,
      label: account.label || account.email || undefined,
      api_key: account.key,
      api_secret: account.privateKey,
      passphrase: account.password || undefined,
      read_only: account.read_only,
    };
    await useAccountStore.getState().addAccount(input);
  },

  removeAccount: async (_userId, accountId) => {
    await useAccountStore.getState().removeAccount(accountId);
  },

  reloadAccounts: async () => {
    await useAccountStore.getState().loadAccounts();
  },

  // Identities now come from SSO sessions, not manual user rows — these are
  // inert (kept so legacy demo-seed call sites compile).
  addUser: () => {},
  removeUser: () => {},
  updateUser: () => {},
  updateAccount: () => {},

  // Inert encryption surface.
  unlockStore: async () => true,
  lockStore: () => {},
  setupMasterPassword: async () => true,
  getDecryptedAccount: async (_userId, accountId) => {
    // No secrets in the browser; return the metadata row if present so callers
    // that only need exchange/label still work. Trading paths resolve creds
    // server-side via accountId instead of reading this.
    const { accountsBySession } = useAccountStore.getState();
    for (const accounts of Object.values(accountsBySession)) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) return acc;
    }
    return null;
  },
}));

// Keep the projected identity view in sync with the underlying central stores.
if (typeof window !== 'undefined') {
  const sync = () => useUserStore.setState(project());
  useSessionStore.subscribe(sync);
  useAccountStore.subscribe(sync);
}
