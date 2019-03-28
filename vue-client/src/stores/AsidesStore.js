import { observable, action } from 'mobx'
import uuidv1 from 'uuid/v1'

class AsidesStore {
  constructor() {
    document.onkeyup = (e) => {
      if (e.keyCode==27) {
        this.removeAsides()
      }
    }
  }

  @observable asidesTrigger = false
  @observable asides = [
    {
      id: '1',
      side: 'left',
      width: 60,
      component: 'Menu',
      header: false,
      permanent: true,
    },
    // {
    //   key: '3',
    //   side: 'left',
    //   width: 320,
    //   component: 'Pairs',
    // },
    // {
    //   key: '2',
    //   side: 'right',
    //   width: 320,
    //   component: 'Stocks',
    // },
  ]

  @action addAside(component, side, width, data, dashboardId, widgetId) {
    this.asides.push({
      id: uuidv1(),
      side: side || 'left',
      width: width || 320,
      component: component || 'Empty',
      header: true,
      permanent: false,
    })
    this.asidesTrigger = !this.asidesTrigger
  }

  @action removeAside(id) {
    this.asides = _.filter(this.asides, (aside)=>{
      return aside.id !== id
    })
    this.asidesTrigger = !this.asidesTrigger
  }

  @action removeAsides() {
    this.asides = _.filter(this.asides, (aside)=>{
      return aside.permanent === true
    })
    this.asidesTrigger = !this.asidesTrigger
  }
}

const store = window.AsidesStore = new AsidesStore()

export default store
