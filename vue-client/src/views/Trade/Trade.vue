<template>
  <div>
    <div class="main-container">
      <div class="orders-wrapper section">
        <Orders type="both" />
      </div>
      <div class="candles-wrapper">
        <Candles/>
      </div>
      <!-- <div class="create-order-wrapper">
        <div class="createOrder">
          <CreateOrder type="buy"/>
        </div>
        <div class="createOrder">
          <CreateOrder type="sell"/>
        </div>
      </div> -->
      <div class="info-wrapper">
        <div class="flex my-trades-wrapper">
          <MyTrades/>
        </div>
        <div class="flex open-orders-wrapper">
          <OpenOrders/>
        </div>
      </div>
      <!-- <div class="selector-wrapper">
        <Selector/>
      </div> -->
      <div class="trades-wrapper section">
        <Trades/>
      </div>
    </div>


    <!-- <div class="flex stocks-wrapper">
      <Stocks/>
    </div>
    <div class="flex pairs-wrapper">
      <Pairs/>
    </div> -->
  </div>
</template>

<style lang="sass">
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
