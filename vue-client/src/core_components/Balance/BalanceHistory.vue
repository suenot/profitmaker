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
    if (this.widget.demo) {
      this.data = require('./data.js').default
      this.$parent.notification = {
        type: "warning",
        msg: "Demo mode: using test data",
      }
      return
    } else this.$parent.notification = {}
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  methods: {
    start() {
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
      var type = 'history'
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
      // this.forceRerender()
      return chartData
    }
  }
}
</script>
