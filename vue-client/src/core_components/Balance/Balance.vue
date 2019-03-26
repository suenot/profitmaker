<template>
  <div>
    <BalanceTable/>
    <BalancePie/>
    <BalanceTimeseries/>
  </div>
</template>

<script>

import axios from 'axios'
import moment from 'moment'
import _ from 'lodash'

export default {

  data() {
    // return {
    //   data: require('./data.js').default
    // }
  },
  created() {
  },
  methods: {
  },
  computed: {
  }
}
</script>

<style lang="sass" scoped>

</style>
