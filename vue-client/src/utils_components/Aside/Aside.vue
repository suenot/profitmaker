<template>
  <div :class="`aside active aside-${aside.side}`" :style="`left: ${aside.left}px; right: ${aside.right}px; width: ${aside.width}px;`">
    <div class="aside-header" v-if="aside.title">
      <span class="aside-title">{{aside.title}}</span>
      <span class="aside-actions">
        <i class="el-icon-close" @click="removeAside(aside.id)"></i>
      </span>
    </div>
    <div class="aside-body">
      <component :is="aside.component" :aside="aside" />
    </div>
  </div>
</template>

<script>
import AsidesStore from '../../stores/AsidesStore'

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
.aside
  width: 320px
  z-index: 500000
  height: 100vh
  position: fixed
  left: 0
  top: 0
  display: flex
  flex-direction: column
  background: white
  overflow-x: hidden
  overflow-y: auto
  &.aside-left
    border-right: 1px solid rgba(0, 0, 0, 0.12)
  &.aside-right
    border-left: 1px solid rgba(0, 0, 0, 0.12)
    left: auto
    right: 0
  .aside-header
    display: flex
    font-size: 18px
    border-bottom: 1px solid rgba(0, 0, 0, 0.12)
    justify-content: space-between
    .aside-title
      padding: 8px 16px
    .aside-actions
      i
        padding: 8px 16px
        cursor: pointer
</style>
