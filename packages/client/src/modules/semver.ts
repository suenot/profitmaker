/**
 * Minimal semver range check — just enough to validate a module's
 * `minTerminalApi` against the host TERMINAL_API_VERSION without pulling in a
 * full semver dependency. Supports comma/space separated comparator sets with
 * operators >= > <= < = ^ ~ and bare versions. Pre-release tags are ignored.
 */

type Triple = [number, number, number];

function parse(version: string): Triple {
  const clean = version.trim().replace(/^[v=]+/, '').split(/[-+]/)[0];
  const parts = clean.split('.').map((n) => parseInt(n, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compare(a: Triple, b: Triple): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function satisfiesComparator(version: Triple, comparator: string): boolean {
  const c = comparator.trim();
  if (!c || c === '*' || c === 'x') return true;

  const m = c.match(/^(>=|<=|>|<|=|\^|~)?\s*(.+)$/);
  if (!m) return false;
  const op = m[1] || '=';
  const target = parse(m[2]);
  const cmp = compare(version, target);

  switch (op) {
    case '>':
      return cmp > 0;
    case '>=':
      return cmp >= 0;
    case '<':
      return cmp < 0;
    case '<=':
      return cmp <= 0;
    case '=':
      return cmp === 0;
    case '^': {
      // Compatible within the same major (or same minor when major is 0).
      if (cmp < 0) return false;
      if (target[0] > 0) return version[0] === target[0];
      if (target[1] > 0) return version[0] === 0 && version[1] === target[1];
      return version[0] === 0 && version[1] === 0;
    }
    case '~': {
      // Compatible within the same minor.
      if (cmp < 0) return false;
      return version[0] === target[0] && version[1] === target[1];
    }
    default:
      return false;
  }
}

/**
 * Returns true if `version` satisfies `range`. Multiple space/comma separated
 * comparators are ANDed (e.g. ">=1.0.0 <2.0.0"). An empty/invalid range passes.
 */
export function satisfies(version: string, range: string): boolean {
  if (!range || !range.trim()) return true;
  const comparators = range.split(/\s*,\s*|\s+/).filter(Boolean);
  return comparators.every((c) => satisfiesComparator(parse(version), c));
}
