import { observable, action, reaction } from 'mobx'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import _ from 'lodash'
// import GlobalStore from './GlobalStore'

class DrawersStore {
  // constructor(GlobalStore) {
  //   this.GlobalStore = GlobalStore
  // }
  @observable drawerRightOpen = false
  @observable drawerRightComponent = './core_components/Empty'
  @observable drawerRightWidth = '0px'
  // @observable drawerRightWidthClosed = 0
  @observable drawerRightData = {}
  @action drawerRightToggle() {
    this.drawerRightOpen = !this.drawerRightOpen
  }
  @action drawerRightSet(component, width) {
    this.drawerRightComponent = component
    this.drawerRightWidth = width
  }
}

const store = window.DrawersStore = new DrawersStore()
export default store

// export default DrawersStore
