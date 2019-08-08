<template>
  <div>
    <div class="p-16" v-if="block.demo !== undefined">
      <div class="sub-title">Source of data</div>
      <el-switch
        :value="block.demo"
        active-text="Demo data"
        inactive-text="Real data"
        class="m-16"
        @change="setData($event, 'demo')"
      >
      </el-switch>
    </div>

    <div class="p-16" v-if="block.timeframe !== undefined">
      <div class="sub-title">Timeframe</div>
      <div class="candles-settings">
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

    <div class="p-16" v-if="block.library !== undefined">
      <div class="sub-title">Library</div>
      <el-select :value="block.library" placeholder="Library" @change="setData($event, 'library')">
        <el-option
          v-for="library in block.libraries"
          :key="library"
          :label="library"
          :value="library">
        </el-option>
      </el-select>
    </div>

    <div class="p-16" v-if="block.channel !== undefined">
      <div class="sub-title">Channel</div>
      <el-select :value="block.channel" placeholder="Library" @change="setData($event, 'channel')">
        <el-option
          v-for="channel in block.channels"
          :key="channel"
          :label="channel"
          :value="channel">
        </el-option>
      </el-select>
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
        return toJS(Store.blocks[this.aside.widget.component])
      }
    }
  },
  methods: {
    setData(e, param) {
      var name = this.aside.widget.component
      if (typeof(e) === 'boolean' || typeof(e) === 'string' || typeof(e) === 'number') {
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
  // margin: 0 16px 16px 16px
  .el-button
    flex: 0 1 auto
    margin: 1px 1px !important
    width: 58px
</style>
