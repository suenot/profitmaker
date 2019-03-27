<template>
  <div class="kupi-table">
    <table>
      <tbody>
        <tr v-for="item in dataComputed" :key="item.uuid">
          <td>{{item['pair']}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import moment from 'moment'
import _ from 'lodash'
export default {
  data() {
    return {
      data: require('./data.js').default
    }
  },
  created() {
  },
  methods: {
  },
  computed: {
    dataComputed: function() {
      var data = _.cloneDeep(this.data)
      return _.map(data, (item)=>{
        return {
          uuid: item.uuid,
          pair: item
        }
      })
    }
  }
}
</script>

<style lang="sass"></style>
