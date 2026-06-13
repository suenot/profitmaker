import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z, type ZodRawShape } from 'zod';
import { ApiClient, ApiError } from './client';
import { commands } from './commands';
import type { Command } from './command';

/**
 * The input schema of every command is a ZodObject; expose its raw shape so the
 * MCP SDK can publish the JSON Schema and validate tool arguments.
 *
 * The registry uses zod 3 (shared with @profitmaker/types) while the MCP SDK
 * bundles zod 4, so its `inputSchema` type doesn't structurally accept a zod-3
 * shape. The shapes are compatible at runtime (the SDK reads each field's schema
 * to emit JSON Schema), and we re-validate with the command's own schema in the
 * handler — so we bridge the version gap with a cast here, deliberately.
 */
function rawShape(cmd: Command): ZodRawShape {
  const schema = cmd.input as unknown;
  if (schema instanceof z.ZodObject) return schema.shape as ZodRawShape;
  // Non-object schemas aren't used in the registry, but stay safe.
  return {};
}

/**
 * Build the Profitmaker MCP server: every registry command becomes one MCP tool,
 * 1:1. Tool errors (the server's 503 "no UI client connected", a 400 zod
 * message, a network failure) are returned as MCP error content with the message
 * verbatim, so the agent sees exactly what went wrong.
 */
export function createMcpServer(api: ApiClient = new ApiClient()): McpServer {
  const server = new McpServer({
    name: 'profitmaker',
    version: '1.0.0',
  });

  for (const cmd of commands) {
    server.registerTool(
      cmd.name,
      // Cast bridges the zod-3 (registry) vs zod-4 (SDK) type gap — see rawShape.
      { description: cmd.description, inputSchema: rawShape(cmd) as any },
      async (args: unknown) => {
        try {
          const input = cmd.input.parse(args ?? {});
          const result = await cmd.run({ api }, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result ?? { success: true }, null, 2) }],
          };
        } catch (err) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: formatError(err) }],
          };
        }
      },
    );
  }

  return server;
}

function formatError(err: unknown): string {
  if (err instanceof ApiError) {
    // Pass the server's status + message through unchanged.
    return err.message;
  }
  if (err instanceof z.ZodError) {
    return `Invalid arguments: ${err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`;
  }
  return err instanceof Error ? err.message : String(err);
}

/** Connect the MCP server to stdio. Returns when the transport closes. */
export async function runStdio(api?: ApiClient): Promise<void> {
  const server = createMcpServer(api);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
