import Store from '@/stores/Store'
import axios from 'axios'
import _ from 'lodash'

export const FetchData = {
  data () {
    return {
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 5000,
      serverBackend: 'https://kupi.network',
      firstFetch: true,
    }
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
    async fetchOhlcv_kupi(stockLowerCase, pair, timeframe) {
      return axios.get(`${this.serverBackend}/api/${stockLowerCase}/candles/${pair}/${timeframe}`)
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
    async fetchOhlcv_ccxt(stockLowerCase, pair, timeframe) {
      return axios.get(`/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}`)
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
    },
    async fetch() {
      var stock = this.stock
      if (!stock) return
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var timeframe = this.widget.timeframe
      var data
      if (this.tube === 'ccxt') {
        data = await this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe)
      } else {
        if (this.firstFetch) {
          data = await Promise.race([
            this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe),
            this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
          ])
          this.firstFetch = false
        } else {
          data = await this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
        }
      }
      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
    }
  },
}
