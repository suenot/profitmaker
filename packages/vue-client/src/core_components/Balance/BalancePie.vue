<template>
  <ve-pie :data="dataComputed" :key="'balancePie_'+componentKey"></ve-pie>
</template>

<script>
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
      timer: 10000,
      componentKey: 0
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
    accountId: {
      get() {
        return Store.accountId
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
    fetch() {
      var {stock, accountId} = this
      var type = 'now'
      stock = 'TOTAL'
      const key = `${type}--${stock}--${accountId}`
      axios.post(`/user-api/balance/`, {
        type, key, stock, accountId
      })
      .then(response => {
        this.data = response.data
        this.$parent.notification = {}
      })
      .catch(error => {
        this.data = {}
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
      })
    },
    forceRerender() {
      this.componentKey += 1
    },
  },
  computed: {
    dataComputed() {
      if (_.isEmpty(this.data)) return []
      var data = _.cloneDeep(this.data)
      var legendData = ['name', 'USD', 'BTC', 'free', 'used']
      var seriesData = []
      var totalUSD = data.totalUSD
      var otherUSD = 0
      // var otherBTC = 0
      data.data.forEach(function(coin){
        if (coin.totalUSD !== 0) {
          if ( (coin.totalUSD/totalUSD*100 ) > 5) {
            seriesData.push({
              name: coin.shortName,
              USD: coin.totalUSD.toFixed(2)
              // BTC: coin.totalBTC.toFixed(8),
              // free: coin.free.toFixed(8),
              // used: coin.used.toFixed(8)
            })
          } else {
            otherUSD += coin.totalUSD
            // otherBTC += coin.totalBTC
          }
        }
      })
      seriesData.push({
        name: 'OTHER',
        USD: otherUSD.toFixed(2)
        // BTC: otherBTC.toFixed(8)
      })

      var chartData = {
        columns: legendData,
        rows: seriesData
      }

      // this.forceRerender()
      return chartData
    }
  }
}
</script>
