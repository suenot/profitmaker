import { observable, action } from 'mobx'

class DrawersStore {
  constructor() {
    document.onkeyup = (e) => {
      if (e.keyCode==27) {
        this.drawerRightClose()
      }
    }
  }

  @observable drawers = {
    'menu-left': {
      open: false,
      component: 'core_components/Empty',
      dashboardId: '',
      widgetId: '',
      width: '320px',
      data: {}
    },
    'menu-right': {
      open: false,
      component: 'core_components/Empty',
      dashboardId: '',
      widgetId: '',
      width: '320px',
      data: {}
    },
    'aside-left-first': {
      open: false,
      component: 'core_components/Empty',
      dashboardId: '',
      widgetId: '',
      width: '320px',
      data: {}
    },
    'aside-left-second': {
      open: false,
      component: 'core_components/Empty',
      dashboardId: '',
      widgetId: '',
      width: '320px',
      data: {}
    },
    'aside-right-first': {
      open: false,
      component: 'core_components/Empty',
      dashboardId: '',
      widgetId: '',
      width: '320px',
      data: {}
    },
    'aside-right-second': {
      open: false,
      component: 'core_components/Empty',
      dashboardId: '',
      widgetId: '',
      width: '320px',
      data: {}
    },
  }
  @action drawerOpen(drawer) {
    this.drawers[drawer].open = true
  }
  @action drawerClose(drawer) {
    this.drawers[drawer].open = false
    this.drawers[drawer].component = 'core_components/Empty'
  }
  @action drawerToggle(drawer) {
    this.drawers[drawer].open = !this.drawers[drawer].open
  }
  @action drawerSet(drawer, component, width, data, dashboardId, widgetId) {
    var open = this.drawers[drawer].open
    this.drawers[drawer] = {
      open: open,
      component: component,
      dashboardId: dashboardId || '',
      widgetId: widgetId || '',
      width: width || '320px',
      data: data || {}
    }
  }










  // TODO: Deprecated
  @observable drawerRightOpen = false
  @observable drawerRightComponent = 'core_components/Empty'
  @observable drawerRightDashboardId = ''
  @observable drawerRightWidgetId = ''
  @observable drawerRightWidth = '0px'
  @observable drawerRightData = {}
  @action drawerRightToOpen() {
    this.drawerRightOpen = true
  }
  @action drawerRightClose() {
    this.drawerRightOpen = false
    this.drawerRightSet('core_components/Empty', '0px')
  }
  @action drawerRightToggle() {
    this.drawerRightOpen = !this.drawerRightOpen
  }
  @action drawerRightSet(component, width, data, dashboardId, widgetId) {
    this.drawerRightComponent = component
    this.drawerRightDashboardId = dashboardId || ''
    this.drawerRightWidgetId = widgetId || ''
    this.drawerRightWidth = width || '320px'
    this.drawerRightData = data || {}
  }
}

const store = window.DrawersStore = new DrawersStore()

export default store
