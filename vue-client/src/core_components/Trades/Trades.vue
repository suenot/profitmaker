<template>
  <div class="kupi-table">
    <!-- {{widget}} -->
    <table>
      <thead>
        <tr>
          <th>price</th>
          <th>amount</th>
          <th>datetime</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in dataComputed" :key="trade.id">
          <td :style="trade.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}">
            <span>{{trade.price}}</span>
          </td>
          <td>{{trade.amount}}</td>
          <td>{{trade.datetime}}</td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
import Store from '../../stores/Store'
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data() {
    return {
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 3000,
      serverBackend: 'https://kupi.network',
    }
  },
  props: ['widget'],
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
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  watch: {
    widget: function () {
      this.finish()
      this.start()
    }
  },
  methods: {
    start() {
      if (this.widget.demo) {
        this.data = require('./data.js').default
        this.$parent.notification = {
          type: "warning",
          msg: "Demo mode: using test data",
        }
        return
      } else this.$parent.notification = {}
      this.fetch()
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
    async fetch() {
      var stock = this.stock
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var data
      if (this.tube === 'ccxt') {
        data = await this.fetchTrades_ccxt(stockLowerCase, pair)
      } else {
        data = await this.fetchTrades_kupi(stockLowerCase, pair)
      }
      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
    },
    async fetchTrades_kupi(stockLowerCase, pair) {
      return axios.get(`${this.serverBackend}/api/${stockLowerCase}/trades/${pair}`)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch(() => {
        this.tube = 'ccxt'
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
        return []
      })
    },
    async fetchTrades_ccxt(stockLowerCase, pair) {
      return axios.get(`/user-api/ccxt/${stockLowerCase}/trades/${pair}`)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch(() => {
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
        return []
      })
    }
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data).slice(0, 40)
      return _.map(data, (item)=>{
        item.datetime = item.datetime ? moment(item.datetime).format('DD.MM.YY HH:mm:ss') : 'None'
        return item
      })
    }
  },
}
</script>

<style lang="sass" scoped>
// TODO: rm trash
table
  margin: -1px
</style>
