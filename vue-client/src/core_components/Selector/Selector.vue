<template>
  <table>
    <tbody>
      <tr>
        <td>
          {{stock}}
          <span v-if="accountId" class="muted">
            <br/>{{accountId}}
          </span>
        </td>
        <td>{{pair}}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import Store from '../../stores/Store'

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
