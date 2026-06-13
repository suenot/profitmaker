import type { Command } from '../command';
import { dashboardCommands } from './dashboards';
import { widgetCommands } from './widgets';
import { groupCommands } from './groups';
import { marketDataCommands } from './marketdata';
import { providerCommands } from './providers';
import { moduleCommands } from './modules';
import { uiCommands } from './ui';

/**
 * The single shared command registry. Both the MCP server and the CLI build
 * their surface from this list, so a command is defined once and exposed
 * identically to agents (MCP tools) and humans (CLI subcommands).
 */
export const commands: Command[] = [
  ...dashboardCommands,
  ...widgetCommands,
  ...groupCommands,
  ...marketDataCommands,
  ...providerCommands,
  ...moduleCommands,
  ...uiCommands,
];

export const commandsByName: Record<string, Command> = Object.fromEntries(
  commands.map((c) => [c.name, c]),
);

export {
  dashboardCommands,
  widgetCommands,
  groupCommands,
  marketDataCommands,
  providerCommands,
  moduleCommands,
  uiCommands,
};
