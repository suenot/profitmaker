<template>
  <div class="create-order">
    <div>
      <el-input placeholder="Price" v-model="price">
        <template slot="prepend">Price</template>
        <template slot="append">{{coinTo}}</template>
      </el-input>
    </div>

    <div>
      <el-input placeholder="Price" v-model="amount">
        <template slot="prepend">Amount</template>
        <template slot="append">{{coinFrom}}</template>
      </el-input>
    </div>

    <div>
      <el-input placeholder="Price" v-model="totalComputed">
        <template slot="prepend">Total</template>
        <template slot="append">{{coinTo}}</template>
      </el-input>
    </div>

    <el-button v-if="type === 'buy'" type="primary" plain @click="createOrder()">Buy</el-button>
    <el-button v-if="type === 'sell'" type="danger" plain @click="createOrder()">Sell</el-button>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  data() {
    return {
      coinFrom: 'ETH',
      coinTo: 'BTC',
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
      axios.post('/user-api/createOrder/', post)
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
.create-order
  button
    font-size: 22px
  .el-input-group__prepend
    min-width: 90px
    font-weight: 700
</style>
