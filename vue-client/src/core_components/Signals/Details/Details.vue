<template>
  <div class="detailsWrap">
    <div>
      <div>full_name_from</div>
      <el-input placeholder="coiFrom" v-model="from.full_name" class="m-16"></el-input>
      <el-checkbox v-model="from.white">White</el-checkbox>
      <el-checkbox v-model="from.black">Black</el-checkbox>
      <el-checkbox v-model="from.favorite">Favorite</el-checkbox>
      <div>Note</div>
      <el-input type="textarea" v-model="from.note"></el-input>
    </div>
    <div>
      <div>full_name_to</div>
      <el-input placeholder="coiTo" v-model="to.full_name" class="m-16"></el-input>
      <el-checkbox v-model="to.white">White</el-checkbox>
      <el-checkbox v-model="to.black">Black</el-checkbox>
      <el-checkbox v-model="to.favorite">Favorite</el-checkbox>
      <div>Note</div>
      <el-input type="textarea" v-model="to.note"></el-input>


    </div>

  </div>
</template>

<script>
export default {
  data () {
    return {
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
  mounted() {},

}

</script>

<style lang="sass" scoped>
.detailsWrap
  display: flex
  & > div
    flex: 0 0 50%
    padding: 30px
</style>
