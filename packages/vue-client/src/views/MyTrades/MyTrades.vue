<template>
  <Widget :widget="blocks.MyTrades" />
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
  },
}
</script>

<style lang="sass" scoped>
.widget
  min-height: 100vh
</style>

