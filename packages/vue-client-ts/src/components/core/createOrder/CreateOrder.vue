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

<script lang="ts">
import axios from 'axios'
import { Notification } from 'element-ui'
import { Component, Prop, Vue } from 'vue-property-decorator'
import { State } from 'vuex-class'

@Component({
  name: 'CreateOrder'
})
export default class CreateOrder extends Vue {
  @Prop()
  type!: string

  price: number = 0

  amount: number = 0

  error: string = ''

  @State('stock', {namespace: 'app'})
  stock!: string

  @State('pair', {namespace: 'app'})
  pair!: string

  @State('accountId', {namespace: 'app'})
  accountId!: string

  get coinFrom () {
    return this.pair ? this.pair.split('_')[0] : ''
  }

  get coinTo () {
    return this.pair ? this.pair.split('_')[1] : ''
  }

  get totalComputed () {
    return this.price * this.amount
  }

  createOrder () {
    const post = {
      'accountId': this.accountId,
      'pair': this.pair,
      'type': this.type,
      'price': this.price,
      'amount': this.amount
    }

    axios.post('/user-api/createOrder/', post)
      .then((res) => {
        console.log(`createOrder`, res)
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
