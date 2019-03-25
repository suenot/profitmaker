<template>
  <div>
    <div class="main-container">
      <div class="orders-wrapper section">
        <Orders/>
      </div>
      <div class="candles-wrapper">
        <Candles/>
      </div>
      <div class="create-order-wrapper">
        <div class="createOrder">
          <CreateOrder type="buy"/>
        </div>
        <div class="createOrder">
          <CreateOrder type="sell"/>
        </div>
      </div>
      <div class="selector-wrapper">
        <Selector/>
      </div>
      <div class="trades-wrapper section">
        <Trades/>
      </div>
    </div>

    <div class="flex open-orders-wrapper">
      <OpenOrders/>
    </div>
    <div class="flex my-trades-wrapper">
      <MyTrades/>
    </div>
    <div class="flex stocks-wrapper">
      <Stocks/>
    </div>
    <div class="flex pairs-wrapper">
      <Pairs/>
    </div>
  </div>
</template>

<script></script>

<style lang="sass">
.main-container
  display: grid
  grid-template-columns: [start] 320px [line1] auto [line2] 320px [end]
  grid-template-rows: [row1-start] 100px [selector] 500px [third-line] auto [last-line]
.orders-wrapper
  grid-column: start / line1
  grid-row: row1-start / last-line
.candles-wrapper
  grid-column: line1 / span line2
  grid-row: row1-start / span third-line
  justify-self: stretch
  align-self: stretch
.create-order-wrapper
  grid-column: line1 / span line2
  grid-row: third-line / span last-line
  justify-self: stretch
  align-self: stretch
  display: flex
  .createOrder
    flex: 0 0 50%
.selector-wrapper
  grid-column: line2 / span end
  grid-row: row1-start / span selector
.trades-wrapper
  grid-column: line2 / span end
  grid-row: selector / span last-line









// .orders-wrapper
//   flex: 0 0 420px
//   height: 100vh
//   max-height: 100vh
// .market-wrapper
//   flex: 1 0 auto
//   height: 100vh
//   max-height: 100vh
//   .candles-wrapper
//     border-bottom: 1px solid #d9d9d9
//     height: 500px
// .trades-wrapper
//   flex: 0 0 320px
//   height: calc(100vh - 79px)
//   max-height: calc(100vh - 79px)
// .open-orders-wrapper
//   flex: 1 0 auto
//   border-bottom: 1px solid #d9d9d9
// .create-order-wrapper
//   display: flex
//   flex: 1 0 auto
//   width: 100%
//   .createOrder
//     flex: 0 0 50%
// .my-trades-wrapper
//   width: 100%
//   flex: 1 0 auto

// .flex
//   display: flex
// .flex-column
//   display: flex
//   flex-direction: column
.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
  overflow-y: auto
  overflow-x: hidden
</style>
