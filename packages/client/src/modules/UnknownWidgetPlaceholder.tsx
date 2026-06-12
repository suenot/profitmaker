import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface UnknownWidgetPlaceholderProps {
  /** The widget `type` that could not be resolved in the registry. */
  type: string;
  /** Remove this widget from the dashboard. */
  onRemove: () => void;
}

/**
 * Rendered in place of a widget whose `type` is not present in the registry —
 * e.g. a persisted dashboard references a module widget whose module is not
 * installed or is disabled. Keeps the dashboard renderable instead of crashing.
 */
const UnknownWidgetPlaceholder: React.FC<UnknownWidgetPlaceholderProps> = ({ type, onRemove }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3 text-terminal-muted">
      <AlertTriangle className="text-yellow-500" size={28} />
      <div className="text-sm text-terminal-text">
        Widget <span className="font-mono text-terminal-text">'{type}'</span> is not installed or its module is disabled
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border border-terminal-border text-terminal-text hover:bg-terminal-accent/60 active:bg-terminal-accent/80 transition-colors duration-200"
      >
        <Trash2 size={14} />
        Remove widget
      </button>
    </div>
  );
};

export default UnknownWidgetPlaceholder;
