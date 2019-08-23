<template>
  <div class="widget">
    <div class="block-header">
      <div class="block-title">
        {{widget.title}}
      </div>
      <div class="block-actions">
        <i class="el-icon-more pointer" @click="showSettings()"></i>
      </div>
    </div>
    <div class="widget-body">
      <component :is="widget.component" :widget="widget" />
    </div>
    <div class="widget-footer" v-if="notification">
      <div :class="`notification ${notification.type}`">
        {{notification.msg}}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      notification: {}
    }
  },
  props: ['widget'],
  methods: {
    showSettings() {
      var component = 'Settings'
      var title = `${this.widget.title} settings`
      var side = 'right'
      var width = 380
      var data = this.widget
      AsidesStore.addAside(component, title, side, width, data)
    }
  },
}
</script>

<style lang="sass">
.widget
  height: 100%
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
  position: relative
.block-header
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
  height: 33px
  display: flex
  justify-content: space-between
  align-items: center
  .block-title, .block-actions i
    padding: 8px 16px
.widget-body
  height: calc(100% - 33px)
  overflow-x: hidden
  overflow-y: auto
  position: relative
.widget-footer
  position: absolute
  bottom: 0
  width: 100%
.notification
  border: 1px solid rgba(0, 0, 0, 0.12)
  font-size: 12px
  text-transform: uppercase
  text-align: center
  &.alert
    background: #f60361
    color: white
  &.warning
    background: #ff6d00
    color: white
  &.info
    background: #485cbd
    color: white
</style>
