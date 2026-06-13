import type { z } from 'zod';
import type { ApiClient } from './client';

/**
 * A single agent-facing operation. The same Command objects back both the MCP
 * tools and the CLI subcommands, so behaviour and validation never drift.
 *
 * `name` is the tool/subcommand id (snake_case grouped by domain, e.g.
 * `dashboards_create`). `description` is read by agents to decide when to call
 * it — write it as a clear, self-contained instruction. `input` is a zod schema
 * (reuse @profitmaker/types schemas where they exist); the MCP layer exposes its
 * JSON Schema and the CLI derives flags from it. `run` performs the work via the
 * shared ApiClient and returns a JSON-serializable result.
 */
export interface Command<I = any, O = any> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  run: (ctx: CommandContext, input: I) => Promise<O>;
}

export interface CommandContext {
  api: ApiClient;
}

/** Helper to define a command with inferred input/output types. */
export function defineCommand<I, O>(cmd: Command<I, O>): Command<I, O> {
  return cmd;
}
