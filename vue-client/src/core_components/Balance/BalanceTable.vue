<template>
  <div class="kupi-table">
    <h1>BALANCE</h1>
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
      interval: '',
      tube: '',
      hash: '',
      data: [],
      timer: 1000,
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
      console.log('fetch')
      var type = 'now'
      if (this.widget.accountId !== undefined && this.widget.accountId !== '') {
        var accountId = this.widget.accountId
      } else {
        var accountId = this.accountId
      }

      if (this.widget.stock !== undefined && this.widget.stock !== '') {
        var stock = this.widget.stock
      } else {
        var stock = 'TOTAL'
      }
      console.log(accountId, stock)
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
