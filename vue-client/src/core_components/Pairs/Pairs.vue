<template>
  <div class="kupi-table">
    <el-input placeholder="Filter" v-model="filter" type="text"></el-input>
    <table>
      <tbody>
        <tr v-for="item in data" :key="item" @click="setPair(item)">
          <td>{{item}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Store from '../../stores/Store'
import axios from 'axios'
export default {
  data() {
    return {
      // data: require('./data.js').default,
      data: [],
      demo: false,
      // hash: '',
      timer: 1000,
      serverBackend: 'https://kupi.network',
      filter: '',
      interval: '',
      tube: '',
    }
  },
  fromMobx: {
    stock: {
      get() {
        return Store.stock
      }
    },
  },
  mounted() {
    if (this.demo) {
      this.data = require('./data.js').default
      return
    }
    this.start()
  },
  beforeDestroy() {
    this.finish()
  },
  methods: {
    start() {
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
    async fetchPairs_kupi(stockLowerCase) {
      return axios.get(`${this.serverBackend}/api/${stockLowerCase}/pairs/`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        this.tube = 'ccxt'
        return []
      })
    },
    async fetchPairs_ccxt(stockLowerCase) {
      return axios.get(`/user-api/ccxt/${stockLowerCase}/pairs/`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        return []
      })
    },
    async fetch() {
      var stock = this.stock
      var stockLowerCase = stock.toLowerCase()
      var data
      if (this.tube === 'ccxt') {
        data = await this.fetchPairs_ccxt(stockLowerCase)
      } else {
        if (this.firstFetch) {
          data = await Promise.race([
            this.fetchPairs_ccxt(stockLowerCase),
            this.fetchPairs_kupi(stockLowerCase)
          ])
          this.firstFetch = false
        } else {
          data = await this.fetchPairs_kupi(stockLowerCase)
        }
      }

      data = data.map((pair) => {
        return pair.split('/').join('_')
      })

      data = data.filter((pair) => {
        return pair.toLowerCase().indexOf( this.filter.toLowerCase() ) !== -1
      })


      // if (this.hash === JSON.stringify(data)) return true
      // this.hash = JSON.stringify(data)
      this.data = data
    },
    setPair(item) {
      Store.setPair(item)
    },
  },
}
</script>
