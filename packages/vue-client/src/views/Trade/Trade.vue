<template>
  <div>
    <div class="main-container">
      <div class="left-column section">
        <div class="orders-wrapper">
          <Widget :widget="blocks.Orders" />
        </div>
      </div>
      <div class="middle-column section">
        <div class="candles-wrapper">
          <Widget :widget="blocks.Candles"/>
        </div>
        <div class="create-order-wrapper">
          <div class="buy-wrapper">
            <CreateOrder type="buy" />
          </div>
          <div class="sell-wrapper">
            <CreateOrder type="sell" />
          </div>
        </div>
      </div>
      <div class="right-column section">
        <div class="selector-wrapper">
          <Widget :widget="blocks.Selector" />
        </div>
        <div class="trades-wrapper">
          <Widget :widget="blocks.Trades" />
        </div>
      </div>
    </div>
    <div class="bottom-container">
      <div class="left-column section">
        <div class="info-wrapper">
          <div class="open-orders-wrapper">
            <Widget :widget="blocks.OpenOrders" />
          </div>
          <div class="my-trades-wrapper">
            <Widget :widget="blocks.MyTrades" />
          </div>
        </div>
      </div>
      <div class="right-column section">
        <div class="balance-wrapper">
          <div class="balance-table-stock-wrapper">
            <Widget :widget="blocks.BalanceTableStock" />
          </div>
          <div class="balance-pie-stock-wrapper">
            <Widget :widget="blocks.BalancePieStock" />
          </div>
          <!-- <div class="balance-history-stock-wrapper">
            <Widget :widget="blocks.BalanceHistoryStock" />
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Store from '@/stores/Store'
import { toJS } from 'mobx'
export default {
  fromMobx: {
    blocks: {
      get() {
        return toJS(Store.blocks)
      }
    },
  },
}
</script>


<style lang="sass" scoped>
.main-container
  height: 100vh
  max-height: 100vh
  overflow: hidden
  width: 100%
  max-width: 100%
  display: -webkit-box !important
  display: flex
  .left-column
    flex: 0 0 360px
    max-width: 360px
    min-width: 360px
  .middle-column
    flex: 1 0 auto
    display: flex
    flex-direction: column
    heigth: 100vh
  .right-column
    flex: 0 0 360px
    max-width: 360px
    min-width: 360px

.create-order-wrapper
  display: flex

.orders-wrapper
  height: calc(100vh + 2px)
.candles-wrapper
  flex: 1 0 auto

.bottom-container
  height: 800px
  display: flex
  .left-column
    flex: 1 0 auto
  .info-wrapper
    display: flex
    flex-direction: column
    height: 100%
  .open-orders-wrapper, .my-trades-wrapper
    flex: 0 0 50%
    display: flex
    flex-direction: column
    .widget
      display: flex
      flex-direction: column
      .block-header
        flex: 0 0 auto
      .widget-body
        height: auto
        flex: 0 1 auto
  .right-column
    height: 100%
    flex: 0 0 360px
    max-width: 360px
    min-width: 360px
  .balance-wrapper
    display: flex
    height: 100%
    flex-direction: column
    &>div
      flex: 1 0 33%

.section
  border: 1px solid #d9d9d9
</style>
