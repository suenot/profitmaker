<template>
  <div class="widget">
    <div class="widget-header">
      <div class="widget-title">
        {{widget.title}}
      </div>
      <div class="widget-actions">
        <i class="el-icon-more pointer"></i>
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
}
</script>

<style lang="sass">
.widget
  height: 100%
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
  position: relative
.widget-header
  border-bottom: 1px solid rgba(0, 0, 0, 0.12)
  height: 33px
  display: flex
  justify-content: space-between
  align-items: center
  .widget-title, .widget-actions i
    padding: 8px 16px
.widget-body
  height: calc(100% - 33px)
  overflow-x: hidden
  overflow-y: auto
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
