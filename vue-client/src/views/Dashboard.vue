<template>
  <div>
    {{widgets}}
    <br />
    <br />
    {{state.widgets}}
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
            <div class="title">Title</div>
          </div>
          <div class="widget-body">
            <!-- <button @click="addWidget">addWidget</button> -->
            <component :is="widget.component" :key="widget.i" :height="(widget.h*40-40)+'px'"></component>
            <!-- v-bind="item.props" -->
          </div>
        </div>
      </grid-item>
    </grid-layout>
  </div>
</template>


<script>
import { GridLayout, GridItem } from 'vue-grid-layout'
import Chart from '../components/Chart.vue'
import uuidv1 from 'uuid/v1'

import { observer, toJS } from 'mobx-vue'

import DashboardsStore from '../stores/DashboardsStore'
export default observer({
  data () {
    return {
      borderless: true,
      counter: '1',
      state: DashboardsStore,
      // widgets: DashboardsStore.widgets
      widgets: []
    }
  },
  components: { GridLayout, GridItem },
  created: function() {

  },
  mounted: function() {
    console.log('MOUNTED')
    setTimeout(()=>{
      this.widgets = JSON.parse(JSON.stringify(DashboardsStore.widgets))
    }, 200)

    this.$bus.on('addWidget', () => {
      console.log('addWidget')
      console.log(this.widgets)
      this.widgets.push({"component": "Chart", "x":2,"y":0,"w":2,"h":4,"i": uuidv1()})
    })
  },
  // computed: {
  //   computedWidgets() {
  //     state.widgets
  //   }
  // },
  // watch: {
  //   state: function (val) {
  //     console.log('WATCH')
  //     console.log(val)
  //     console.log('storeWidgets changed')
  //     this.widgets = val
  //   },
  // },
  methods: {
    resizedEvent: () => {
      window.dispatchEvent(new Event('resize'))
    },
    addWidget: function() {
      this.counter = (parseInt(this.counter)+1).toString()
      this.widgets.push({"component": "Chart", "x":2,"y":0,"w":2,"h":4,"i": this.counter})
    },
    layoutUpdatedEvent: function(newLayout){
      // this.state.dashboards[this.state.dashboardActiveIndex].widgets = JSON.parse(JSON.stringify(newLayout))
      // console.log(JSON.stringify(newLayout))
      this.state.updateWidgets(newLayout)
    }
  }
})
</script>

<style lang="sass">
.vue-grid-layout
  width: 100%
  // margin: 0 -10px 30px
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
  .widget-body
    flex: 1 1 auto
    overflow-y: auto
    overflow-x: hidden
</style>
