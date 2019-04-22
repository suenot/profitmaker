<template>
  <div>
    {{data}}
    <div class="detailsWrap">
      <div>
        <el-checkbox v-model="from.white">White</el-checkbox>
        <el-checkbox v-model="from.black">Black</el-checkbox>
        <el-checkbox v-model="from.favorite">Favorite</el-checkbox>
        <div>Full name</div>
        <el-input placeholder="Full name" v-model="from.full_name" class="m-16" @change="changeData($event)"></el-input>
        <div>Note</div>
        <el-input type="textarea" v-model="from.note" @change="changeData($event)"></el-input>
      </div>
      <div>
        <el-checkbox v-model="to.white">White</el-checkbox>
        <el-checkbox v-model="to.black">Black</el-checkbox>
        <el-checkbox v-model="to.favorite">Favorite</el-checkbox>
        <div>Full name</div>
        <el-input placeholder="Full name" v-model="to.full_name" class="m-16" @change="changeData($event)"></el-input>
        <div>Note</div>
        <el-input type="textarea" v-model="to.note" @change="changeData($event)"></el-input>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  data () {
    return {
      server: 'https://kupi.network/api/',
      data: {},
      from: {
        full_name: '',
        white: true,
        black: false,
        favorite: false,
        note: '',
      },
      to: {
        full_name: '',
        white: true,
        black: false,
        favorite: false,
        note: '',
      }
    }
  },
  mounted() {
    this.getData()
    this.getDetails()
  },
  methods: {
    getDetails() {
      axios.get(`${this.server}/intuition-details/${this.$route.params.id}`)
      .then((response) => {
        this.data = response.data
      })
      .catch((error) => {
      })
    },
    getData() {
      axios.get(`${this.server}/pairs/BINANCE--ETH_BTC`)
      .then((response) => {
        this.from = response
      })
      .catch((error) => {
      })
    },
    changeData(e) {
      axios.post(`${this.server}/pairs/core`, {
        id: 'BINANCE--ETH_BTC',
        key: 'note',
        value: e
      })
      .then((response) => {
        this.getData()
      })
      .catch((error) => {
      })
    }
  }
}

</script>

<style lang="sass" scoped>
.detailsWrap
  display: flex
  & > div
    flex: 0 0 50%
    padding: 30px
</style>
