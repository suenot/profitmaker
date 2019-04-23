<template>
  <table>
    <tbody>
      <tr>
        <td v-for="account in accounts" :key="account.id">
          {{stock}}
          <span v-if="account.name" class="muted">
            <br/>{{account.name}}
          </span>
          <br/>{{pair}}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import _ from 'lodash'
import Store from '@/stores/Store'
export default {
  props: ['accounts', 'stock', 'pair'],
  mounted() {
    // this.stock = stock.name
    // this.accountId = stock.accountId
    // this.accountName = stock.accountName
    if (this.stock !== undefined) Store.setStock({
      name: this.stock,
      accountId: this.accounts[0].id || undefined,
      accountName: this.accounts[0].name || undefined,
    })
    if (this.pair !== undefined) Store.setPair(this.pair)
    // try {
    //   if (!_.isEmpty(this.accounts) && this.accounts[0].id !== undefined) Store.setAccountId(this.accounts[0].id)
    // } catch(err) {}
    // console.log(this.stock)
    // console.log(this.pair)
    // console.log(this.accounts[0].id)
  },
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
