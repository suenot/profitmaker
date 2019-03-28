<template>
  <div class="aside">
    <div class="aside-header" v-if="aside.header">
      <span class="aside-title">Title</span>
      <span class="aside-actions">
        <i class="el-icon-close" @click="removeAside(aside.id)"></i>
      </span>
    </div>
    <div class="aside-body">
      <component :is="aside.component" />
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
