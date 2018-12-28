import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
// import axios from 'axios'


@version(2)
class DashboardsStore {
  @observable dashboards = [
    { id: '1', icon: '/img/widgets/invention.svg', name: 'Intuition', widgets: [
      {component: "Chart", x: 0, y: 0, w: 3, h: 3, i: "0"},
      {component: "Chart", x: 7, y: 10, w: 3, h: 3, i: "1"},
      {component: "Chart", x: 0, y: 10, w: 5, h: 5, i: "2"}
    ], counter: '2' },
    { id: '2', icon: '/img/widgets/invention.svg', name: 'Refactuiton', widgets: [], counter: '0' },
  ]

  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    trunk.init()
    reaction(
      () => this.dashboards,
      () => {
        trunk.updateStore(this)
        console.log('***')
      }
    )
  }

  @observable dashboardActiveId = '1'


  @computed get dashboard() {
    var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', this.dashboardActiveId])
    return this.dashboards[dashboardActiveIndex]
  }
  @computed get widgets() {
    // var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', this.dashboardActiveId])
    return this.dashboards[this.dashboardActiveIndex].widgets
  }
  @computed get dashboardActiveIndex() {
    return _.findIndex(this.dashboards, ['id', this.dashboardActiveId])
  }
  @action updateWidgets(newLayout) {
    this.dashboards[this.dashboardActiveIndex].widgets = JSON.parse(JSON.stringify(newLayout))
    // this.dashboards.push({ id: this.dashboardsCounter+"", text: 'Untitled', icon: '/img/widgets/invention.svg'})
  }

  @observable dashboardsCounter = 2
  @action addDashboard() {
    // this.dashboardsCounter += 1
    this.dashboards.push({ id: uuidv1(), name: 'Untitled', icon: '/img/widgets/sentiments.svg', widgets: [], counter: '0' })
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


// create a mobx-sync
// const trunk = new AsyncTrunk(store, { storage: localStorage, storageKey: 'dashboards' })
// // load the persisted data to store
// trunk.init().then(() => {
//   // do any staff with loaded store
//   // console.log(store.foo)
// })

export default store
