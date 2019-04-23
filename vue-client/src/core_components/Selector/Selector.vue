<template>
  <table>
    <tbody>
      <tr>
        <td @click="showStocks()">
          {{stock}}
          <span v-if="accountName" class="muted">
            <br/>{{accountName}}
          </span>
        </td>
        <td @click="showPairs()">{{pair}}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import Store from '@/stores/Store'
import AsidesStore from '@/stores/AsidesStore'

export default {
  data() {
    return {
    }
  },
  fromMobx: {
    stock: {
      get() {
        return Store.stock
      }
    },
    pair: {
      get() {
        return Store.pair
      }
    },
    accountName: {
      get() {
        return Store.accountName
      }
    }
  },
  created() {
  },
  methods: {
    showStocks() {
      var component = 'Stocks'
      var title = 'Stocks'
      var side = 'left'
      var width = 380
      var widget = {demo: false}
      AsidesStore.addAside(component, title, side, width, widget)
    },
    showPairs() {
      var component = 'Pairs'
      var title = 'Pairs'
      var side = 'left'
      var width = 380
      var widget = {demo: false}
      AsidesStore.addAside(component, title, side, width, widget)
    },
  },
  computed: {
  }
}
</script>

<style lang="sass" scoped>
table
  width: 100%
  border-collapse: collapse
  td
    padding: 30px
    border: 1px solid rgba(0,0,0,0.12)
    text-align: center
    &:hover
      cursor: pointer
      background: rgba(0,0,0,0.08)

</style>
