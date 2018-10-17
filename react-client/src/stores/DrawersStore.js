import { observable, action } from 'mobx'

class DrawersStore {
  @observable drawerRightOpen = false
  @observable drawerRightComponent = 'core_components/Empty'
  @observable drawerRightDashboardId = ''
  @observable drawerRightWidgetId = ''
  @observable drawerRightWidth = '0px'
  @observable drawerRightData = {}
  @action drawerRightClose() {
    this.drawerRightOpen = false
  }
  @action drawerRightToggle() {
    this.drawerRightOpen = !this.drawerRightOpen
  }
  @action drawerRightSet(component, width, data, dashboardId, widgetId) {
    this.drawerRightComponent = component
    this.drawerRightDashboardId = dashboardId || ''
    this.drawerRightWidgetId = widgetId || ''
    this.drawerRightWidth = width
    this.drawerRightData = data
  }
}

const store = window.DrawersStore = new DrawersStore()

export default store
