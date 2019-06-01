<template>
  <div>
    <div class="actions">
      <button @click="widget.type = 'both'">
        <img src="/img/icons/type_both.png" />
      </button>
      <button @click="widget.type = 'bids'">
        <img src="/img/icons/type_bids.png" />
      </button>
      <button @click="widget.type = 'asks'">
        <img src="/img/icons/type_asks.png" />
      </button>
    </div>
    <template v-if="widget.type === 'both'">
      <OrdersSide type="asks" :data="data" sort="desc" :thead="true"/>
      <div ref="ordersCenter"></div>
      <OrdersSide type="bids" :data="data" sort="desc" :thead="false"/>
    </template>
    <OrdersSide v-if="widget.type === 'asks'" :data="data" type="asks" sort="asc" :thead="true" />
    <OrdersSide v-if="widget.type === 'bids'" :data="data" type="bids" sort="desc" :thead="true" />
  </div>
</template>

<script>
import {fetchData} from '@/mixins/fetchData'
import Store from '../../stores/Store'
import axios from 'axios'
import uuidv1 from 'uuid/v1'
export default {
  data() {
    return {
      center: false,
      demoData: require('./data.js').default,
      template_kupi: '${serverBackend}/api/${stockLowerCase}/orders/${pair}',
      template_ccxt: '/user-api/ccxt/${stockLowerCase}/orders/${pair}',
      timer_kupi: 3000,
      timer_ccxt: 10000,
    }
  },
  mixins: [fetchData],
  // fromMobx: {
  //   stock: { get() { return Store.stock } },
  //   pair: { get() { return Store.pair } },
  // },
  computed: {
    dataLength: function() {
      return this.data.length
    }
  },
  watch: {
    dataLength: function(val) {
      setTimeout(()=>{
        if (this.widget.type === 'both' && !this.center) {
          this.toCenter()
        }
      }, 200)
    }
  },
  methods: {
    toCenter() {
      var widgetHeight = this.$el.parentNode.offsetHeight
      var top = this.$refs.ordersCenter.offsetTop
      this.$el.parentNode.scrollTop = top - widgetHeight / 2
      this.center = true
    }
  }
}
// TODO: WS
// const io = require('socket.io-client')
// mounted() {
//   const socket = io('http://144.76.109.194:8051/')
//   socket.on('connect', () => {
//     // console.log('connect')
//     socket.emit('room', 'orders')
//     socket.on('BINANCE--ETH--BTC', (data) => {
//       this.data = data
//     })
//     socket.on('disconnect', () => {
//       // console.log('disconnect')
//     })
//   })
// }
</script>

<style lang="sass" scoped>
.actions
  display: flex
  button
    cursor: pointer
    flex: 1 0 auto
    outline: none
    padding: 5px 10px
    border: 1px solid rgba(0, 0, 0, 0.12)
    &:hover, &.active
      border: 1px solid rgb(245, 188, 0)
</style>
