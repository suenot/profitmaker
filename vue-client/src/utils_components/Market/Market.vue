<template>
  <div>
    <h1>Market</h1>
    <ul>
      <li v-for="widget in widgetsMarket" :key="widget.id" @click="addWidget(widget.component)">{{widget.name}}</li>
    </ul>
  </div>
</template>


<script>
export default {
  data () {
    return {
      widgetsMarket: [
        {
          id: '1',
          name: 'Candles',
          component: 'Candles',
        },
        {
          id: '2',
          name: 'KupiTable',
          component: 'KupiTable',
        },
        {
          id: '3',
          name: 'Handsontable',
          component: 'Handsontable',
        },
        {
          id: '4',
          name: 'GridCanvas',
          component: 'GridCanvas',
        },
      ]
    }
  },
  methods: {
    addWidget: function(component) {
      this.$bus.emit('addWidget', component)
    }
  }
}
</script>

<style lang="sass">

</style>
