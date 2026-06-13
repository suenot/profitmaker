import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useSsoStore, login, logout } from '@/services/ssoClient';

/**
 * Minimal SSO control for the top bar: a "Login with MarketMaker" button when
 * unauthenticated, or a compact user chip (email + logout) when signed in.
 * Renders nothing while the session status is still 'unknown' (e.g. the auth
 * service is unreachable) so we never flash a misleading login button.
 */
export const SsoUserChip: React.FC = () => {
  const { status, user } = useSsoStore();

  if (status === 'unknown') return null;

  if (status === 'authenticated' && user) {
    const label = user.username || user.email;
    return (
      <div className="flex items-center space-x-2 pl-1">
        <span
          className="text-xs text-terminal-text max-w-[160px] truncate"
          title={user.email}
        >
          {label}
        </span>
        <button
          onClick={() => { void logout(); }}
          className="p-2 rounded-full hover:bg-terminal-accent/50 transition-colors text-terminal-muted hover:text-terminal-negative"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
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
