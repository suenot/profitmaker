import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Canvas plumbing shared by every scalper pane: a size from a ResizeObserver, a
 * DPR-corrected backing store, and a cleared 2D context handed to the caller's
 * draw function on every change.
 *
 * The panes are pure renderers — they own no data and no state, which is what
 * lets them all draw against the widget's single price axis.
 */
export function useCanvasRenderer(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  deps: unknown[],
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    draw(ctx, size.width, size.height);
    // The caller lists what the drawing depends on; `draw` itself is recreated
    // every render and would defeat the comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, ...deps]);

  return { canvasRef, containerRef, size };
}
