<template>
  <div />
</template>

<script lang="ts">
import axios from 'axios'
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { ApiData, WidgetConfig } from '@/types'
import { State } from 'vuex-class'

const template = require('es6-template-strings')

@Component({
  name: 'FetchData'
})
export default class FetchData extends Vue {
  @State('channels', {namespace: 'app'})
  channels: any

  @State('pair', {namespace: 'app'})
  pair: any

  @State
  accountId: any

  $parent!: any

  demoData: any;

  interval: number | null = null;

  tube: string = '';

  hash: string = '';

  data: ApiData | null = null;

  serverBackend: string = 'https://kupi.network';

  firstFetch: boolean = true

  templateKupi!: string

  templateCcxt!: string

  @Prop()
  widget!: WidgetConfig

  created () {
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

  url: string = ''

  async start () {
    if (this.widget.demo) {
      this.data = this.demoData
      this.$parent.notification = {
        type: 'warning',
        msg: 'Demo mode: using test data'
      }
      return
    } else {
      this.$parent.notification = {}
    }
    this.url = this.genUrl(
      this.channels[0] === 'ccxt'
        ? this.templateCcxt
        : this.templateKupi
    )
    if (!this.url || this.url === 'undefined') {
      console.error(`${this.widget.title} invalid url. ${this.url}`)
      return
    }
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
    const stock = this.$store.state.app.stock
    const serverBackend = this.serverBackend
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

  async fetch () {
    this.data = await axios.get(this.url)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch((err) => {
        console.warn(`${this.widget.title} ${err}`)
        this.$parent.notification = {
          type: 'alert',
          msg: "Can't get data"
        }
        return null
      })
  }
}
</script>

<style scoped>

</style>
