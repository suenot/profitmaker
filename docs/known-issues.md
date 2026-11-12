# Known issues

What does not work yet, or works with a catch. We keep this list short and
current. If you hit something that is not here, open an issue on
[GitHub](https://github.com/suenot/profitmaker/issues).

## Trading

- **Check open orders after a timeout.** If placing an order times out, the
  order may still have reached the exchange. Look at open orders before you
  place it again.
- **Amount rounding on some exchanges.** A few exchanges in CCXT describe
  precision as a number of significant digits, not as a step size (Bitfinex is
  one). On those, the order form may round the amount wrong. Check the amount
  in the confirmation before you send.
- **Self-hosted exchange keys are not saved.** Without MarketMaker sign-in,
  keys are sent with each request and kept in memory for that call only. You
  enter them again after a restart. An encrypted store for self-hosted keys is
  on the [roadmap](roadmap.md).

## Dashboards

- **A broken widget can reset a layout.** If one widget in a saved dashboard
  has data the terminal cannot read, the terminal may fall back to the default
  layout instead of skipping that widget. Export layouts you care about.
- **Duplicating a dashboard is local.** A duplicated dashboard is not written
  to the server until you change it.
- **No offline queue.** Changes made while the server is unreachable are not
  replayed later.

## Agents and remote control

- `ui_*` MCP tools need a browser tab open on the same server and user.
- Orders cannot be placed through the control channel.
- Module widget settings can only be partly set from outside.
- Settings and provider changes arrive over the socket as events only.
- Installing modules from an agent on a self-hosted server without SSO needs
  the operator token, which the CLI and MCP do not send yet. Use the Module
  Store widget with the **Operator token** field, or the REST API with the
  `x-modules-admin-token` header.

Details: [Remote control](remote-control.md).

## Modules

- **Modules are fully trusted code.** A module's backend runs inside the server
  process with the server's rights. Install only modules you would run as your
  own code. Module installs are limited to admins for this reason.
- **The SDK is not on npm yet.** Modules build only inside the repo's
  `modules/` folder, where the workspace provides `@profitmaker/module-sdk`.
- **The template still says "Example".** After `module scaffold`, change
  `displayName` and `description` in the module's `package.json`.
