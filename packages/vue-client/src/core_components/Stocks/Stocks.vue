<template>
  <div class="kupi-table">
    <el-input placeholder="Filter" v-model="filter" type="text"></el-input>
    <table>
      <tbody>
        <tr v-for="stock in stocksComputed" :key="stock.id" @click="setStock(stock)">
          <td class="stock-cell">
            <span class="left">{{stock.name}}</span>
            <div class="right">
              <span class="muted" v-if="stock.accountName">{{stock.accountName}}</span>
              <span class="muted" v-if="stock.channels && stock.channels.length > 0">{{stock.channels[0]}}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Store from '@/stores/Store'
import AccountsStore from '@/stores/AccountsStore'
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
      interval: ''
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
        // TODO: вставлять как есть, а не заново собирать объект
        data.push({
          id: stock.name,
          name: stock.name,
          rateLimit: stock.rateLimit || 3000,
          channels: stock.channels,
        })
        for (let account of Object.values(AccountsStore.accounts)) {
          try {
            if (account.stock.toUpperCase() === stock.name) {
              // TODO: вставлять как есть, а не заново собирать объект
              data.push({
                id: `${stock.name}--${account.id}`,
                name: stock.name,
                accountId: account.id,
                accountName: account.name,
                rateLimit: stock.rateLimit || 3000,
                channels: ['kupi'], // TODO: убрать костыль
              })
            }
          } catch(err) {}
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
  padding: 0
  .left
    padding: 5px
  .right
    display: flex
    span
      padding: 5px
      border-left: 1px solid #ddd
      &.active
        background: #eee
    select
      padding: 5px
      border-left: 1px solid #ddd
      border-radius: 0
      border-bottom: 0px solid #ddd
      border-top: 0px solid #ddd
</style>

