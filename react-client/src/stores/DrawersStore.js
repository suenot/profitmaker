class DrawersStore {
  @ignore @observable drawerRightOpen = false
  @ignore @observable drawerRightComponent = './core_components/Stocks'
  @ignore @observable drawerRightWidth = '0px'
  // @ignore @observable drawerRightWidthClosed = 0
  @ignore @observable drawerRightData = {}
  @action drawerRightToggle() {
    this.drawerRightOpen = !this.drawerRightOpen
  }
  @action drawerRightSet(component, width) {
    this.drawerRightComponent = component
    this.drawerRightWidth = width
  }
}

// const store = window.DrawersStore = new DrawersStore()
// export default store

export default DrawersStore
