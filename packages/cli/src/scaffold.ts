import { cp, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Scaffold a new module from templates/module-template, renaming the placeholder
 * id `example` to <name> everywhere it matters (package name, profitmaker.id,
 * widget types `example.*`). Mirrors the manual steps in the template's
 * AGENTS.md "Scaffold" section.
 */
export async function scaffoldModule(name: string, destDir?: string): Promise<string> {
  const id = name.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(`module id must be lowercase kebab-case (^[a-z][a-z0-9-]*$): got "${name}"`);
  }

  const templateDir = locateTemplate();
  if (!existsSync(templateDir)) {
    throw new Error(`module template not found at ${templateDir}`);
  }

  const dest = resolve(destDir || process.cwd(), id);
  if (existsSync(dest)) {
    throw new Error(`destination already exists: ${dest}`);
  }

  await cp(templateDir, dest, {
    recursive: true,
    filter: (src) => !/(\/node_modules\/|\/dist\/)/.test(src),
  });

  // Rewrite the placeholder id in the text files that reference it.
  await replaceInTree(dest, (text, path) => {
    let out = text;
    if (path.endsWith('package.json')) {
      out = out
        .replace(/"profitmaker-module-example"/g, `"profitmaker-module-${id}"`)
        .replace(/"id":\s*"example"/g, `"id": "${id}"`);
    }
    // Widget types and ids: example.hello → <id>.hello, and bare 'example'
    // module-id references in source.
    out = out.replace(/example\.([a-zA-Z0-9_-]+)/g, `${id}.$1`);
    out = out.replace(/(['"`])example\1/g, `$1${id}$1`);
    return out;
  });

  return dest;
}

function locateTemplate(): string {
  // packages/cli/src → repo root → templates/module-template
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '../../../templates/module-template'),
    resolve(process.cwd(), 'templates/module-template'),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

async function replaceInTree(dir: string, fn: (text: string, path: string) => string): Promise<void> {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      await replaceInTree(full, fn);
    } else if (/\.(json|ts|tsx|js|jsx|md|css)$/.test(entry)) {
      const text = await readFile(full, 'utf8');
      const next = fn(text, full);
      if (next !== text) await writeFile(full, next);
    }
  }
}
