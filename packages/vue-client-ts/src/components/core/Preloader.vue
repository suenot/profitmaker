<template>
  <div :class="root">
<!--    <CircularProgress :class="progress" :size="progressSize" />-->
    <md-progress-spinner md-mode="indeterminate" :size="progressSize" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component({
  name: 'Preloader',
})
export default class Preloader extends Vue {
  @Prop()
  classes!: any
  size!: number

  progressSize : number = 50

  root: object = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  }

  progress: object = {
    // margin: `0 auto`,
  }
}
</script>

<style scoped>

</style>
