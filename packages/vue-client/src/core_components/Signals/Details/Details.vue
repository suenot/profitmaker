<template>
  <div>
    <div class="cont-30 common-info">
      <div>lag: {{dataComputed.lag}}</div>
      <div>timelife: {{dataComputed.timelife}}</div>
      <div>updated: {{dataComputed.updated}}</div>
      <div>created: {{dataComputed.created}}</div>

      <div>type: {{dataComputed.type}}</div>
      <div>status: {{dataComputed.status}}</div>
      <div>action: {{dataComputed.action}}</div>

      <div>percent: {{dataComputed.percent}}</div>
      <div>profitUSD: {{dataComputed.profitUSD}}</div>
      <div>profitBTC: {{dataComputed.profitBTC}}</div>
      <div>totalUSD: {{dataComputed.totalUSD}}</div>
      <div>totalBTC: {{dataComputed.totalBTC}}</div>


      <div>maxProfitUSD: {{dataComputed.maxProfitUSD}}</div>
      <div>maxProfitBTC: {{dataComputed.maxProfitBTC}}</div>
      <div>maxPercent: {{dataComputed.maxPercent}}</div>
      <div>maxTotalUSD: {{dataComputed.maxTotalUSD}}</div>
      <div>maxTotalBTC: {{dataComputed.maxTotalBTC}}</div>
    </div>

    <div class="detailsWrap">
      <div class="cont-30">
        <div class="common-info">
          <div>pair: {{dataComputed.pairFrom}}</div>
          <div>stock: {{dataComputed.stockFrom}}</div>
          <div>updated: {{dataComputed.updatedFrom}}</div>
        </div>
        <br />
        <el-checkbox v-model="from.white" @change="changeData($event, data.stockFrom, data.baseFrom, 'white')">White</el-checkbox>
        <el-checkbox v-model="from.black" @change="changeData($event, data.stockFrom, data.baseFrom, 'black')">Black</el-checkbox>
        <el-checkbox v-model="from.favorite" @change="changeData($event, data.stockFrom, data.baseFrom, 'favorite')">Favorite</el-checkbox>
        <br />
        <br />
        <div>Full name</div>
        <el-input placeholder="Full name" v-model="from.full_name" class="m-16" @change="changeData($event, data.stockFrom, data.baseFrom, 'full_name')"></el-input>
        <br />
        <br />
        <div>Note</div>
        <el-input type="textarea" v-model="from.note" @change="changeData($event, data.stockFrom, data.baseFrom, 'note')"></el-input>
      </div>
      <div class="cont-30">
        <div class="common-info">
          <div>pair: {{dataComputed.pairTo}}</div>
          <div>stock: {{dataComputed.stockTo}}</div>
          <div>updated: {{dataComputed.updatedTo}}</div>
        </div>
        <br />
        <el-checkbox v-model="to.white" @change="changeData($event, data.stockTo, data.baseTo, 'white')">White</el-checkbox>
        <el-checkbox v-model="to.black" @change="changeData($event, data.stockTo, data.baseTo, 'black')">Black</el-checkbox>
        <el-checkbox v-model="to.favorite" @change="changeData($event, data.stockTo, data.baseTo, 'favorite')">Favorite</el-checkbox>
        <br />
        <br />
        <div>Full name</div>
        <el-input placeholder="Full name" v-model="to.full_name" class="m-16" @change="changeData($event, data.stockTo, data.baseTo, 'full_name')"></el-input>
        <br>
        <br>
        <div>Note</div>
        <el-input type="textarea" v-model="to.note" @change="changeData($event, data.stockTo, data.baseTo, 'note')"></el-input>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
// var momentDurationFormatSetup = require("moment-duration-format")
// momentDurationFormatSetup(moment)

import _ from 'lodash'
export default {
  data () {
    return {
      server: 'https://kupi.network/api/',
      data: {},
      from: {
        // full_name: '',
        // white: true,
        // black: false,
        // favorite: false,
        // note: '',
      },
      to: {
        // full_name: '',
        // white: true,
        // black: false,
        // favorite: false,
        // note: '',
      }
    }
  },
  mounted() {
    // this.getData()
    this.getDetails()
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      data.percent = data.percent !== undefined ? data.percent.toFixed(2) + '%' : ''
      data.profitBTC = data.profitBTC !== undefined ? data.profitBTC.toFixed(8) + ' BTC' : ''
      data.profitUSD = data.profitUSD !== undefined ? data.profitUSD.toFixed(0) + ' USD' : ''
      data.totalBTC = data.totalBTC !== undefined ? data.totalBTC.toFixed(8) + ' BTC' : ''
      data.totalUSD = data.totalUSD !== undefined ? data.totalUSD.toFixed(0) + ' USD' : ''
      data.updated = moment(data.updated).fromNow()
      data.updatedFrom = moment(data.updatedFrom).fromNow()
      data.updatedTo = moment(data.updatedTo).fromNow()
      data.created = moment(data.created).fromNow()
      data.timelife = moment.duration(data.timelife, 'milliseconds').format('h:mm:ss')
      data.lag = moment.duration(data.lag, 'milliseconds').format('h:mm:ss')
      data.maxProfitUSD = data.maxProfitUSD !== undefined ? data.maxProfitUSD.toFixed(0) + ' USD' : ''
      data.maxProfitBTC = data.maxProfitBTC !== undefined ? data.maxProfitBTC.toFixed(8) + ' BTC' : ''
      data.maxTotalUSD = data.maxTotalUSD !== undefined ? data.maxTotalUSD.toFixed(0) + ' USD' : ''
      data.maxTotalBTC = data.maxTotalBTC !== undefined ? data.maxTotalBTC.toFixed(8) + ' BTC' : ''
      data.maxPercent = data.maxPercent !== undefined ? data.maxPercent.toFixed(2) + ' %' : ''
      return data
    }
  },
  methods: {
    getDetails() {
      axios.get(`${this.server}/intuition-details/${this.$route.params.id}`)
      .then((response) => {
        this.data = response.data
        this.getData()
      })
      .catch((error) => {
      })
    },
    getData() {
      axios.get(`${this.server}/coins/${this.data.stockFrom}--${this.data.baseFrom}`)
      .then((response) => {
        this.from = response.data
      })
      .catch((error) => {
      }),

      axios.get(`${this.server}/coins/${this.data.stockTo}--${this.data.baseTo}`)
      .then((response) => {
        this.to = response.data
      })
      .catch((error) => {
      })
    },
    changeData(value, stock, baseTo, key) {
      axios.post(`${this.server}/coins/core`, {
        id: `${stock}--${baseTo}`,
        key,
        value
      })
      .then((response) => {
        this.getData()
      })
      .catch((error) => {
        console.log(error)
      })
    }
  }
}

</script>

<style lang="sass" scoped>
.common-info
  column-count: 4
  column-rule-style: solid
  column-gap: 40px
  column-rule: 1px solid lightblue
.detailsWrap
  display: flex
  & > div
    flex: 0 0 50%
</style>
