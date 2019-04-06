<template>
  <div>
    <el-switch
      v-if="block.demo !== undefined"
      :value="block.demo"
      active-text="Demo data"
      inactive-text="Real data"
      class="m-16"
      @change="setData($event, 'demo')"
    >
    </el-switch>
    <div class="candles-settings" v-if="block.timeframe !== undefined">
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '1m'">1m</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '3m'">3m</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '5m'">5m</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '15m'">15m</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '30m'">30m</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '1H'">1H</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '2H'">2H</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '4H'">4H</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '6H'">6H</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === '12H'">12H</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === 'D'">D</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === 'W'">W</el-button>
      <el-button size="mini" @click="setData($event, 'timeframe')" :disabled="block.timeframe === 'M'">M</el-button>
    </div>
  </div>
</template>

<script>
import Store from '@/stores/Store'
import { toJS } from 'mobx'
export default {
  props: ['aside'],
  fromMobx: {
    block: {
      get() {
        return toJS(Store.blocks[this.aside.data.component])
      }
    }
  },
  methods: {
    setData(e, param) {
      var name = this.aside.data.component
      if (typeof(e) === 'boolean') {
        var value = e
      } else {
        var value = e.target.innerText
      }
      Store.setBlockData(name, param, value)
    }
  }
}
</script>

<style lang="sass">
.candles-settings
  display: flex
  flex-wrap: wrap
  margin: 0 16px 16px 16px
  .el-button
    flex: 0 1 auto
    margin: 1px 1px !important
    width: 58px
</style>
