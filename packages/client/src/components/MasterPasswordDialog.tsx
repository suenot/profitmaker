interface MasterPasswordDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Inert since the central-accounts migration. Exchange secrets no longer live in
 * the browser — they're stored encrypted in auth.marketmaker.cc and resolved
 * server-side per request — so there is nothing to lock/unlock with a master
 * password. The in-browser AES vault and its dialog are gone; this stub remains
 * only so the existing mount point in App.tsx keeps compiling. Renders nothing.
 */
export function MasterPasswordDialog(_props: MasterPasswordDialogProps) {
  return null;
}
