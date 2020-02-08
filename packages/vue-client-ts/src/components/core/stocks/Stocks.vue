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

<script lang="ts">
import _ from 'lodash'
import axios from 'axios'
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {Account, WidgetConfig} from '@/types'
import {namespace, State} from 'vuex-class'

const AppModule = namespace('app')

@Component({
  name: 'Stocks'
})
export default class Stocks extends Vue {
  data: any = []

  timer: number = 1000

  serverBackend: string = 'https://kupi.network'

  filter: string = ''

  interval: number | null = null

  $parent!: any

  @Prop()
  widget!: WidgetConfig
  mounted () {
    this.start()
  }
  beforeDestroy () {
    this.finish()
  }

  @AppModule.Action('setStock')
  setStock!: Function

  @Watch('widget')
  watchWidget () {
    this.finish()
    this.start()
  }

  async fetchStocksKupi () {
    return axios.get(`${this.serverBackend}/api/stocks`)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch(() => {
        this.$parent.notification = {
          type: 'alert',
          msg: "Can't get data",
        }
        return []
      })
  }

  async fetchStocksCcxt () {
    return axios.get(`/user-api/ccxt/stocks`)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch(() => {
        this.$parent.notification = {
          type: 'alert',
          msg: "Can't get data",
        }
        return []
      })
  }

  async fetch () {
    // create empty vars
    const kupiStocks = await this.fetchStocksKupi()
    const ccxtStocks = await this.fetchStocksCcxt()
    // add rateLimit to kupiStocks
    for (let kupiStock of kupiStocks) {
      if (kupiStock.rateLimit === undefined) {
        const _stock = _.find(ccxtStocks, function (ccxtStock) {
          return ccxtStock.name === kupiStock.name
        })
        if (_stock !== undefined) {
          kupiStock.rateLimit = _stock.rateLimit
        }
      }
    }
    // combine lists
    const stocks = _.uniqBy([...kupiStocks, ...ccxtStocks], 'name')
    // write to state
    this.data = stocks
  }

  start () {
    if (this.widget && this.widget.demo) {
      this.data = require('./data.json')
      this.$parent.notification = {
        type: 'warning',
        msg: 'Demo mode: using test data',
      }
      return
    } else this.$parent.notification = {}
    this.fetch()
    this.interval = window.setInterval(() => {
      this.fetch()
    }, this.timer)
  }

  finish () {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  @State('accounts', { namespace: 'account' })
  accounts!: Account[] | null

  get stocksComputed () {
    const data = []
    let stocks = _.clone(this.data)
    stocks = stocks.filter((stock: any) => {
      return stock.name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1
    })
    for (let stock of stocks) {
      // TODO: insert as is, not reassemble an object
      data.push({
        id: stock.name,
        name: stock.name,
        rateLimit: stock.rateLimit || 3000,
        channels: stock.channels,
      })
      if (this.accounts) {
        for (let account of Object.values(this.accounts)) {
          try {
            if (account.stock.toUpperCase() === stock.name) {
              // TODO: insert as is, not reassemble an object
              data.push({
                id: `${stock.name}--${account.id}`,
                name: stock.name,
                accountId: account.id,
                accountName: account.name,
                rateLimit: stock.rateLimit || 3000,
                channels: ['kupi'], // TODO: remove crutch
              })
            }
          } catch (err) {}
        }
      }
    }
    return data
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
