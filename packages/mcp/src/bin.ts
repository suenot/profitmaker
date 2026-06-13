#!/usr/bin/env bun
// Stdio entrypoint for the Profitmaker MCP server. Configure in .mcp.json:
//   { "command": "bun", "args": ["packages/mcp/src/bin.ts"],
//     "env": { "PROFITMAKER_URL": "...", "PROFITMAKER_TOKEN": "..." } }
import { runStdio } from './server';

runStdio().catch((err) => {
  // stdout is the MCP transport — log diagnostics to stderr only.
  console.error('[profitmaker-mcp] fatal:', err);
  process.exit(1);
});
