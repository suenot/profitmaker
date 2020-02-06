<template>
  <div />
</template>

<script lang="ts">
import axios from 'axios'
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { Orders, WidgetConfig } from '@/types'
import { State } from 'vuex-class'

const template = require('es6-template-strings')

@Component({
  name: 'FetchData'
})
export default class FetchData extends Vue {
  @State
  stock: any

  @State
  channels: any

  @State
  pair: any

  @State
  accountId: any

  $parent!: any

  demoData: any;

  interval: number | null = null;

  tube: string = '';
  hash: string = '';
  data: Orders[] = [];
  serverBackend: string = 'https://kupi.network';
  firstFetch: boolean = true

  // eslint-disable-next-line
  templateKupi: string = '${serverBackend}/api/${stockLowerCase}/orders/${pair}';
  // eslint-disable-next-line
  templateCcxt: string = '/user-api/ccxt/${stockLowerCase}/orders/${pair}';

  @Prop()
  widget!: WidgetConfig

  mounted () {
    this.start()
  }

  beforeDestroy () {
    this.finish()
  }

  @Watch('widget')
  watchWidget () {
    this.finish()
    this.start()
  }

  start () {
    if (this.widget.demo) {
      this.data = this.demoData
      this.$parent.notification = {
        type: 'warning',
        msg: 'Demo mode: using test data'
      }
      return
    } else this.$parent.notification = {}
    this.fetch()
    this.interval = window.setInterval(this.fetch, 10000)
  }

  finish () {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  genUrl (url: string) {
    const serverBackend = this.serverBackend
    const stock = (this.widget.stock !== undefined) ? this.widget.stock : this.stock
    const stockLowerCase = stock.toLowerCase()
    const pair = this.pair
    const timeframe = this.widget.timeframe
    const accountId = this.accountId
    const type = this.widget.type
    return template(
      url,
      {
        serverBackend, stock, stockLowerCase, pair, timeframe, accountId, type
      }
    )
  }

  async _fetch (url: string) {
    return axios.get(url)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch((err) => {
        console.warn(err)
        this.$parent.notification = {
          type: 'alert',
          msg: "Can't get data"
        }
        return []
      })
  }

  async fetch () {
    try {
      const url = this.channels[0] === 'ccxt'
        ? this.genUrl(this.templateCcxt)
        : this.genUrl(this.templateKupi)
      this.data = await this._fetch(url)
    } catch (err) { console.log(err) }
  }
}
</script>

<style scoped>

</style>
