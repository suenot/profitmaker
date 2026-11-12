import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BOOK_STYLES, ROW_HEIGHTS, TAPE_STYLES } from '@/lib/themes';
import type { WidgetLookOverride } from '@/hooks/useWidgetLook';

const PRESET = 'preset';

interface WidgetStyleSettingsProps {
  /** Which row style this widget draws. */
  kind: 'book' | 'tape';
  look: WidgetLookOverride | undefined;
  onChange: (look: WidgetLookOverride) => void;
}

/**
 * Style section of a widget's settings. "Preset" follows the active theme
 * preset; any other value sticks to this widget.
 */
export const WidgetStyleSettings: React.FC<WidgetStyleSettingsProps> = ({ kind, look, onChange }) => {
  const styles = kind === 'book' ? BOOK_STYLES : TAPE_STYLES;
  const style = look?.[kind];

  const set = (patch: WidgetLookOverride) => {
    const next = { ...look, ...patch };
    (Object.keys(next) as (keyof WidgetLookOverride)[]).forEach((key) => {
      if (next[key] === undefined) delete next[key];
    });
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-terminal-text">Style</Label>
        <p className="text-xs text-terminal-muted">Preset follows the theme preset</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-terminal-text">Rows</Label>
          <Select
            value={style ?? PRESET}
            onValueChange={(value) => set({ [kind]: value === PRESET ? undefined : value } as WidgetLookOverride)}
          >
            <SelectTrigger className="bg-terminal-widget border-terminal-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PRESET}>Preset</SelectItem>
              {styles.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-terminal-text">Row height</Label>
          <Select
            value={look?.rowHeight?.toString() ?? PRESET}
            onValueChange={(value) => set({ rowHeight: value === PRESET ? undefined : parseInt(value) })}
          >
            <SelectTrigger className="bg-terminal-widget border-terminal-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PRESET}>Preset</SelectItem>
              {ROW_HEIGHTS.map((h) => (
                <SelectItem key={h} value={h.toString()}>
                  {h}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
