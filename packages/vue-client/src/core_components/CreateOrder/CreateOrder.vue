<template>
  <div class="create-order">
    <el-input placeholder="Price" v-model="price">
      <template slot="prepend">Price</template>
      <template slot="append">{{coinTo}}</template>
    </el-input>

    <el-input placeholder="Price" v-model="amount">
      <template slot="prepend">Amount</template>
      <template slot="append">{{coinFrom}}</template>
    </el-input>

    <el-input placeholder="Price" v-model="totalComputed">
      <template slot="prepend">Total</template>
      <template slot="append">{{coinTo}}</template>
    </el-input>

    <el-button v-if="type === 'buy'" type="success" plain class="block" @click="createOrder()">Buy</el-button>
    <el-button v-if="type === 'sell'" type="danger" plain class="block" @click="createOrder()">Sell</el-button>
  </div>
</template>

<script>
import axios from 'axios'
import { Notification } from 'element-ui'
export default {
  data() {
    return {
      price: 0,
      amount: 0,
      error: ''
    }
  },
  props: [
    'type'
  ],
  fromMobx: {
    stock: {
      get() {
        return Store.stock
      }
    },
    pair: {
      get() {
        return Store.pair
      }
    },
    accountId: {
      get() {
        return Store.accountId
      }
    },
  },
  computed: {
    coinFrom() {
      return this.pair ? this.pair.split('_')[0] : ''
    },
    coinTo() {
      return this.pair ? this.pair.split('_')[1] : ''
    },
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
      axios.post('/user-api/createOrder/', post)
      .then((response) => {
        Notification({
          title: 'Success',
          message: `Order created`,
          type: 'success'
        })
      })
      .catch((error) => {
        console.log(error)
        Notification({
          title: 'Success',
          message: `Order cannot be created: ${error}`,
          type: 'error'
        })
      })
    }
  }
}
</script>

<style lang="sass">
// TODO: rm
.create-order
  button
    font-size: 22px
  .el-input-group__prepend
    min-width: 90px
    font-weight: 700
</style>
