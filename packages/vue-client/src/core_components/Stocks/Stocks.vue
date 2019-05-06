<template>
  <div class="kupi-table">
    <el-input placeholder="Filter" v-model="filter" type="text"></el-input>
    <table>
      <tbody>
        <tr v-for="stock in stocksComputed" :key="stock.id" @click="setStock(stock)">
          <td class="stock-cell">
            <span>{{stock.name}}</span>
            <span class="muted">{{stock.accountName}}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Store from '../../stores/Store'
import AccountsStore from '../../stores/AccountsStore'
import _ from 'lodash'
import axios from 'axios'
export default {
  data() {
    return {
      data: [],
      // demo: false,
      // hash: '',
      timer: 1000,
      serverBackend: 'https://kupi.network',
      filter: '',
      interval: '',
    }
  },
  props: ['widget'],
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
    setStock(stock) {
      Store.setStock(stock)
    },
    async fetchStocks_kupi() {
      return axios.get(`${this.serverBackend}/api/stocks`)
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
    async fetchStocks_ccxt() {
      return axios.get(`/user-api/ccxt/stocks`)
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
      // create empty vars
      var kupiStocks = await this.fetchStocks_kupi()
      var ccxtStocks = await this.fetchStocks_ccxt()
      // add rateLimit to kupiStocks
      for (let kupiStock of kupiStocks) {
        if (kupiStock.rateLimit === undefined) {
          var _stock = _.find(ccxtStocks, function(ccxtStock) {
            return ccxtStock.name == kupiStock.name
          })
          if (_stock !== undefined) {
            kupiStock.rateLimit = _stock.rateLimit
          }
        }
      }
      // combine lists
      var stocks = _.uniqBy([...kupiStocks, ...ccxtStocks], 'name')
      // write to state
      this.data = stocks
    },
    start() {
      if (this.widget && this.widget.demo) {
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
  },
  computed: {
    stocksComputed: function() {
      var data = []
      var stocks = _.clone(this.data)
      stocks = stocks.filter((stock) => {
        return stock.name.toLowerCase().indexOf( this.filter.toLowerCase() ) !== -1
      })
      for (let stock of stocks) {
        data.push({
          id: stock.name,
          name: stock.name,
          kupi: stock.kupi || false,
          ccxt: stock.ccxt || false,
          rateLimit: stock.rateLimit || 3000
        })
        for (let account of Object.values(AccountsStore.accounts)) {
          if (account.stock.toUpperCase() === stock.name) {
            data.push({
              id: `${stock.name}--${account.id}`,
              name: stock.name,
              accountId: account.id,
              accountName: account.name,
              kupi: stock.kupi || false,
              ccxt: stock.ccxt || false,
              rateLimit: stock.rateLimit || 3000
            })
          }
        }
      }
      return data
    }
  }
}
</script>

<style lang="sass" scoped>
.stock-cell
  display: flex
  justify-content: space-between
</style>

