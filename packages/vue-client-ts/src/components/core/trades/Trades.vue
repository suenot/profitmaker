<template>
  <div>
    <table class="simpleTable" v-if="data">
      <thead>
      <tr>
        <th>price</th>
        <th>amount</th>
        <th>datetime</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="item in data.slice(0, 40)" :key="item.id">
        <td :style="item.side === 'buy' ? { color: '#EA0371' } : { color: '#83B327' }">
          <span>{{item.price}}</span>
        </td>
        <td>{{item.amount}}</td>
        <td>{{ momentCompute(item.datetime).format('DD.MM.YY HH:mm:ss') }}</td>
      </tr>
      </tbody>
    </table>
    <Preloader v-else />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import moment from 'moment'
import Preloader from '../Preloader.vue'
import axios from 'axios'
import _ from 'lodash'
import { State } from 'vuex-class'

@Component({
  name: 'Trades.vue',
  components: {
    Preloader
  }
})
export default class Trades extends Vue {
  @State
  stock!: string

  @State
  pair!: string

  interval: number | null = null
  tube: string = ''
  hash: string = ''
  data: any[] = []
  timer: number = 1000
  serverBackend: string = 'https://kupi.network'

  momentCompute (date: Date) {
    return moment(date)
  }

  created () {
    // const { stock, pair } = this.$props.data
    // const key = `${stock}--${pair}`
    // const data = this.state.data
  }

  mounted () {
    this.start()
  }

  beforeDestroy () {
    this.finish()
  }

  async fetchTradesKupi (stockLowerCase: string, pair: string) {
    return axios.get(`${this.serverBackend}/api/${stockLowerCase}/trades/${pair}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        this.tube = 'ccxt'
        return []
      })
  }

  async fetchTradesCcxt (stockLowerCase: string, pair: string) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/trades/${pair}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        return []
      })
  }

  async fetchTrades () {
    const { stock, pair } = { stock: this.stock, pair: this.pair }
    const stockLowerCase = stock.toLowerCase()

    let data
    if (this.tube === 'ccxt') {
      data = await this.fetchTradesCcxt(stockLowerCase, pair)
    } else {
      data = await this.fetchTradesKupi(stockLowerCase, pair)
    }

    if (this.hash === JSON.stringify(data)) {
      return true
    }
    this.hash = JSON.stringify(data)
    this.data = _.orderBy(data, ['timestamp'], ['desc'])
  }

  start () {
    this.interval = window.setInterval(this.fetchTrades, this.timer)
  }

  finish () {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
</script>

<style scoped>

</style>
