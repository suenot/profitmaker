<template>
  <div>
    <!-- <Handsontable /> -->
    <grid-layout v-if="widgets.length !== 0"
      :layout="widgets"
      :col-num="12"
      :row-height="30"
      :is-draggable="true"
      :is-resizable="true"
      :margin="[borderless ? -1 : 10, borderless ? -1 : 10]"
      :use-css-transforms="true"
      @layout-updated="layoutUpdatedEvent"
      :class="borderless ? 'borderless' : ''"
      >
      <grid-item v-for="widget in widgets"
        :x="widget.x"
        :y="widget.y"
        :w="widget.w"
        :h="widget.h"
        :i="widget.i"
        :key="widget.i"
        dragAllowFrom=".widget-header"
        resizeIgnoreFrom=".widget-body"
        @resized="resizedEvent">
        <div class="widget">
          <div class="widget-header">
            <div class="options" @click="removeWidget(widget.i)"><v-icon>more_horiz</v-icon></div>
          </div>
          <div class="widget-body">
            <component :is="widget.component" :key="widget.i" :height="(widget.h*40-40)+'px'"></component>
          </div>
        </div>
      </grid-item>
    </grid-layout>
  </div>
</template>


<script>
import { GridLayout, GridItem } from 'vue-grid-layout'
import uuidv1 from 'uuid/v1'

import { observer, toJS } from 'mobx-vue'

import DashboardsStore from '../../stores/DashboardsStore'
export default observer({
  data () {
    return {
      borderless: true,
      counter: '1',
      state: DashboardsStore,
      widgets: []
    }
  },
  components: { GridLayout, GridItem },
  created: function() {

  },
  mounted: function() {
    setTimeout(()=>{
      var dashboardActiveIndex = _.findIndex(DashboardsStore.dashboards, ['id', this.$route.params.id])
      this.widgets = JSON.parse(JSON.stringify(DashboardsStore.dashboards[dashboardActiveIndex].widgets))
    }, 200)
    setTimeout(()=>{
      this.resizedEvent()
    }, 200)

    this.$bus.on('addWidget', (component) => {
      this.widgets.push({"component": component, "x":2,"y":0,"w":2,"h":4,"i": uuidv1()})
      this.layoutUpdatedEvent()
    })
  },
  beforeDestroy() {
    this.$bus.off('addWidget')
  },
  methods: {
    resizedEvent: () => {
      window.dispatchEvent(new Event('resize'))
    },
    // addWidget: function() {
    //   // this.counter = (parseInt(this.counter)+1).toString()
    //   this.widgets.push({"component": "Chart", "x":2,"y":0,"w":2,"h":4,"i": uuidv1()})
    // },
    layoutUpdatedEvent: function(){
      this.state.updateWidgets(this.widgets, this.$route.params.id)
    },
    removeWidget(widgetId) {
      // var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', dashboardActiveId])
      // var widgets = this.dashboards[dashboardActiveIndex].widgets
      // this.dashboards[dashboardActiveIndex].widgets = _.filter(widgets, function(item) {
      //   return item.i !== widgetId
      // })
      this.widgets = _.filter(this.widgets, function(widget) {
        return widget.i !== widgetId
      })
    }
  }
})
</script>

<style lang="sass">
.vue-grid-layout
  width: 100%
  margin: 0px 10px 0px 0px
  min-width: 100%

.widget
  width: 100%
  height: 100%
  max-width: 100%
  max-height: 100%
  background: #fff
  border: 1px solid rgba(0, 0, 0, 0.12)
  display: flex
  flex-direction: column
  .widget-header
    display: flex
    justify-content: space-between
    align-items: center
    height: 20px
    flex: 0 0 20px
    font-size: 14px
  .options
    height: 42px
    width: 42px
    background: white
    position: absolute !important
    right: 0
    top: 0
    display: flex
    justify-content: center
    // border-left: 1px solid rgba(0, 0, 0, 0.12)
    // border-bottom: 1px solid rgba(0, 0, 0, 0.12)
    border: 1px solid rgba(0, 0, 0, 0.12)
    cursor: pointer
  .widget-body
    flex: 1 1 auto
    overflow-y: auto
    overflow-x: hidden
    position: relative

.vue-resizable-handle
  height: 42px !important
  width: 42px !important
</style>
