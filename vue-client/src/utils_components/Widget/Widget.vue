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
  </div>
</template>

<script>
export default {
  props: ['widget'],
}
</script>

<style lang="sass">
.widget
  height: 100%
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
</style>
