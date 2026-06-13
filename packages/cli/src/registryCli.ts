import { z } from 'zod';
import { Command as Commander } from 'commander';
import { ApiClient, ApiError, commands, type Command } from '@profitmaker/mcp';

/**
 * Turn the shared command registry into `profitmaker <domain> <verb>` CLI
 * subcommands. Flags are derived from each command's zod object schema:
 * booleans become `--flag`, everything else `--flag <value>` (JSON-parsed when
 * the value looks like JSON, so objects/arrays/numbers work). The same ApiClient
 * + run() back both the CLI and the MCP server, so behaviour never diverges.
 */
export function registerRegistryCommands(program: Commander): void {
  const groups = new Map<string, Commander>();

  for (const cmd of commands) {
    const [domain, ...rest] = cmd.name.split('_');
    const verb = rest.join('-');
    let group = groups.get(domain);
    if (!group) {
      group = program.command(domain).description(`${domain} commands`);
      groups.set(domain, group);
    }

    const sub = group.command(verb).description(cmd.description);
    const shape = cmd.input instanceof z.ZodObject ? (cmd.input.shape as Record<string, z.ZodTypeAny>) : {};

    for (const [key, schema] of Object.entries(shape)) {
      const flag = toFlag(key);
      const optional = schema.isOptional?.() || schema instanceof z.ZodOptional;
      const desc = schema.description || '';
      if (isBoolean(schema)) {
        sub.option(`--${flag}`, desc);
      } else if (optional) {
        sub.option(`--${flag} <value>`, desc);
      } else {
        sub.requiredOption(`--${flag} <value>`, desc);
      }
    }

    sub.action(async (opts: Record<string, unknown>) => {
      const input: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const flagKey = camel(key);
        if (opts[flagKey] !== undefined) input[key] = coerce(opts[flagKey]);
      }
      await runCommand(cmd, input);
    });
  }
}

async function runCommand(cmd: Command, rawInput: unknown): Promise<void> {
  const api = new ApiClient();
  try {
    const input = cmd.input.parse(rawInput);
    const result = await cmd.run({ api }, input);
    process.stdout.write(JSON.stringify(result ?? { success: true }, null, 2) + '\n');
  } catch (err) {
    if (err instanceof z.ZodError) {
      process.stderr.write(`Invalid arguments: ${err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}\n`);
    } else if (err instanceof ApiError) {
      process.stderr.write(err.message + '\n');
    } else {
      process.stderr.write((err instanceof Error ? err.message : String(err)) + '\n');
    }
    process.exitCode = 1;
  } finally {
    api.closeSocket();
  }
}

// --- helpers -----------------------------------------------------------------

function isBoolean(schema: z.ZodTypeAny): boolean {
  let s: any = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault) s = s._def.innerType;
  return s instanceof z.ZodBoolean;
}

/** `dashboardId` → `dashboard-id` for the flag name. */
function toFlag(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** commander camelCases `--dashboard-id` back to `dashboardId`. */
function camel(key: string): string {
  return key;
}

/** Parse JSON-looking values so objects/arrays/numbers/booleans come through. */
function coerce(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (t === '') return v;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t === 'true') return true;
  if (t === 'false') return false;
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t); } catch { /* fall through */ }
  }
  return v;
}
