import React from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import {
  ACCENTS,
  FONTS,
  PRICE_COLORS,
  RADII,
  SCALES,
  themesFor,
  type ColorMode,
  type ThemeMode,
} from '@/lib/themes';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';

export const COLOR_MODES: { id: ColorMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Auto', icon: Monitor },
];

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="space-y-2">
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-terminal-muted">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-terminal-muted/80">{hint}</p>}
    </div>
    {children}
  </section>
);

/** A row of mutually exclusive options. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { id: T; label: string; icon?: typeof Sun }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md border border-terminal-border bg-terminal-bg p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2 py-1.5 text-xs transition-colors',
              active ? 'bg-terminal-accent text-terminal-text shadow-sm' : 'text-terminal-muted hover:text-terminal-text',
            )}
          >
            {Icon && <Icon size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Palette cards for one mode. Each card carries its own data-theme, so it previews that palette. */
const PalettePicker: React.FC<{ mode: ThemeMode; value: string; onChange: (id: string) => void }> = ({ mode, value, onChange }) => (
  <div role="radiogroup" aria-label={`${mode} palette`} className="grid grid-cols-2 gap-2">
    {themesFor(mode).map((t) => {
      const active = t.id === value;
      return (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(t.id)}
          className={cn(
            'group overflow-hidden rounded-md border text-left transition-colors',
            active ? 'border-[hsl(var(--ring))] ring-1 ring-[hsl(var(--ring))]' : 'border-terminal-border hover:border-terminal-muted',
          )}
        >
          <span data-theme={t.id} className={cn('block bg-terminal-bg p-2', t.mode)} aria-hidden="true">
            <span className="flex h-10 gap-1 rounded-sm border border-terminal-border bg-terminal-widget p-1.5">
              <span className="flex flex-1 flex-col justify-between">
                <span className="h-1 w-8 rounded-full bg-terminal-text" />
                <span className="h-1 w-5 rounded-full bg-terminal-muted" />
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-3 rounded-full bg-[hsl(var(--primary))]" />
                </span>
              </span>
              <span className="flex items-end gap-0.5">
                <span className="h-3 w-1 rounded-[1px] bg-terminal-positive" />
                <span className="h-5 w-1 rounded-[1px] bg-terminal-positive" />
                <span className="h-2 w-1 rounded-[1px] bg-terminal-negative" />
                <span className="h-4 w-1 rounded-[1px] bg-terminal-positive" />
              </span>
            </span>
          </span>
          <span className="flex items-center justify-between border-t border-terminal-border px-2 py-1.5 text-xs text-terminal-text">
            {t.label}
            {active && <Check size={12} className="text-[hsl(var(--ring))]" />}
          </span>
        </button>
      );
    })}
  </div>
);

interface AppearanceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Appearance settings. The menu only switches light / dark / auto; here the
 * user picks which palette each mode uses and tunes the rest of the look.
 * Non-modal, so the terminal behind it previews every change live.
 */
const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ open, onOpenChange }) => {
  const { appearance, updateAppearance, resetAppearance, theme } = useTheme();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        className="flex w-[360px] flex-col gap-0 overflow-y-auto border-terminal-border bg-terminal-widget p-0 sm:max-w-[360px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="border-b border-terminal-border px-5 py-4 text-left">
          <SheetTitle className="text-base">Appearance</SheetTitle>
          <SheetDescription className="text-xs">Changes apply right away and are saved on this device.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-5 py-5">
          <Section title="Mode">
            <Segmented label="Mode" value={appearance.mode} options={COLOR_MODES} onChange={(mode) => updateAppearance({ mode })} />
          </Section>

          <Section title="Dark theme" hint={theme === 'dark' ? 'In use now' : 'Used in dark mode'}>
            <PalettePicker mode="dark" value={appearance.darkTheme} onChange={(darkTheme) => updateAppearance({ darkTheme })} />
          </Section>

          <Section title="Light theme" hint={theme === 'light' ? 'In use now' : 'Used in light mode'}>
            <PalettePicker mode="light" value={appearance.lightTheme} onChange={(lightTheme) => updateAppearance({ lightTheme })} />
          </Section>

          <Section title="Accent" hint="Buttons, active tab, focus and selection">
            <div role="radiogroup" aria-label="Accent" className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((a) => {
                const active = appearance.accent === a.id;
                const ring = active ? 'ring-2 ring-[hsl(var(--ring))] ring-offset-2 ring-offset-terminal-widget' : '';
                if (a.id === 'custom') {
                  return (
                    <label
                      key={a.id}
                      title="Custom colour"
                      className={cn('relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-terminal-border', ring)}
                      style={{ background: 'conic-gradient(#f43f5e, #f59e0b, #b9f34c, #22d3ee, #6366f1, #d946ef, #f43f5e)' }}
                    >
                      <input
                        type="color"
                        aria-label="Custom accent colour"
                        value={appearance.customAccent}
                        onChange={(e) => updateAppearance({ accent: 'custom', customAccent: e.target.value })}
                        onClick={() => updateAppearance({ accent: 'custom' })}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      {active && <span className="absolute inset-[7px] rounded-full border-2 border-white" style={{ background: appearance.customAccent }} />}
                    </label>
                  );
                }
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={a.label}
                    title={a.id === 'palette' ? 'Theme accent' : a.label}
                    onClick={() => updateAppearance({ accent: a.id })}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border border-terminal-border text-[10px] text-terminal-muted',
                      ring,
                    )}
                    style={a.swatch ? { background: a.swatch } : undefined}
                  >
                    {a.id === 'palette' && 'A'}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Price colours" hint={PRICE_COLORS.find((p) => p.id === appearance.priceColors)?.hint}>
            <div role="radiogroup" aria-label="Price colours" className="grid grid-cols-3 gap-2">
              {PRICE_COLORS.map((p) => {
                const active = appearance.priceColors === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => updateAppearance({ priceColors: p.id })}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-md border px-2 py-2 text-xs transition-colors',
                      active ? 'border-[hsl(var(--ring))] text-terminal-text' : 'border-terminal-border text-terminal-muted hover:text-terminal-text',
                    )}
                  >
                    {/* The swatch carries the scheme as its own attribute, so it shows that scheme. */}
                    <span data-price={p.id} className="flex items-end gap-0.5" aria-hidden="true">
                      <span className="h-3 w-1.5 rounded-[1px] bg-terminal-positive" />
                      <span className="h-5 w-1.5 rounded-[1px] bg-terminal-positive" />
                      <span className="h-4 w-1.5 rounded-[1px] bg-terminal-negative" />
                    </span>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Corners">
            <Segmented label="Corners" value={appearance.radius} options={RADII} onChange={(radius) => updateAppearance({ radius })} />
          </Section>

          <Section title="Font">
            <Segmented label="Font" value={appearance.font} options={FONTS} onChange={(font) => updateAppearance({ font })} />
          </Section>

          <Section title="Interface size">
            <Segmented label="Interface size" value={appearance.scale} options={SCALES} onChange={(scale) => updateAppearance({ scale })} />
          </Section>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-terminal-muted">Texture</h3>
              <p className="mt-0.5 text-xs text-terminal-muted/80">Fine film grain over the terminal</p>
            </div>
            <Switch checked={appearance.grain} onCheckedChange={(grain) => updateAppearance({ grain })} aria-label="Texture" />
          </div>
        </div>

        <div className="mt-auto border-t border-terminal-border px-5 py-3">
          <button
            type="button"
            onClick={resetAppearance}
            className="text-xs text-terminal-muted underline-offset-4 hover:text-terminal-text hover:underline"
          >
            Reset to defaults
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppearanceSettings;
