import axios from 'axios'
import _ from 'lodash'
import template from 'es6-template-strings'
import Store from '@/stores/Store'
// import { Notification } from 'element-ui'

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
      var stock = this.widget.stock ? this.widget.stock : this.stock
      // if (!stock) return
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
    async fetch_kupi(url) {
      return axios.get(url)
      .then((response) => {
        this.$parent.notification = {}
      return response.data
      })
      .catch(() => {
        // this.tube = 'ccxt'
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
        return []
      })
    },
    async fetch_ccxt(url) {
      return axios.get(url)
      .then((response) => {
        this.$parent.notification = {}
        return response.data
      })
      .catch((err) => {
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
        return []
      })
    },
    async fetch() {
      var data
      // TODO: пока заглушка, нужно брать настройки из стора
      if (this.template_kupi === undefined) {
        var url_ccxt = this.genUrl(this.template_ccxt)
        data = await this.fetch_ccxt(url_ccxt)
      } else {
        var url_kupi = this.genUrl(this.template_kupi)
        data = await this.fetch_kupi(url_kupi)
      }
      


      if (this.tube === 'ccxt') {
        data = await this.fetch_ccxt(url_ccxt)
      } else {
        if (this.firstFetch) {
          data = await Promise.race([
            this.fetch_ccxt(url_ccxt),
            this.fetch_kupi(url_kupi)
          ])
          this.firstFetch = false
        } else {
          data = await this.fetch_kupi(url_kupi)
        }
      }


      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
    }
  },
}
