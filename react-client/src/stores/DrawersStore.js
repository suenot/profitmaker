import { observable, action } from 'mobx'

class DrawersStore {
  @observable drawerRightOpen = false
  @observable drawerRightComponent = 'core_components/Empty'
  @observable drawerRightWidth = '0px'
  @observable drawerRightData = {}
  @action drawerRightClose() {
    this.drawerRightOpen = false
  }
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
