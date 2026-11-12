import { useTheme } from '@/hooks/useTheme';
import { getTheme, type WidgetLook } from '@/lib/themes';

/** A widget's own choice for each look value; `undefined` follows the preset. */
export type WidgetLookOverride = Partial<WidgetLook>;

/** The look a widget draws with: the active preset's, with the widget's own overrides on top. */
export function useWidgetLook(override?: WidgetLookOverride): WidgetLook {
  const { themeId } = useTheme();
  const preset = getTheme(themeId).widgets;
  return {
    book: override?.book ?? preset.book,
    tape: override?.tape ?? preset.tape,
    rowHeight: override?.rowHeight ?? preset.rowHeight,
  };
}
