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
        <div class="create-order-wrapper">
          <div class="createOrder">
            <CreateOrder type="buy"/>
          </div>
          <div class="createOrder">
            <CreateOrder type="sell"/>
          </div>
        </div>
      </div>
      <div>
        <div class="flex selector-wrapper">
          <Selector/>
        </div>
        <div class="flex-column trades-wrapper section">
          <Trades/>
        </div>
      </div>
    </div>
    <div class="flex open-orders-wrapper">
      <OpenOrders/>
    </div>
    <div class="flex my-trades-wrapper">
      <MyTrades/>
    </div>
  </div>
</template>

<script></script>

<style lang="sass">

.orders-wrapper
  flex: 0 0 420px
  height: 100vh
  max-height: 100vh
.market-wrapper
  flex: 1 0 auto
  height: 100vh
  max-height: 100vh
  .candles-wrapper
    border-bottom: 1px solid #d9d9d9
    height: 500px
.trades-wrapper
  flex: 0 0 320px
  height: calc(100vh - 79px)
  max-height: calc(100vh - 79px)
.open-orders-wrapper
  flex: 1 0 auto
  border-bottom: 1px solid #d9d9d9
.create-order-wrapper
  display: flex
  flex: 1 0 auto
  width: 100%
  .createOrder
    flex: 0 0 50%
.my-trades-wrapper
  width: 100%
  flex: 1 0 auto

.flex
  display: flex
.flex-column
  display: flex
  flex-direction: column
.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
  overflow-y: scroll
  overflow-x: hidden
</style>
