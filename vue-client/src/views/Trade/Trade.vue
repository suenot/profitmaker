<template>
  <div>
    <div class="main-container">
      <div class="left-column">
        <div class="orders-wrapper section">
          <Widget :widget="blocks.Orders" />
        </div>
      </div>
      <div class="middle-column">
        <div class="candles-wrapper">
          <Widget :widget="blocks.ReactStockcharts"/>
        </div>
        <div class="info-wrapper">
          <div class="flex my-trades-wrapper">
            <Widget :widget="blocks.MyTrades" />
          </div>
          <div class="flex open-orders-wrapper">
            <Widget :widget="blocks.OpenOrders" />
          </div>
        </div>
      </div>
      <div class="right-column">
        <div class="trades-wrapper section">
          <Widget :widget="blocks.Trades" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ReactWrapper } from 'vuera'
import { ReactInVue } from 'vuera'
// import ReactStockcharts from '@/react_components/ReactStockcharts/index.js'
import Store from '../../stores/Store'
import { toJS } from 'mobx'
export default {
  data() {
    return {
      // component: ReactStockcharts,
      data: {
        stock: 'BINANCE',
        pair: 'ETH_BTC',
        name: "Candles",
        component: "ReactStockcharts",
        settings: "",
        settingsWidth: 300,
        img: "core_components/Candles/Candles.png",
        title: "Candles",
        customTitle: "",
        description: "Open-High-Low-Close-Value candles chart",
        author: "#core",
        authorLink: "https://github.com/kupi-network/kupi-terminal",
        source: "",
        demo: false,
        timeframe: "1m",
        // stock: undefined,
        // pair: undefined,
        categories: ["Trades", "Candles"],
      }
    }
  },
  fromMobx: {
    blocks: {
      get() {
        return toJS(Store.blocks)
      }
    },
  },
  // components: { 'react-stock-charts': ReactStockcharts },
  // components: { react: ReactWrapper },
  // components: { 'react-stock-charts': ReactStockcharts },
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
  flex: 0 0 280px
  max-width: 280px
  min-width: 280px

.orders-wrapper
  height: calc(100vh + 2px)
.candles-wrapper
  flex: 0 0 430px
  height: 505px
.info-wrapper
  flex: 0 1 auto
  display: flex
  flex-direction: column

.trades-wrapper
  height: calc(100vh + 2px)
.my-trades-wrapper
  overflow-y: auto
  flex: 1 1 50%
.open-orders-wrapper
  flex: 1 1 50%
  overflow-y: auto

.section
  border: 1px solid #d9d9d9
  margin: -1px
  background: white
  overflow-y: auto
  overflow-x: hidden
</style>
