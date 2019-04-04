<template>
  <ve-line :data="dataComputed" :settings="settingsComputed" :key="'balanceTimeseries_'+componentKey"></ve-line>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'
export default {
  data() {
    return {
      demo: false,
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 10000,
      componentKey: 0
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
    accountId: {
      get() {
        return Store.accountId
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
    fetch() {
      var {stock, accountId} = this
      var type = 'history'
      stock = 'TOTAL'
      const key = `${type}--${stock}--${accountId}`
      axios.post(`/user-api/balance/`, {
        type, key, stock, accountId
      })
      .then(response => {
        this.data = response.data
      })
      .catch(error => {
        this.data = {}
      })
    },
    forceRerender() {
      this.componentKey += 1
    },
  },
  computed: {
    settingsComputed() {
      // this.forceRerender()
      return {
        stack: { 'group1': this.data.coins },
        area: true
      }
    },
    dataComputed() {
      if (_.isEmpty(this.data)) return []
      var data = _.cloneDeep(this.data)
      var columns = ['date']
      var rows = []

      data.coins.forEach(function(coin){
        columns.push(coin)
      })

      data.timestamps.forEach(function(timestamp, i){
        var item = {'date': timestamp}
        data.series.forEach(function(coin){
          item[coin.name] = coin.data[i]
        })
        rows.push(item)
      })
      var chartData = {
        columns: columns,
        rows: rows
      }
      this.forceRerender()
      return chartData
    }
  }
}
</script>
