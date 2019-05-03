<template>
  <div :class="`aside active aside-${aside.side}`" :style="`left: ${aside.left}px; right: ${aside.right}px; width: ${aside.width}px;`">
    <div class="aside-header" v-if="aside.title">
      <span class="aside-title">{{aside.title}}</span>
      <span class="aside-actions">
        <i class="el-icon-close" @click="removeAside(aside.id)"></i>
      </span>
    </div>
    <div class="aside-body">
      <component :is="aside.component" :aside="aside" :widget="aside.widget" />
    </div>
  </div>
</template>

<script>
import AsidesStore from '@/stores/AsidesStore'

export default {
  props: ['aside'],
  methods: {
    removeAside() {
      AsidesStore.removeAside(this.aside.id)
    }
  }
}
</script>

<style lang="sass" scoped>

</style>
