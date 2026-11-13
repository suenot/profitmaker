import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Check, LogIn, LogOut, Plus, Settings } from 'lucide-react';
import { useSsoStore, login, addLogin, logout, switchSession } from '@/services/ssoClient';
import type { SsoUser } from '@/services/sessionManager';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

/**
 * The single navbar auth control. Replaces the old two-control layout (a text
 * chip PLUS a separate avatar button). The AVATAR is the one entry point:
 *
 *  - No identity connected → a compact "Login with MarketMaker" button.
 *  - Signed in → the ACTIVE identity's avatar; clicking opens a compact dropdown
 *    listing every connected identity (click to switch, a check marks the
 *    active one, an expired one signs in again), then "Add login"
 *    (auth /login?prompt=login), "Manage accounts" (opens the exchange-accounts
 *    drawer via onManageAccounts) and "Log out <active identity>".
 *
 * All display (avatar, initials, name) is sourced from the ACTIVE SSO session
 * (`useSsoStore().user`, which is `getActiveSession().user`) — NOT the legacy
 * userStore projection — so the navbar always reflects the active identity.
 * Renders nothing while status is 'unknown' with no sessions (auth unreachable)
 * so we never flash a misleading login button.
 */
const initialsOf = (u: SsoUser) => (u.email || u.username || '?').slice(0, 2).toUpperCase();

const IdentityAvatar: React.FC<{ user: SsoUser }> = ({ user }) => (
  <Avatar className="w-7 h-7 shrink-0">
    {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.email} /> : null}
    <AvatarFallback className="text-[10px]">{initialsOf(user)}</AvatarFallback>
  </Avatar>
);

export const SsoUserChip: React.FC<{ onManageAccounts?: () => void }> = ({ onManageAccounts }) => {
  const { status, user, sessions, activeSessionId } = useSsoStore();
  const [openMenu, setOpenMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenu]);

  if (status === 'unknown' && sessions.length === 0) return null;

  // Signed out: a single compact login button.
  if (sessions.length === 0 || !user) {
    return (
      <button
        onClick={login}
        className="flex items-center space-x-1.5 px-3 h-8 rounded-md bg-terminal-accent/60 hover:bg-terminal-accent text-terminal-text text-xs transition-colors"
        title="Sign in with your MarketMaker account"
      >
        <LogIn size={14} />
        <span>Login with MarketMaker</span>
      </button>
    );
  }

  // Signed in: avatar of the ACTIVE identity, opening the consolidated dropdown.
  const activeLabel = user.username || user.email;
  const initials = (user.email || user.username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        onClick={() => setOpenMenu((v) => !v)}
        className="relative p-0.5 rounded-full hover:bg-terminal-accent/50 transition-colors"
        title={`${activeLabel} — switch identity / manage accounts`}
      >
        <Avatar className="w-7 h-7">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.email} />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
        {sessions.length > 1 && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-terminal-accent text-terminal-text text-[9px] leading-[14px] text-center border border-terminal-widget">
            {sessions.length}
          </span>
        )}
      </button>

      {openMenu && (
        <div className="absolute right-0 top-10 z-[11000] w-64 rounded-md border border-terminal-border bg-terminal-widget shadow-lg p-1">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-terminal-muted">Accounts</div>

          {/* Every identity in one list: click switches, the active one has a check. */}
          <div className="max-h-72 overflow-auto">
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const stale = s.expiresAt !== undefined && s.expiresAt <= Date.now();
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setOpenMenu(false);
                    if (stale) addLogin();
                    else if (!isActive) switchSession(s.id);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-terminal-accent/30"
                  title={stale ? 'Session expired: sign in again' : isActive ? 'Active identity' : 'Switch to this identity'}
                >
                  <IdentityAvatar user={s.user} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{s.user.username || s.user.email}</div>
                    <div className="text-[10px] text-terminal-muted truncate">
                      {stale ? (
                        <span className="inline-flex items-center gap-1 text-terminal-negative">
                          <AlertTriangle size={10} /> Session expired, click to sign in
                        </span>
                      ) : (
                        s.user.email
                      )}
                    </div>
                  </div>
                  {isActive && <Check size={14} className="shrink-0 text-terminal-positive" />}
                </button>
              );
            })}
          </div>

          <div className="my-1 border-t border-terminal-border" />

          <button
            onClick={() => { setOpenMenu(false); addLogin(); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-terminal-accent/30 text-terminal-text"
          >
            <span className="w-7 h-7 shrink-0 rounded-full border border-dashed border-terminal-border flex items-center justify-center">
              <Plus size={14} className="text-terminal-muted" />
            </span>
            Add login
          </button>
          <button
            onClick={() => { setOpenMenu(false); onManageAccounts?.(); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-terminal-accent/30 text-terminal-text"
          >
            <span className="w-7 h-7 shrink-0 flex items-center justify-center"><Settings size={14} /></span>
            Manage accounts
          </button>
          <button
            onClick={() => { setOpenMenu(false); void logout(); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-terminal-accent/30 text-terminal-muted hover:text-terminal-negative"
          >
            <span className="w-7 h-7 shrink-0 flex items-center justify-center"><LogOut size={14} /></span>
            <span className="truncate">Log out {activeLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SsoUserChip;
