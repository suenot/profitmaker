import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
// import axios from 'axios'


@version(2)
class DashboardsStore {
  @observable dashboards = [
    { id: '1', icon: '/img/widgets/invention.svg', name: 'Intuition',
      widgets: [
        {component: "Candles", x: 0, y: 0, w: 6, h: 15, i: "0"},
        {component: "Handsontable", x: 0, y: 15, w: 6, h: 15, i: "1"},
        {component: "KupiTable", x: 0, y: 30, w: 6, h: 15, i: "2"},
      ]
  },
    { id: '2', icon: '/img/widgets/invention.svg', name: 'Refactuiton', widgets: [], counter: '0' },
  ]

  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    trunk.init()
    reaction(
      () => this.dashboards,
      () => {
        trunk.updateStore(this)
      }
    )
  }

  // @observable dashboardActiveId = '1'


  @computed get dashboard() {
    var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', this.dashboardActiveId])
    return this.dashboards[dashboardActiveIndex]
  }

  // @computed get dashboardActiveIndex() {
  //   return _.findIndex(this.dashboards, ['id', this.dashboardActiveId])
  // }
  @action updateWidgets(newLayout, dashboardActiveId) {
    var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', dashboardActiveId])
    this.dashboards[dashboardActiveIndex].widgets = JSON.parse(JSON.stringify(newLayout))
    // this.dashboards.push({ id: this.dashboardsCounter+"", text: 'Untitled', icon: '/img/widgets/invention.svg'})
  }

  @observable dashboardsCounter = 2
  @action addDashboard() {
    this.dashboards.push({ id: uuidv1(), name: 'Untitled', icon: '/img/widgets/sentiments.svg', widgets: [] })
  }
  @action removeDashboard(id) {
    // _.find(this.dashboards, ['id', widgetId])
    // delete this.dashboards[id]k
  }
  @action openDashboard(id) {
    this.dashboardActiveId = id
  }

  // @action removeWidget(widgetId, dashboardActiveId) {
  //   console.log('removeWidget', widgetId, dashboardActiveId)
  //   var dashboardActiveIndex = _.findIndex(this.dashboards, ['id', dashboardActiveId])
  //   var widgets = this.dashboards[dashboardActiveIndex].widgets
  //   this.dashboards[dashboardActiveIndex].widgets = _.filter(widgets, function(item) {
  //     return item.i !== widgetId
  //   })
  // }

  // @action addWidget() {
  //   // this.dashboardsCounter += 1
  //   var counter = this.dashboards[this.dashboardActiveIndex].counter
  //   counter = (parseInt(counter)+1).toString()
  //   var counter = this.dashboards[this.dashboardActiveIndex].counter = counter
  //   this.dashboards[this.dashboardActiveIndex].widgets.push({"component": "Chart", "x":2,"y":0,"w":2,"h":4,"i": counter})
  //   // this.dashboards.push({ id: uuidv1(), name: 'Untitled', icon: '/img/widgets/sentiments.svg', widgets: [], counter: '0' })
  // }

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
