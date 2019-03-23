<template>
  <div class="createOrder-wrapper">
    <!-- <h3>Create <strong>{{type}}</strong> Order in <strong>{{pair}}</strong></h3> -->
    <!-- <p>On account: <strong>{{accountId}}</strong></p> -->
    <!-- <p>price</p>
    <input v-model="price" class="input" type="text" placeholder=""/> -->
    <div style="margin-top: 15px;">
      <!-- <label>Price</label> -->
      <el-input placeholder="Price" v-model="price">
        <template slot="prepend">Price</template>
        <template slot="append">{{coinFrom}}</template>
      </el-input>
    </div>
    <div style="margin-top: 15px;">
      <el-input placeholder="Price" v-model="amount">
        <template slot="prepend">Amount</template>
        <template slot="append">{{coinTo}}</template>
      </el-input>
    </div>

    <div style="margin-top: 15px; margin-bottom: 15px;">
      <el-input placeholder="Price" v-model="totalComputed">
        <template slot="prepend">Total</template>
        <template slot="append">{{coinTo}}</template>
      </el-input>
    </div>


    <el-button v-if="type === 'buy'" type="primary" plain @click="createOrder()">Buy</el-button>
    <el-button v-if="type === 'sell'" type="danger" plain @click="createOrder()">Sell</el-button>

    {{error}}
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
// h3
//   text-align: center
//   padding-top: 20px
// p
//   text-align: center
// .input
//   margin: 0 auto 20px
//   border: 1px solid #ebeef5
//   outline: none
//   height: 40px
//   line-height: 40px
//   display: block
//   margin-bottom: 20px
//   &:focus
//     border: 1px solid red
.createOrder-wrapper
  padding: 20px
  text-align: center
  h3
    font-weight: normal
  button
    font-size: 22px
  .el-input-group__prepend
    min-width: 90px
    font-weight: 700
  .el-input
    font-size: 18px
    .el-input__inner
      height: 54px
      line-height: 54px
    .el-input-group__prepend
      padding: 0 10px
</style>
