<template>
  <div class="kupi-table">
    <table>
      <tbody>
        <tr v-for="item in dataComputed" :key="item.id" @click="setStock(item)">
          <td>{{item['stock']}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Store from '../../stores/Store'
import _ from 'lodash'
export default {
  data() {
    return {
      data: require('./data.js').default
    }
  },
  methods: {
    setStock(item) {
      Store.setStock(item.stock)
      Store.setAccountId("user@gmail.com") // TODO
    }
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      return _.map(data, (item)=>{
        return {
          id: item.name,
          stock: item.name,
          accountId: item.accountId || undefined
        }
      })
    }
  }
}
</script>
