<template>
  <div>
    <el-switch
      v-model="data"
      active-text="Demo data"
      inactive-text="Real data"
      class="m-16">
    </el-switch>
  </div>
</template>

<script>
import Store from '@/stores/Store'
import { toJS } from 'mobx'
export default {
  props: ['aside'],
  fromMobx: {
    data: {
      get() {
        return toJS(Store.blocks[this.aside.data.component].demo)
      },
      set(e) {
        var name = this.aside.data.component
        var param = 'demo'
        var value = e
        Store.setBlockData(name, param, value)
      }
    },
  },
}
</script>
