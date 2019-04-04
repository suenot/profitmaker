<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th colSpan="1">{{dataComputed.datetime}}</th>
          <th colSpan="1">{{dataComputed.totalBTC}}</th>
          <th colSpan="2">{{dataComputed.totalUSD}}</th>
        </tr>
        <tr>
          <th>coins</th>
          <th>on orders</th>
          <th>BTC</th>
          <th>USD</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in dataComputed.data" :key="item.shortName">
          <td>
            {{item.free}}  {{item.shortName}}
          </td>
          <td>
            {{item.used}}
          </td>
          <td>
            {{item.totalBTC}}
          </td>
          <td>
            {{item.totalUSD}}
          </td>
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
      demo: false,
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 1000,
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
      })
      .catch(error => {
        this.data = {}
      })
    },
  },
  computed: {
    dataComputed() {
      var data = _.cloneDeep(this.data)
      data.datetime = data.datetime !== undefined ? moment(data.datetime).format('DD.MM.YY HH:mm') : '-'
      data.totalBTC = data.totalBTC ? data.totalBTC.toFixed(8) + ' BTC' : '0 BTC'
      data.totalUSD = data.totalUSD ? data.totalUSD.toFixed(2) + ' USD' : '0 USD'
      data.data = _.map(data.data, (item)=>{
        item.free = item.free ? item.free.toFixed(8) : 0
        item.used = item.used ? item.used.toFixed(8) : 0
        item.totalBTC = item.totalBTC ? item.totalBTC.toFixed(8) : 0
        item.totalUSD = item.totalUSD ? item.totalUSD.toFixed(2) : 0
        return item
      })
      return data
    }
  }
}
</script>
