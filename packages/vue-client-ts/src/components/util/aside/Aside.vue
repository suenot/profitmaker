<template>
  <div :class="`aside active aside-${aside.side}`" :style="`left: ${aside.left}px; right: ${aside.right}px; width: ${aside.width}px;`">
    <div class="aside-header" v-if="aside.title">
      <span class="aside-title">{{aside.title}}</span>
      <span class="aside-actions">
        <i class="el-icon-close" @click="removeAside(aside.id)"></i>
      </span>
    </div>
    <div class="aside-body">
      <component :is="aside.component" :aside="aside" :widget="aside.widget" />
    </div>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {Mutation} from 'vuex-class'
import {Aside as AsideType} from '@/types'

@Component({
  name: 'Aside'
})
export default class Aside extends Vue {
  @Prop()
  aside!: AsideType;

  @Mutation('removeAside', { namespace: 'Aside' })
  removeAsideAction!: Function

  removeAside () {
    this.removeAsideAction(this.aside.id)
  }
}
</script>

<style lang="sass" scoped>

</style>
