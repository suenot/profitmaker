<template>
  <div>
    <div class="actions">
      <button @click="widget.type = 'both'">
        <img src="/img/icons/type_both.png" alt />
      </button>
      <button @click="widget.type = 'bids'">
        <img src="/img/icons/type_bids.png" alt />
      </button>
      <button @click="widget.type = 'asks'">
        <img src="/img/icons/type_asks.png" alt />
      </button>
    </div>
    <template v-if="widget.type === 'both'">
      <OrdersSide type="asks" :data="data" sort="desc" :thead="true"/>
      <div ref="ordersCenter"></div>
      <OrdersSide type="bids" :data="data" sort="desc" :thead="false"/>
    </template>
    <OrdersSide v-if="widget.type === 'asks'" :data="data" type="asks" sort="asc" :thead="true" />
    <OrdersSide v-if="widget.type === 'bids'" :data="data" type="bids" sort="desc" :thead="true" />
  </div>
</template>

<script lang="ts">
import FetchData from '@/components/mixins/FetchData.vue'

import { Component, Prop, Watch } from 'vue-property-decorator'
import { Orders, WidgetConfig } from '@/types'
import { mixins } from 'vue-class-component'

const data: Orders = require('./data.json')

@Component({
  name: 'Orders',
  mixins: [FetchData]
})
export default class OrdersComponent extends mixins(FetchData) {
  center: boolean = false;
  demoData: Orders = data;

  @Prop()
  widget!: WidgetConfig

  data: Orders[] = []

  get dataLength () {
    return this.data.length
  }

  @Watch('dataLength')
  watchDataLength (val: string) {
    setTimeout(() => {
      if (this.widget.type === 'both' && !this.center) {
        this.toCenter()
      }
    }, 200)
  }

  toCenter () {
    const widgetHeight = (this.$el.parentNode as any).offsetHeight
    const topHeight = (this.$refs.ordersCenter as any).offsetTop
    if (this.$el.parentNode) {
      (this.$el.parentNode as any).scrollTop = topHeight - widgetHeight / 2
    }
    this.center = true
  }
  // TODO: WS
  // const io = require('socket.io-client')
  // mounted() {
  //   const socket = io('http://144.76.109.194:8051/')
  //   socket.on('connect', () => {
  //     // console.log('connect')
  //     socket.emit('room', 'orders')
  //     socket.on('BINANCE--ETH--BTC', (data) => {
  //       this.data = data
  //     })
  //     socket.on('disconnect', () => {
  //       // console.log('disconnect')
  //     })
  //   })
  // }
}
</script>

<style lang="sass" scoped>
.actions
  display: flex
  button
    cursor: pointer
    flex: 1 0 auto
    outline: none
    padding: 5px 10px
    border: 1px solid rgba(0, 0, 0, 0.12)
    &:hover, &.active
      border: 1px solid rgb(245, 188, 0)
</style>
