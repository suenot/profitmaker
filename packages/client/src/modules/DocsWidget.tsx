import React, { useState } from 'react';
import { Check, Copy, Terminal, Bot, Code2, Boxes, BookOpen, ExternalLink } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { resolveServerBase } from './api';
import { getSsoToken } from '@/services/ssoClient';

/**
 * In-app "API & Agents" documentation widget.
 *
 * Surfaces the terminal's programmatic control surface (goal #5: AI agents drive
 * the terminal via REST / CLI / MCP — create dashboards, widgets, groups, and
 * develop/publish/install modules). Content is distilled from docs/{mcp,cli,
 * remote-control,server-api,modules}.md and kept dependency-free (no markdown
 * renderer) so it bundles cleanly. The live server base is resolved at render so
 * copy-paste snippets point at the server this terminal is actually talking to.
 */

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context) — no-op */
    }
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded-md text-terminal-muted hover:text-terminal-text hover:bg-terminal-accent/60 transition-colors"
      title="Copy"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="relative group my-3">
      <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg/60 p-3 pr-10 text-xs leading-relaxed text-terminal-text font-mono">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-terminal-text mt-5 mb-1.5 first:mt-0">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-terminal-muted mb-2">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-0.5 rounded bg-terminal-accent/40 text-terminal-text font-mono text-[11px]">
      {children}
    </code>
  );
}

function ExternalDoc({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-terminal-text hover:underline"
    >
      {children}
      <ExternalLink size={11} />
    </a>
  );
}

// ---------------------------------------------------------------------------
// MCP tool reference (mirrors docs/mcp.md — 31 tools across domains)
// ---------------------------------------------------------------------------

