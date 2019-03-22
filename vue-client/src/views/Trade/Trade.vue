<template>
  <div>
    <div class="flex">
      <div class="flex-column orders-wrapper section">
        <Orders/>
      </div>
      <div class="flex-column market-wrapper section">
        <div class="candles-wrapper">
          <Candles/>
        </div>
        <div class="create-order-wrapper">create order</div>
      </div>
      <div class="flex-column trades-wrapper section">
        <Trades/>
      </div>
    </div>
    <div class="flex open-orders-wrapper">
      open orders
    </div>
    <div class="flex my-trades-wrapper">
      my trades
    </div>


  </div>
</template>

<script></script>

<style lang="sass">

.orders-wrapper
  // background: blue
  flex: 0 0 320px
  height: 100vh
.market-wrapper
  flex: 1 0 auto
  .candles-wrapper
    border-bottom: 1px solid #d9d9d9
    height: 400px
  // background: red
.trades-wrapper
  flex: 0 0 320px

  // background: yellow
.open-orders-wrapper
  flex: 1 0 auto
  border-bottom: 1px solid #d9d9d9
  // background: orange
.my-trades-wrapper
  flex: 1 0 auto
  // background: purple
  // color: white

.flex
  display: flex
.flex-column
  display: flex
  flex-direction: column
.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
</style>
