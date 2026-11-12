# Build your first dashboard

In ten minutes you will have a small scalping desk: a chart, an order book, a
trades feed and an order panel, all following one instrument. Switch the pair
once and all four switch with it.

Works the same on the hosted terminal and on your own install.

## 1. Add a dashboard

Click **+** (New dashboard) next to the tabs at the top. Double-click the new
tab to rename it `Scalping BTC`. A dashboard is a free canvas. Nothing on it is fixed.

## 2. Add the widgets

Right-click on an empty spot of the canvas. The widget menu opens. Add, one at
a time:

- **Chart**
- **Order Book**
- **Trades**
- **Place Order**

Drag each one by its title bar and resize it from the bottom-right corner.
Widgets snap to the grid, so the edges line up by themselves.

## 3. Tie them to one instrument

Every widget has a small colored circle in its header: the group selector.
Click it on the chart and pick a color, for example cyan. Then pick the same
cyan on the other three widgets.

Widgets with the same color form a group. A group holds one context:
exchange, market (spot or futures) and pair. Set the chart to `bybit`, `spot`,
`BTC/USDT`. The order book, trades and order panel follow.

Now change the pair on any of them to `ETH/USDT`. All four resubscribe at once.

## 4. A second group

Add another chart and give it a different color. It keeps its own instrument,
so you can watch ETH next to your BTC desk without the two fighting.

## Same thing from the command line

Everything above can be done by a script or an agent. With a server running and
`PROFITMAKER_TOKEN` set (see [CLI](cli.md)):

```bash
DASH=$(profitmaker dashboards create --title "Scalping BTC" | jq -r .id)
GROUP=$(profitmaker groups create --name Scalp --trading-pair BTC/USDT \
          --exchange bybit --market spot --color '#00BCD4' | jq -r .id)

profitmaker widgets add --dashboard-id "$DASH" --type chart \
  --position '{"x":20,"y":80,"width":700,"height":420}' --group-id "$GROUP"
profitmaker widgets add --dashboard-id "$DASH" --type orderbook \
  --position '{"x":740,"y":80,"width":320,"height":420}' --group-id "$GROUP"
profitmaker widgets add --dashboard-id "$DASH" --type trades \
  --position '{"x":1080,"y":80,"width":300,"height":420}' --group-id "$GROUP"

profitmaker groups set-group-context --group-id "$GROUP" --trading-pair ETH/USDT
```

If a browser is open on the same server, you see each widget appear as the
command runs. `profitmaker widgets list-types` prints every widget type you can
add, including the ones from modules.

## Try it

Make a dashboard with two groups, BTC and ETH, each with a chart and an order
book. Then run `groups set-group-context` on the BTC group with
`--trading-pair SOL/USDT`. Only the first pair of widgets should switch.

Next: [Drive the terminal with an AI agent](guide-ai-agent.md).
