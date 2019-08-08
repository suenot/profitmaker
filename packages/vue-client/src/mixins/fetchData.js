import axios from 'axios'
import _ from 'lodash'
import template from 'es6-template-strings'
import Store from '@/stores/Store'
import { toJS } from 'mobx'

export const fetchData = {
  data () {
    return {
      interval: '',
      tube: '',
      hash: '',
      data: [],
      serverBackend: 'https://kupi.network',
      firstFetch: true,
    }
  },
  props: ['widget'],
  fromMobx: {
    stock: { get() { return Store.stock } },
    channels: { get() { return toJS(Store.channels) } },
    pair: { get() { return Store.pair } },
    accountId: { get() { return Store.accountId } },
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
        this.data = this.demoData
        this.$parent.notification = {
          type: "warning",
          msg: "Demo mode: using test data",
        }
        return
      } else this.$parent.notification = {}
      this.fetch()
      this.interval = setInterval(()=>{
        this.fetch()
      }, 10000)
    },
    finish() {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    },
    genUrl(url) {
      var serverBackend = this.serverBackend
      var stock = (this.widget.stock !== undefined) ? this.widget.stock : this.stock
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var timeframe = this.widget.timeframe
      var accountId = this.accountId
      var type = this.widget.type
      return template(
        url,
        { serverBackend, stock, stockLowerCase, pair, timeframe, accountId, type }
      )
    },
    async _fetch(url) {
      return axios.get(url)
      .then((response) => {
        this.$parent.notification = {}
        // console.log(response.data)
        return response.data
      })
      .catch((err) => {
        // console.warn(err)
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
        return []
      })
    },
    async fetch() {
      try {
        var data
        var url
        if (this.widget.channel === undefined || this.widget.channel === 'default') {
          if (this.template_kupi === undefined || this.channels[0] === 'ccxt') {
            url = this.genUrl(this.template_ccxt)
          } else {
            url = this.genUrl(this.template_kupi)
          }
        } else {
          url = this.genUrl(this[`template_${this.widget.channel}`])
        }
        data = await this._fetch(url)
        this.data = data
      } catch(err) {console.log(err)}
    }
  },
}
