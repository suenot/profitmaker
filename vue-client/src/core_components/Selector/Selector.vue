<template>
  <table>
    <tbody>
      <tr>
        <td @click="showStocks()">
          {{stock}}
          <span v-if="accountId" class="muted">
            <br/>{{accountId}}
          </span>
        </td>
        <td @click="showPairs()">{{pair}}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import Store from '../../stores/Store'
import AsidesStore from '../../stores/AsidesStore'

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
    accountId: {
      get() {
        return Store.accountId
      }
    }
  },
  created() {
  },
  methods: {
    showStocks() {
      var component = 'Stocks'
      var side = 'left'
      var width = 320
      var data = {}
      AsidesStore.addAside(component, side, width, data)
    },
    showPairs() {
      var component = 'Pairs'
      var side = 'left'
      var width = 320
      var data = {}
      AsidesStore.addAside(component, side, width, data)
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
