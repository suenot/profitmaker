<template>
  <div>
    <div class="actions">
      <button @click="type = 'both'">
        <img src="/img/icons/type_both.png" />
      </button>
      <button @click="type = 'bids'">
        <img src="/img/icons/type_bids.png" />
      </button>
      <button @click="type = 'asks'">
        <img src="/img/icons/type_asks.png" />
      </button>
    </div>
    <template v-if="type === 'both'">
      <OrdersSide type="asks" :data="data" sort="desc" :thead="true"/>
      <OrdersSide type="bids" :data="data" sort="desc" :thead="false"/>
    </template>
    <OrdersSide v-if="type === 'asks'" :data="data" type="asks" sort="asc" :thead="true" />
    <OrdersSide v-if="type === 'bids'" :data="data" type="bids" sort="desc" :thead="true" />
  </div>
</template>

<script>
const io = require('socket.io-client')
export default {
  data() {
    return {
      data: require('./data.js').default,
      type: 'both'
    }
  },
  mounted() {
    const socket = io('http://144.76.109.194:8051/')
    socket.on('connect', () => {
      console.log('connect')
      socket.emit('room', 'orders')
      socket.on('BINANCE--ETH--BTC', (data) => {
        this.data = data
      })
      socket.on('disconnect', () => {
        console.log('----')
      })
    })

  }
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
    border: 1px solid rgba(0, 0, 0, 0.12) //rgb(230, 230, 230)
    // background-color: rgb(29, 29, 29)
    &:hover, &.active
      border: 1px solid rgb(245, 188, 0)
</style>
