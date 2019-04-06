<template>
  <ve-candle :data="dataComputed" :settings="chartSettings" :events="chartEvents" height="435px" key="echarts-candles"></ve-candle>
</template>


<script>
import Store from '../../stores/Store'
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data () {
    this.chartEvents = {
      dataZoom: (e)=>{
        this.chartSettings.start = e.start
        this.chartSettings.end = e.end
      },
    }
    return {
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 1000,
      serverBackend: 'https://kupi.network',
      timeframe: '1m',
      firstFetch: true,
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
      return data
    },
    chartSettings: function() {
      return {
        showMA: true,
        showVol: true,
        digit: 8,
        MA: [5, 10, 20, 30],
        downColor: '#ec0000',
        upColor: '#00da3c',
        dataType: 'normal', // 'KMB', 'normal', 'percent'
        labelMap: {
          '日K': `${this.widget.timeframe}`
        },
        legendName: {
          '日K': `${this.widget.timeframe}`,
        },
        showDataZoom: true,
      }
    }
  },
}
</script>

<style lang="sass">
.ve-candle
  height: auto
</style>
