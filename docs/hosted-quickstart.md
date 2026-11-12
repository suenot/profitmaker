# Hosted quickstart

The fastest way to see Profitmaker is the copy we run at
[terminal.marketmaker.cc](https://terminal.marketmaker.cc). Nothing to install.

## 1. Open the terminal and sign in

Go to [terminal.marketmaker.cc](https://terminal.marketmaker.cc) and click
**Login with MarketMaker** in the top right. You sign in once at
`auth.marketmaker.cc`, and the same account works across the MarketMaker
products. The terminal needs the sign-in even for public market data, because
every request goes through its server.

## 2. Look around

The default dashboard has a chart, an order book and a trades feed. Your
dashboards are saved to your account and follow you to any browser.

## 3. Connect an exchange account

Open the user drawer (your name in the top right), find **Exchange accounts**
and click **Add account**. Pick the exchange, give the account a label, paste
the API key and secret.

The keys go to the MarketMaker vault, not to the browser. The terminal server
fetches them only when it needs to sign a request for you. Start with a
read-only key, and turn on trading only when you are ready.

Once the account is added, the portfolio, balances and order widgets can use
it.

## 4. Make the layout yours

- Right-click on an empty part of the canvas to add a widget.
- Drag a widget by its title bar, resize it from the corner. Widgets snap to
  the grid.
- Put widgets in a group (the colored dot in the widget header). Change the
  pair in one widget of the group and every widget in it follows.
- Add more dashboards as tabs, for example one per strategy.

[Build your first dashboard](guide-first-dashboard.md) walks through a full
scalping layout step by step.

## 5. Add modules

Right-click the canvas and add the **Module Store** widget to install widgets
other people wrote. Each module
can also be switched on or off just for your terminal. See
[Modules](modules.md).

## Next

- Want an agent to build layouts for you: [Drive the terminal with an AI agent](guide-ai-agent.md).
- Want to change the code: [Self-host from source](getting-started.md).
