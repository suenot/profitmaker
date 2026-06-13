import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, Plus, Check, ChevronDown } from 'lucide-react';
import { useSsoStore, login, addLogin, logout, switchSession, dropSession } from '@/services/ssoClient';

/**
 * SSO control for the top bar with multi-login support: a "Login with
 * MarketMaker" button when no identity is connected, or a compact chip for the
 * ACTIVE identity that opens a session switcher (quick-switch between connected
 * identities, add another login, remove or sign out of one). Renders nothing
 * while status is still 'unknown' (auth service unreachable) so we never flash a
 * misleading login button.
 */
export const SsoUserChip: React.FC = () => {
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

  if (sessions.length > 0 && user) {
    const label = user.username || user.email;
    return (
      <div className="relative flex items-center" ref={ref}>
        <button
          onClick={() => setOpenMenu((v) => !v)}
          className="flex items-center gap-1 pl-2 pr-1.5 h-8 rounded-md hover:bg-terminal-accent/50 transition-colors"
          title="Switch identity"
        >
          <span className="text-xs text-terminal-text max-w-[140px] truncate" title={user.email}>{label}</span>
          {sessions.length > 1 && (
            <span className="text-[10px] px-1 rounded-full bg-terminal-accent/60 text-terminal-text">{sessions.length}</span>
          )}
          <ChevronDown size={14} className="text-terminal-muted" />
        </button>

        {openMenu && (
          <div className="absolute right-0 top-9 z-50 w-64 rounded-md border border-terminal-border bg-terminal-widget shadow-lg py-1">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-terminal-muted">Identities</div>
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const stale = s.expiresAt !== undefined && s.expiresAt <= Date.now();
              return (
                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-terminal-accent/30">
                  <button
                    onClick={() => { switchSession(s.id); setOpenMenu(false); }}
                    className="flex-1 min-w-0 text-left flex items-center gap-2"
                    title={stale ? 'Session expired — re-login' : 'Switch to this identity'}
                  >
                    {isActive ? <Check size={14} className="text-terminal-positive shrink-0" /> : <span className="w-3.5 shrink-0" />}
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
            <div className="border-t border-terminal-border my-1" />
            <button
              onClick={() => { addLogin(); setOpenMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-terminal-accent/30 text-terminal-text"
            >
              <Plus size={14} /> Add login
            </button>
            <button
              onClick={() => { void logout(); setOpenMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-terminal-accent/30 text-terminal-negative"
            >
              <LogOut size={14} /> Log out active
            </button>
          </div>
        )}
      </div>
    );
  }

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
};

export default SsoUserChip;
