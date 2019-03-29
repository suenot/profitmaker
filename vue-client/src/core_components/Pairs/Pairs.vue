<template>
  <div class="kupi-table">
    <table>
      <tbody>
        <tr v-for="item in data" :key="item" @click="setPair(item)">
          <td>{{item}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Store from '../../stores/Store'
export default {
  data() {
    return {
      data: require('./data.js').default
    }
  },
  methods: {
    setPair(item) {
      Store.setPair(item)
    }
  },
}
</script>
