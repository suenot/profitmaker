import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, Plus, Settings } from 'lucide-react';
import { useSsoStore, login, addLogin, logout, switchSession, dropSession } from '@/services/ssoClient';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

/**
 * The single navbar auth control. Replaces the old two-control layout (a text
 * chip PLUS a separate avatar button). The AVATAR is the one entry point:
 *
 *  - No identity connected → a compact "Login with MarketMaker" button.
 *  - Signed in → the ACTIVE identity's avatar; clicking opens a compact dropdown
 *    with the active identity on top, the other connected identities with
 *    quick-switch, "Add login" (auth /login?prompt=login), "Log out", and
 *    "Manage accounts" (opens the exchange-accounts drawer via onManageAccounts).
 *
 * All display (avatar, initials, name) is sourced from the ACTIVE SSO session
 * (`useSsoStore().user`, which is `getActiveSession().user`) — NOT the legacy
 * userStore projection — so the navbar always reflects the active identity.
 * Renders nothing while status is 'unknown' with no sessions (auth unreachable)
 * so we never flash a misleading login button.
 */
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
        <div className="absolute right-0 top-10 z-50 w-64 rounded-md border border-terminal-border bg-terminal-widget shadow-lg py-1">
          {/* Active identity header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border">
            <Avatar className="w-8 h-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.email} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{activeLabel}</div>
              <div className="text-[10px] text-terminal-muted truncate">{user.email}</div>
            </div>
          </div>

          {/* Other identities + quick-switch */}
          {sessions.length > 1 && (
            <div className="py-1 border-b border-terminal-border">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-terminal-muted">Switch identity</div>
              {sessions
                .filter((s) => s.id !== activeSessionId)
                .map((s) => {
                  const stale = s.expiresAt !== undefined && s.expiresAt <= Date.now();
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-terminal-accent/30">
                      <button
                        onClick={() => { switchSession(s.id); setOpenMenu(false); }}
                        className="flex-1 min-w-0 text-left flex items-center gap-2"
                        title={stale ? 'Session expired — re-login' : 'Switch to this identity'}
                      >
                        <span className="w-3.5 shrink-0" />
                        <span className="text-xs truncate">{s.user.username || s.user.email}</span>
                        {stale && <span className="text-[9px] px-1 rounded bg-terminal-negative/20 text-terminal-negative">stale</span>}
                      </button>
                      <button
                        onClick={() => dropSession(s.id)}
                        className="text-terminal-muted hover:text-terminal-negative"
                        title="Remove identity"
                      >
                        <LogOut size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Actions */}
          <button
            onClick={() => { addLogin(); setOpenMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-terminal-accent/30 text-terminal-text"
          >
            <Plus size={14} /> Add login
          </button>
          <button
            onClick={() => { setOpenMenu(false); onManageAccounts?.(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-terminal-accent/30 text-terminal-text"
          >
            <Settings size={14} /> Manage accounts
          </button>
          <button
            onClick={() => { void logout(); setOpenMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-terminal-accent/30 text-terminal-negative"
          >
            <LogOut size={14} /> Log out{sessions.length > 1 ? ' (active)' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

export default SsoUserChip;