const TOOL_DOMAINS: { domain: string; tools: [string, string][] }[] = [
  {
    domain: 'dashboards',
    tools: [
      ['dashboards_list', 'List all dashboards (id, title, isDefault).'],
      ['dashboards_get', 'Get one dashboard with all its widgets.'],
      ['dashboards_create', 'Create a dashboard (a tab). Appears live.'],
      ['dashboards_update', 'Update title/description/layout/isDefault.'],
      ['dashboards_delete', 'Delete a dashboard and its widgets.'],
      ['dashboards_set_active', 'Switch the active tab in the live UI (needs a browser).'],
    ],
  },
  {
    domain: 'widgets',
    tools: [
      ['widgets_list_types', 'List addable widget types (built-in + module).'],
      ['widgets_list', 'List the widgets on a dashboard.'],
      ['widgets_add', 'Add a widget at a pixel position; bind to a group.'],
      ['widgets_update', 'Update title/config/group/visibility.'],
      ['widgets_move', 'Move a widget to {x,y}.'],
      ['widgets_resize', 'Resize a widget.'],
      ['widgets_remove', 'Remove a widget.'],
    ],
  },
  {
    domain: 'groups',
    tools: [
      ['groups_list', 'List instrument groups.'],
      ['groups_create', 'Create a group (exchange/market/tradingPair).'],
      ['groups_set_group_context', 'Retarget a group — every bound widget follows live.'],
      ['groups_assign_widget', 'Bind a widget to a group.'],
    ],
  },
  {
    domain: 'marketdata',
    tools: [
      ['marketdata_list_exchanges', 'List servable exchange ids.'],
      ['marketdata_get_capabilities', "An exchange's capabilities."],
      ['marketdata_get_candles', 'Recent OHLCV candles.'],
      ['marketdata_get_orderbook', 'Current order book.'],
      ['marketdata_get_recent_trades', 'Recent public trades.'],
      ['marketdata_get_ticker', 'Latest ticker.'],
    ],
  },
  {
    domain: 'providers',
    tools: [['providers_list_available', 'Server-side providers (built-in "ccxt", + module ones).']],
  },
  {
    domain: 'modules',
    tools: [
      ['modules_search', 'Search npm for Profitmaker modules.'],
      ['modules_install', 'Install a module from npm (no restart).'],
      ['modules_enable', 'Enable an installed module.'],
      ['modules_disable', 'Disable an installed module.'],
    ],
  },
  {
    domain: 'ui (needs a connected browser)',
    tools: [
      ['ui_get_ui_state', 'Active dashboard id + open widgets.'],
      ['ui_bring_widget_to_front', "Raise a widget's z-order."],
      ['ui_set_widget_settings', 'Apply per-widget settings live (e.g. timeframe).'],
    ],
  },
];

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function OverviewTab({ base, hasToken }: { base: string; hasToken: boolean }) {
  return (
    <div>
      <P>
        Everything you can do by hand in this terminal can be driven programmatically. A single shared
        command registry sits on top of the server's REST API + <InlineCode>ui:command</InlineCode> channel and is
        exposed three ways — pick whichever fits:
      </P>
      <ul className="text-xs text-terminal-muted space-y-1.5 mb-3 list-disc pl-5">
        <li>
          <span className="text-terminal-text font-medium">REST API</span> — raw HTTP, any language. Mutations stream
          to every open browser via <InlineCode>state:changed</InlineCode>.
        </li>
        <li>
          <span className="text-terminal-text font-medium">CLI</span> — <InlineCode>profitmaker &lt;domain&gt; &lt;verb&gt;</InlineCode> for
          humans &amp; scripts.
        </li>
        <li>
          <span className="text-terminal-text font-medium">MCP</span> — one tool per command for AI agents
          (Claude, etc.). Same registry, so behaviour never drifts.
        </li>
      </ul>

      <H>This terminal's server</H>
      <P>Snippets on the other tabs use this base (the server this terminal is connected to):</P>
      <Code>{base}</Code>
      <P>
        Auth: every <InlineCode>/api/*</InlineCode> call needs a{' '}
        <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode> — the server <InlineCode>API_TOKEN</InlineCode> (resolves to the
        bootstrap user, ideal for an agent) or a session/SSO token for a specific user.{' '}
        {hasToken ? (
          <span className="text-green-400">You are signed in via SSO, so the UI already carries a token.</span>
        ) : (
          <span>You are not signed in — sign in (top-right) or use the server API_TOKEN.</span>
        )}
      </P>

      <H>Reference docs</H>
      <P>
        Full write-ups live in the repo:{' '}
        <ExternalDoc href="https://github.com/suenot/profitmaker/blob/master/docs/mcp.md">mcp.md</ExternalDoc>,{' '}
        <ExternalDoc href="https://github.com/suenot/profitmaker/blob/master/docs/cli.md">cli.md</ExternalDoc>,{' '}
        <ExternalDoc href="https://github.com/suenot/profitmaker/blob/master/docs/remote-control.md">
          remote-control.md
        </ExternalDoc>
        ,{' '}
        <ExternalDoc href="https://github.com/suenot/profitmaker/blob/master/docs/server-api.md">
          server-api.md
        </ExternalDoc>
        .
      </P>
    </div>
  );
}

function McpTab({ base }: { base: string }) {
  const mcpJson = `{
  "mcpServers": {
    "profitmaker": {
      "command": "bun",
      "args": ["packages/mcp/src/bin.ts"],
      "env": {
        "PROFITMAKER_URL": "${base}",
        "PROFITMAKER_TOKEN": "your-api-token"
      }
    }
  }
}`;
  const scenario = `# "create a scalping dashboard for BTC/USDT on bybit"
1. widgets_list_types                      -> confirm chart, orderbook, trades
2. dashboards_create { title: "Scalping BTC" }   -> dashboardId
3. groups_create   { name: "Scalp", tradingPair: "BTC/USDT",
                     exchange: "bybit", market: "spot" }  -> groupId
4. widgets_add x3  (chart / orderbook / trades) with dashboardId + groupId
5. dashboards_set_active { dashboardId }    -> the user's tab switches
6. marketdata_get_ticker { exchange:"bybit", symbol:"BTC/USDT" }
# later: groups_set_group_context retargets all 3 widgets at once`;
  return (
    <div>
      <P>
        Drive a running terminal from an AI agent over the{' '}
        <ExternalDoc href="https://modelcontextprotocol.io">Model Context Protocol</ExternalDoc>. The server exposes
        one tool per registry command. Add it to your agent's <InlineCode>.mcp.json</InlineCode>:
      </P>
      <Code>{mcpJson}</Code>
      <P>
        Or via the installed CLI's stable entrypoint:{' '}
        <InlineCode>{'{ "command": "profitmaker", "args": ["mcp"] }'}</InlineCode>.
      </P>
      <P>
        <span className="text-terminal-text font-medium">Errors surface verbatim</span> (flagged{' '}
        <InlineCode>isError</InlineCode>): a <InlineCode>503 No UI client connected</InlineCode> for a{' '}
        <InlineCode>ui_*</InlineCode> tool when no browser is open, a <InlineCode>400</InlineCode> zod message, etc.
        <InlineCode>ui_*</InlineCode> tools and <InlineCode>dashboards_set_active</InlineCode> need a browser tab on
        the same server/user.
      </P>

      <H>Worked scenario</H>
      <Code>{scenario}</Code>

      <H>Tool reference — 31 tools</H>
      {TOOL_DOMAINS.map(({ domain, tools }) => (
        <div key={domain} className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] text-terminal-text border-terminal-border">
              {domain}
            </Badge>
          </div>
          <ul className="space-y-1">
            {tools.map(([name, desc]) => (
              <li key={name} className="text-xs leading-snug">
                <InlineCode>{name}</InlineCode> <span className="text-terminal-muted">— {desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CliTab({ base }: { base: string }) {
  const setup = `export PROFITMAKER_URL=${base}
export PROFITMAKER_TOKEN=your-api-token   # API_TOKEN, or a session/SSO token`;
  const usage = `profitmaker --help                  # list domains
profitmaker dashboards --help       # a domain's verbs
profitmaker dashboards create --help    # flags for one command`;
  const examples = `# Discover and create
profitmaker widgets list-types
DASH=$(profitmaker dashboards create --title "Scalping BTC" | jq -r .id)
GROUP=$(profitmaker groups create --name Scalp --trading-pair BTC/USDT \\
          --exchange bybit --market spot --color '#00BCD4' | jq -r .id)

# Add widgets bound to the group
profitmaker widgets add --dashboard-id "$DASH" --type chart \\
  --position '{"x":20,"y":80,"width":700,"height":420}' --group-id "$GROUP"

# Live data
profitmaker marketdata get-ticker --exchange bybit --symbol BTC/USDT

# Drive the open UI (needs a browser connected to the same server)
profitmaker dashboards set-active --dashboard-id "$DASH"

# Retarget every widget on the group at once
profitmaker groups set-group-context --group-id "$GROUP" --trading-pair ETH/USDT`;
  return (
    <div>
      <P>
        <InlineCode>profitmaker</InlineCode> is the same command registry as MCP, behind a shell command — humans and
        scripts use the CLI, agents use MCP, both share one implementation. Run in-repo with{' '}
        <InlineCode>bun packages/cli/src/bin.ts …</InlineCode> or install <InlineCode>@profitmaker/cli</InlineCode>.
      </P>
      <H>Setup</H>
      <Code>{setup}</Code>
      <H>Usage</H>
      <Code>{usage}</Code>
      <P>
        Flags come from each command's schema: <InlineCode>--kebab-case</InlineCode> for{' '}
        <InlineCode>camelCase</InlineCode> fields, booleans are presence flags, and JSON-looking values are parsed.
        Results print as JSON to stdout; errors go to stderr with a non-zero exit.
      </P>
      <H>Examples</H>
      <Code>{examples}</Code>
      <P>
        CLI verb = MCP tool name with <InlineCode>_</InlineCode> → space (e.g.{' '}
        <InlineCode>dashboards_set_active</InlineCode> → <InlineCode>dashboards set-active</InlineCode>).
      </P>
    </div>
  );
}

function RestTab({ base }: { base: string }) {
  const auth = `# All /api/* except /api/auth/* require a Bearer token.
curl ${base}/health
curl ${base}/api/dashboards -H "Authorization: Bearer $API_TOKEN"`;
  const create = `# Create a dashboard (streams live to any open browser)
curl -X POST ${base}/api/dashboards \\
  -H "Authorization: Bearer $API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Scalping BTC"}'`;
  const uiCmd = `# UI-only verbs (active tab, z-order, live widget settings)
curl -X POST ${base}/api/ui/command \\
  -H "Authorization: Bearer $API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"set-active-dashboard","dashboardId":"<id>"}'`;
  const endpoints: [string, string][] = [
    ['GET  /health', 'Server status, version, ccxt version, db (no auth).'],
    ['POST /api/auth/register · login · logout · me', 'Session tokens for users.'],
    ['GET·POST·PUT·DELETE /api/dashboards[/:id]', 'Dashboard CRUD.'],
    ['/api/widgets · /api/widgets/batch', 'Widget CRUD (+ batch).'],
    ['/api/groups[/:id]', 'Instrument group CRUD.'],
    ['/api/providers · /api/providers/available', 'Provider config + discovery.'],
    ['POST /api/exchange/fetchTicker · fetchOHLCV · fetchOrderBook · …', 'Market data + trading.'],
    ['POST /api/exchange/createOrder · cancelOrder', 'Trading (creds travel in config).'],
    ['POST /api/ui/command', 'UI-only verbs (needs a connected browser).'],
    ['/api/settings · /api/accounts · /api/modules', 'Settings, accounts, module mgmt.'],
  ];
  return (
    <div>
      <P>
        Raw HTTP control surface — every mutation broadcasts to open browsers via{' '}
        <InlineCode>state:changed</InlineCode>, so a REST call moves the live UI. Auth is a Bearer token (server{' '}
        <InlineCode>API_TOKEN</InlineCode>, or a session / SSO JWT).
      </P>
      <H>Auth &amp; read</H>
      <Code>{auth}</Code>
      <H>Create (live)</H>
      <Code>{create}</Code>
      <H>Drive the open UI</H>
      <Code>{uiCmd}</Code>
      <H>Endpoint map</H>
      <ul className="space-y-1">
        {endpoints.map(([ep, desc]) => (
          <li key={ep} className="text-xs leading-snug">
            <InlineCode>{ep}</InlineCode> <span className="text-terminal-muted">— {desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModulesTab() {
  const scaffold = `# Scaffold a new module from the template
profitmaker module scaffold my-module --dir ./my-module
cd my-module && bun install && bun run build`;
  const installMcp = `# Install + enable from npm — no server restart
modules_search  { query: "arbitrage" }
modules_install { name: "profitmaker-module-xyz" }
modules_enable  { id: "xyz" }`;
  return (
    <div>
      <P>
        Modules are <span className="text-terminal-text font-medium">full-stack</span> (frontend widgets + backend
        services) and extend the terminal into a custom trading / algo system. The registry is{' '}
        <span className="text-terminal-text font-medium">npm</span> — any package with the{' '}
        <InlineCode>profitmaker-module</InlineCode> keyword is installable; there is no separate registry server.
      </P>
      <H>Discover &amp; install (agent or CLI)</H>
      <Code>{installMcp}</Code>
      <P>
        The same is available in the CLI (<InlineCode>profitmaker modules search/install/enable</InlineCode>) and in the
        in-app <span className="text-terminal-text font-medium">Module Store</span> (right-click menu).
      </P>
      <H>Build a module</H>
      <Code>{scaffold}</Code>
      <P>
        Then publish to npm with the <InlineCode>profitmaker-module</InlineCode> keyword. Modules can register data
        providers (e.g. a Rust-backed alternative to CCXT) via <InlineCode>ctx.providers.register(...)</InlineCode>.
        See{' '}
        <ExternalDoc href="https://github.com/suenot/profitmaker/blob/master/docs/modules.md">modules.md</ExternalDoc>.
      </P>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

const DocsWidget: React.FC = () => {
  const base = resolveServerBase();
  const hasToken = Boolean(getSsoToken());

  return (
    <div className="h-full flex flex-col bg-terminal-widget text-terminal-text">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border/50 shrink-0">
        <BookOpen size={15} className="text-terminal-muted" />
        <span className="text-sm font-medium">API &amp; Agents</span>
        <span className="text-[11px] text-terminal-muted ml-1">drive this terminal via REST · CLI · MCP</span>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 shrink-0">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <BookOpen size={13} /> Overview
          </TabsTrigger>
          <TabsTrigger value="mcp" className="text-xs gap-1.5">
            <Bot size={13} /> Agents · MCP
          </TabsTrigger>
          <TabsTrigger value="cli" className="text-xs gap-1.5">
            <Terminal size={13} /> CLI
          </TabsTrigger>
          <TabsTrigger value="rest" className="text-xs gap-1.5">
            <Code2 size={13} /> REST API
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs gap-1.5">
            <Boxes size={13} /> Modules
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab base={base} hasToken={hasToken} />
            </TabsContent>
            <TabsContent value="mcp" className="mt-0">
              <McpTab base={base} />
            </TabsContent>
            <TabsContent value="cli" className="mt-0">
              <CliTab base={base} />
            </TabsContent>
            <TabsContent value="rest" className="mt-0">
              <RestTab base={base} />
            </TabsContent>
            <TabsContent value="modules" className="mt-0">
              <ModulesTab />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default DocsWidget;
