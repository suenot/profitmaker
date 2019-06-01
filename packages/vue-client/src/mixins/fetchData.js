import axios from 'axios'
import _ from 'lodash'
import template from 'es6-template-strings'

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
      }, this.timer_kupi)
    },
    finish() {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    },
    genUrl(url) {
      var stock = this.stock
      // if (!stock) return
      var stockLowerCase = stock.toLowerCase()
      var pair = this.pair
      var timeframe = this.widget.timeframe
      return template(
        url,
        { serverBackend: this.serverBackend, stockLowerCase, pair, timeframe }
      )
    },
    async fetch_kupi(url) {
      return axios.get(url)
      .then((response) => {
        this.$parent.notification = {}
      return response.data
      })
      .catch(() => {
        this.tube = 'ccxt'
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
      .catch(() => {
        this.$parent.notification = {
          type: "alert",
          msg: "Can't get data",
        }
        return []
      })
    },
    async fetch() {
      var url_kupi = this.genUrl(this.template_kupi)
      var url_ccxt = this.genUrl(this.template_ccxt)
      var data
     
      data = await this.fetch_kupi(url_kupi)


      // if (this.tube === 'ccxt') {
      //   data = await this.fetch_ccxt(url_ccxt)
      // } else {
      //   if (this.firstFetch) {
      //     data = await Promise.race([
      //       this.fetch_ccxt(url_ccxt),
      //       this.fetch_kupi(url_kupi)
      //     ])
      //     this.firstFetch = false
      //   } else {
      //     data = await this.fetch_kupi(url_kupi)
      //   }
      // }


      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
    }
  },
}
