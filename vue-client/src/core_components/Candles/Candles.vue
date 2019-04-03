<template>
  <ve-candle :data="dataComputed" :settings="chartSettings" height="500px" key="echarts-candles" :key="componentKey"></ve-candle>
</template>


<script>
import Store from '../../stores/Store'
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data () {
    this.chartSettings = {
      showMA: true,
      showVol: true,
      digit: 8,
      MA: [5, 10, 20, 30],
      downColor: '#ec0000',
      upColor: '#00da3c',
      dataType: 'normal', // 'KMB', 'normal', 'percent'
      labelMap: {
        '日K': '5m'
      },
      legendName: {
        '日K': 'ETH_BTC 15m',
      },
      showDataZoom: true
    }
    return {
      componentKey: 0,
      demo: false,
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 5000,
      serverBackend: 'https://kupi.network',
      timeframe: '1m',
      firstFetch: true
    }
  },
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
  methods: {
    forceRerender() {
      // this.componentKey += 1
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
    async fetch() {
      var stock = this.stock
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var data
      if (this.tube === 'ccxt') {
        data = await this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe)
      } else {
        data = await this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
      }
      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
    },
    async fetchOhlcv_kupi(stockLowerCase, pair, timeframe) {
      return axios.get(`${this.serverBackend}/api/${stockLowerCase}/candles/${pair}/${timeframe}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        this.tube = 'ccxt'
        return []
      })
    },
    async fetchOhlcv_ccxt(stockLowerCase, pair, timeframe) {
      return axios.get(`/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        return []
      })
    },
    async fetch() {
      var stock = this.stock
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var timeframe = this.timeframe
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
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      data = _.map(data, (item)=>{
        return {
          date: moment(item[0]).format('DD.MM.YY HH:mm'),
          open: item[1],
          close: item[4],
          lowest: item[3],
          highest: item[2],
          vol: item[5]
        }
      })
      data = {
        columns: ['date', 'open', 'close', 'lowest', 'highest', 'vol'],
        rows: data
      }
      this.forceRerender()
      return data
    }
  },
}
</script>

<style lang="sass">
.ve-candle
  height: auto
</style>
