<template>
  <div>
    <div class="title">
      <span class="title-header">Coins</span>
    </div>
    <div class="kupi-table">
      <table>
        <tr v-for="coin in data" :key="coin.name" @click="$router.push({name: 'SentimentsCoin', params: {id: coin.name}})">
          <td>{{coin.name}}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    data: require('./data.js').default,
  })
}
</script>

