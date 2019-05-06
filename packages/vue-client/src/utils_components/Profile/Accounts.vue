<template>
  <div class="accounts">
    <span class="subtitle">Accounts</span>
    <el-table
      :data="accountsComputed"
      style="width: 100%">
      <el-table-column type="expand">
        <template slot-scope="props">
          <p>Id: {{ props.row.id }}</p>
          <p>Parser: {{ props.row.parser }}</p>
          <p>Withdraw: {{ props.row.withdrawLimit }} {{ props.row.withdrawLimitIn }}</p>
          <p>
            Keys:
            <ul>
              <li v-for="(value, index) in props.row.keys" :key="index">{{value}}</li>
            </ul>
          </p>
          <p>Note: {{ props.row.note }}</p>
        </template>
      </el-table-column>
      <el-table-column
        label="Name"
        prop="name">
      </el-table-column>
      <el-table-column
        label="Stock"
        prop="stock">
      </el-table-column>
    </el-table>
  </div>
</template>


<script>
import AccountsStore from '../../stores/AccountsStore'
import _ from 'lodash'
export default {
  fromMobx: {
    accounts() {
      return AccountsStore.accounts
    },
  },
  computed: {
    accountsComputed() {
      var data = _.cloneDeep(this.accounts)
      data =  Object.values(data)
      data = data.map((account)=>{
        account.keys = []
        if (account.safe) account.keys.push('safe')
        if (account.notSafe) account.keys.push('not safe')
        if (account.danger) account.keys.push('danger')
        return account
      })
      return data
    }
  }
}
</script>

<style lang="sass">
.subtitle
  padding: 16px
  font-size: 16px
</style>
