<template>
  <div>
    <div class="actions">
      <button @click="type = 'both'">
        <img src="/img/icons/type_both.png" />
      </button>
      <button @click="type = 'bids'">
        <img src="/img/icons/type_bids.png" />
      </button>
      <button @click="type = 'asks'">
        <img src="/img/icons/type_asks.png" />
      </button>
    </div>
    <template v-if="type === 'both'">
      <OrdersSide type="asks" :data="data" sort="desc" :thead="true"/>
      <div ref="ordersCenter"></div>
      <OrdersSide type="bids" :data="data" sort="desc" :thead="false"/>
    </template>
    <OrdersSide v-if="type === 'asks'" :data="data" type="asks" sort="asc" :thead="true" />
    <OrdersSide v-if="type === 'bids'" :data="data" type="bids" sort="desc" :thead="true" />
  </div>
</template>

<script>
import Store from '../../stores/Store'
import axios from 'axios'
import uuidv1 from 'uuid/v1'
export default {
  data() {
    return {
      demo: false,
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 3000,
      serverBackend: 'https://kupi.network',
      center: false,
    }
  },
  props: ['type'],
  fromMobx: {
    stock: {
      get() {
        return Store.stock
      }
    },
    pair: {
      get() {
        return Store.pair
      }
    },
  },
  mounted() {
    if (this.demo) {
      this.data = require('./data.js').default
      return
    }
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  methods: {
    async fetchOrders_kupi(stockLowerCase, pair) {
      return axios.get(`${this.serverBackend}/api/${stockLowerCase}/orders/${pair}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        this.tube = 'ccxt'
        this.timer = 3000*5
        return {
          'asks': [],
          'bids': []
        }
      })
    },
    async fetchOrders_ccxt(stockLowerCase, pair) {
      return axios.get(`/user-api/ccxt/${stockLowerCase}/orders/${pair}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        return {
          'asks': [],
          'bids': []
        }
      })
    },
    async fetch() {
      var stock = this.stock
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var data
      if (this.tube === 'ccxt') {
        data = await this.fetchOrders_ccxt(stockLowerCase, pair)
      } else {
        data = await this.fetchOrders_kupi(stockLowerCase, pair)
      }
      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
      if (this.type === 'both' && !this.center) {
        setTimeout(()=>{
          this.toCenter()
        }, 200)
      }
    },
    start() {
      this.interval = setInterval(()=>{
        this.fetch()
      }, this.timer)
    },
    finish() {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    },
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
    border: 1px solid rgba(0, 0, 0, 0.12) //rgb(230, 230, 230)
    // background-color: rgb(29, 29, 29)
    &:hover, &.active
      border: 1px solid rgb(245, 188, 0)
</style>
