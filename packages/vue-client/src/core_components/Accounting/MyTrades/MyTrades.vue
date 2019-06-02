<template>
  <div>
    <div class="title">
      <span class="title-actions">
        <el-button type="default" icon="el-icon-back" circle @click="$router.go(-1)"></el-button>
      </span>
      <h3 class="title-header">My trades</h3>
    </div>
    <Widget :widget="blocks.MyTrades" />
  </div>
</template>

<script>
import Store from '@/stores/Store'
import { toJS } from 'mobx'
export default {
  fromMobx: {
    blocks: {
      get() {
        return toJS(Store.blocks)
      }
    },
  }
}
</script>

<style lang="sass" scoped>
.widget
  min-height: 100vh
</style>

