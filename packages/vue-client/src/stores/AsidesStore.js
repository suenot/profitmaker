import { observable, action } from 'mobx'
import uuidv1 from 'uuid/v1'
import { ID } from 'postcss-selector-parser';

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
      title: '',
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

  @action addAside(component, title, side, width, widget, dashboardId, widgetId) {
    var id = false
    for (let aside of this.asides) {
      if (
        aside.permanent === false &&
        JSON.stringify(aside.widget) === JSON.stringify(widget) &&
        aside.side === side &&
        aside.width === width &&
        aside.component === component
      ) {
        id = aside.id
        break
      }
    }
    if (!id) {
      // add new aside
      this.asides.push({
        id: uuidv1(),
        side: side || 'left',
        width: width || 320,
        component: component || 'Empty',
        title: title || '',
        permanent: false,
        widget: widget
      })
      this.asidesTrigger = !this.asidesTrigger
    } else {
      // remove aside
      this.removeAside(id)
    }
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
