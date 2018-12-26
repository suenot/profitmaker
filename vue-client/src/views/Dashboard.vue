<template>
  <!-- <div> -->
    <!-- {{state.dashboard}} -->
    <grid-layout v-if="state.dashboard.widgets.length !== 0"
      :layout="state.dashboard.widgets || []"
      :col-num="12"
      :row-height="30"
      :is-draggable="true"
      :is-resizable="true"
      :margin="[10, 10]"
      :use-css-transforms="true">
      <grid-item v-for="widget in (state.dashboard.widgets || [])"
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
            <button @click="addWidget">addWidget</button>
            <!-- <component :is="widget.component" :key="widget.i" :data="chartData" :settings="chartSettings" :height="(widget.h*40-40)+'px'"></component> -->
            <component :is="widget.component" :key="widget.i" :height="(widget.h*40-40)+'px'"></component>
            <!-- some -->
          </div>
        </div>
      </grid-item>
    </grid-layout>
  <!-- </div> -->
</template>


<script>
import { GridLayout, GridItem } from 'vue-grid-layout'
import Chart from '../components/Chart.vue'

import { observer } from 'mobx-vue'

import DashboardsStore from '../stores/DashboardsStore'
export default observer({
  data () {
    return {
      counter: '1',
      state: DashboardsStore
      // widgets: [
      //   {"component": "Chart", "x":0,"y":0,"w":2,"h":2,"i":"0"},
      //   {"component": "Chart", "x":2,"y":0,"w":2,"h":4,"i":"1"}
      // ],
    }
  },
  components: { GridLayout, GridItem, Chart },
  methods: {
    resizedEvent: () => {
      window.dispatchEvent(new Event('resize'))
    },
    addWidget: function() {
      this.counter = (parseInt(this.counter)+1).toString()
      this.widgets.push({"component": "ve-candle", "x":2,"y":0,"w":2,"h":4,"i": this.counter})
    }
  }
})
</script>

<style lang="sass">
.vue-grid-layout
  width: 100%
  margin: 0 -10px 30px
  min-width: 100%
.vue-grid-item
  border: 1px solid #ddd


.widget
  width: 100%
  height: 100%
  max-width: 100%
  max-height: 100%
  background: #fff
  border: 1px solid #484747
  display: flex
  flex-direction: column
  .widget-header
    display: flex
    justify-content: space-between
    align-items: center
    background: #484747
    color: white
    height: 20px
    flex: 0 0 20px
  .widget-body
    flex: 1 1 auto
    overflow-y: auto
    overflow-x: hidden
</style>
