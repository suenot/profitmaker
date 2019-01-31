import { observable, action } from 'mobx'

class DrawersStore {
  constructor() {
    document.onkeyup = (e) => {
      if (e.keyCode==27) {
        this.drawersClose()
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
  @action drawersClose() {
    _.forEach(this.drawers, (drawer) => {
      drawer.open = false
    })
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
}

const store = window.DrawersStore = new DrawersStore()

export default store
