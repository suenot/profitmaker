#!/usr/bin/env bun
import { Command } from 'commander';
import { runStdio } from '@profitmaker/mcp';
import { registerRegistryCommands } from './registryCli';
import { scaffoldModule } from './scaffold';

const program = new Command();

program
  .name('profitmaker')
  .description('Drive a Profitmaker terminal from the shell. Uses PROFITMAKER_URL (default http://localhost:3001) and PROFITMAKER_TOKEN.')
  .version('1.0.0');

// One subcommand per registry command: `profitmaker <domain> <verb> --flags`.
registerRegistryCommands(program);

// Run the stdio MCP server (stable .mcp.json entrypoint).
program
  .command('mcp')
  .description('Run the Profitmaker MCP server over stdio (for AI agents; see docs/mcp.md).')
  .action(async () => {
    await runStdio();
  });

// `profitmaker module scaffold <name>` — copy the module template with renames.
const moduleCmd = program.command('module').description('Module authoring helpers');
moduleCmd
  .command('scaffold <name>')
  .description('Create a new module from templates/module-template (renames the id everywhere).')
  .option('--dir <dir>', 'Parent directory for the new module (default: the repo modules/ folder, a Bun workspace)')
  .action(async (name: string, opts: { dir?: string }) => {
    try {
      const dest = await scaffoldModule(name, opts.dir);
      const inWorkspace = /[\\/]modules[\\/][^\\/]+$/.test(dest);
      process.stdout.write(
        `Created module at ${dest}\n` +
          (inWorkspace
            ? `Next: bun install (at the repo root), then cd ${dest} && bun run build\n`
            : `Warning: outside the repo's modules/ folder the SDK dependency (workspace:*) will not resolve until @profitmaker/module-sdk is published to npm.\n`),
      );
    } catch (err) {
      process.stderr.write((err instanceof Error ? err.message : String(err)) + '\n');
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
