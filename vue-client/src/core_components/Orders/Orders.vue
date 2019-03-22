<template>
  <div class="kupi-table">
    <table>
      <thead>
        <tr>
          <th v-for="(th, thIndex) in data[0]" :key="thIndex">{{thIndex}}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(tr, trIndex) in data" :key="trIndex">
          <td v-for="(td, tdIndex) in tr" :key="tdIndex">
            {{td}}
          </td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
  // import monitorComputed from "./Demo.js"
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
}
</script>

<style lang="sass"></style>
