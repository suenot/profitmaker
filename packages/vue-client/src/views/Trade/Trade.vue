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
        <div class="info-wrapper">
          <div class="my-trades-wrapper">
            <Widget :widget="blocks.MyTrades" />
          </div>
          <div class="open-orders-wrapper">
            <Widget :widget="blocks.OpenOrders" />
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
  </div>
</template>

<script>
import Store from '../../stores/Store'
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

.orders-wrapper
  height: calc(100vh + 2px)
.candles-wrapper
  flex: 0 0 505px
  height: 505px
  min-height: 505px
  // border-bottom: 1px solid #d9d9d9
.info-wrapper
  flex: 0 0 calc(100vh - 505px)
  display: flex
  flex-direction: column

.trades-wrapper
  height: calc(100vh + 2px)

.open-orders-wrapper, .my-trades-wrapper
  flex: 0 1 50%
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
      height: calc( (100vh - 505px - 66px) / 2)

.section
  border: 1px solid #d9d9d9
  // margin: -1px
  // background: white
  // overflow-y: auto
  // overflow-x: hidden
</style>
