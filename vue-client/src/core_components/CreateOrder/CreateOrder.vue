<template>
  <div>
    <h3>Create {{type}} Order in {{pair}}</h3>
    <p>{{accountId}}</p>
    <p>price</p>
    <input v-model="price" class="input" type="text" placeholder=""/>
    <p>amount</p>
    <input v-model="amount" class="input" type="text" placeholder=""/>
    <p>total</p>
    <input v-model="totalComputed" class="input" type="text" placeholder=""/>
    <el-button v-if="type === 'buy'" type="primary" @click="createOrder()">Buy</el-button>
    <el-button v-if="type === 'sell'" type="primary" @click="createOrder()">Sell</el-button>
    {{error}}
  </div>

</template>

<script>
import axios from 'axios'
export default {
  data() {
    return {
      pair: 'ETH_BTC',
      accountId: 'ID_Binance_2',
      price: 0.02,
      amount: 0.1,
      // type: 'sell',
      error: ''
    }
  },
  props: [
    'type'
  ],
  mounted: function() {

  },
  computed: {
    totalComputed: function() {
      return this.price * this.amount
    }
  },
  methods: {
    createOrder: function() {
      var post = {
        'accountId': this.accountId,
        'pair': this.pair,
        'type': this.type,
        'price': this.price,
        'amount': this.amount
      }
      console.log(post)
      axios.post('http://localhost:8040/createOrder/', post)
      .then((response) => {
        // console.log(response.data)
        this.error = response.data
      })
      .catch((error) => {
        // console.log(error)
        this.error = error
      })
    }

  }
}
</script>
<style lang="sass">
.input
  border: 1px solid #ebeef5
  outline: none
  height: 40px
  line-height: 40px
  display: block
  margin-bottom: 20px
  &:focus
    border: 1px solid red
</style>
