<template>
  <div>
    <div class="main-container">
      <div class="orders-wrapper section">
        <Widget :widget="widgetOrders" />
      </div>
      <div class="candles-wrapper">
        <Widget :widget="widgetCandles" />
      </div>
      <div class="info-wrapper">
        <div class="flex my-trades-wrapper">
          <Widget :widget="widgetMyTrades" />
        </div>
        <div class="flex open-orders-wrapper">
          <Widget :widget="widgetOpenOrders" />
        </div>
      </div>
      <div class="trades-wrapper section">
        <Widget :widget="widgetTrades" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    widgetOrders: require('@/core_components/Orders/config.js').default,
    widgetTrades: require('@/core_components/Trades/config.js').default,
    widgetCandles: require('@/core_components/Candles/config.js').default,
    widgetMyTrades: require('@/core_components/MyTrades/config.js').default,
    widgetOpenOrders:require('@/core_components/OpenOrders/config.js').default,
  }),
}
</script>


<style lang="sass" scoped>
.main-container
  display: grid
  grid-template-columns: [start] 380px [line1] auto [line2] 310px [end]
  grid-template-rows: [row1-start] 78px [selector] 390px [third-line] auto [last-line]

.orders-wrapper
  grid-column: start / line1
  grid-row: row1-start / last-line
  height: 100vh
.candles-wrapper
  grid-column: line1 / span line2
  grid-row: row1-start / span third-line
  justify-self: stretch
  align-self: stretch
.info-wrapper
  grid-column: line1 / span line2
  grid-row: third-line / span last-line
  justify-self: stretch
  align-self: stretch
.selector-wrapper
  grid-column: line2 / span end
  grid-row: row1-start / span selector
.trades-wrapper
  grid-column: line2 / span end
  grid-row: row1-start / span last-line
  height: 100vh
.my-trades-wrapper
  overflow-y: auto
  height: 214px
.open-orders-wrapper
  height: 214px
  overflow-y: auto

.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
  overflow-y: auto
  overflow-x: hidden
</style>
