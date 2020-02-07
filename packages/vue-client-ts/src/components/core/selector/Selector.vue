<template>
  <table>
    <tbody>
      <tr>
        <td @click="showStocks()">
          {{stock}}
          <span v-if="accountName" class="muted">
            <br/>{{accountName}}
          </span>
        </td>
        <td @click="showPairs()">{{pair}}</td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { State, Action } from 'vuex-class'

@Component({
  name: 'Selector'
})
export default class Selector extends Vue {
  @State
  stock!: any

  @State
  pair!: string

  @State
  accountName!: string

  @Action('addAside', { namespace: 'Aside' })
  addAside!: Function

  showStocks () {
    const component = 'Stocks'
    const title = 'Stocks'
    const side = 'left'
    const width = 380
    const widget = { demo: false }
    this.addAside(component, title, side, width, widget)
  }

  showPairs () {
    const component = 'Pairs'
    const title = 'Pairs'
    const side = 'left'
    const width = 380
    const widget = { demo: false }
    this.addAside(component, title, side, width, widget)
  }
}
</script>

<style lang="sass" scoped>
table
  width: 100%
  border-collapse: collapse
  td
    padding: 30px
    border: 1px solid rgba(0,0,0,0.12)
    text-align: center
    &:hover
      cursor: pointer
      background: rgba(0,0,0,0.08)

</style>
