import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
// import axios from 'axios'


@version(3)
class DashboardsStore {
  constructor() {
    // const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    // trunk.init()
    // reaction(
    //   () => this.dashboards,
    //   () => trunk.updateStore(this)
    // )
  }

  @observable dashboardActiveId = '1'
  @observable dashboards = [
    { id: '1', icon: '/img/widgets/invention.svg', name: 'Intuition', widgets: [
      {component: "Chart", x: 0, y: 0, w: 50, h: 5, i: "0"},
      {component: "Chart", x: 2, y: 0, w: 50, h: 5, i: "1"}
    ], counter: '2' },
    { id: '2', icon: '/img/widgets/invention.svg', name: 'Refactuiton', widgets: [], counter: '0' },
  ]
  @computed get dashboard() {
    var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', this.dashboardActiveId])
    return this.dashboards[dashboardActiveIndex]
  }
  @observable dashboardsCounter = 2
  @action addDashboard() {
    this.dashboardsCounter += 1
    this.dashboards.push({ id: this.dashboardsCounter+"", text: 'Untitled', icon: '/img/widgets/invention.svg'})
  }
  @action removeDashboard(id) {
    // _.find(this.dashboards, ['id', widgetId])
    // delete this.dashboards[id]
  }
  @action openDashboard(id) {
    this.dashboardActiveId = id
  }

}

const store = window.DashboardsStore = new DashboardsStore()
export default store
