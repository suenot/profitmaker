// import Vue from "vue"
// import Component from "vue-class-component"
// // import TestStore from '../stores/Store'
// import { Observer } from "mobx-vue"
// import ViewModel from "../stores/ViewModel"


// @Observer
// @Component
// export default class App extends Vue {
//     state = new ViewModel()
//     mounted() {
//         console.log('work')
//     }
// }


// export default Observer({
//     data() {
//         return { state: new ViewModel() }
//     },
//     mounted() {
//         this.state.fetchUsers()
//     }
// })


// export default {
//   // fromMobx: {
//   //   testModel
//   // },
//   data: () => ({
//     dialog: false,
//     drawer: null,
//     drawerRight: null,
//     newId: '3',
//     dashboards: {
//       '1': { id: '1', icon: 'view_quilt', text: 'Intuition' },
//       '2': { id: '2', icon: 'view_list', text: 'Refactuiton' }
//     }
//   }),
//   props: {
//     source: String
//   },
//   methods: {
//     openDashboard: function(id) {
//       console.log(id)
//     },
//     addDashboard: function() {
//       this.$set(this.dashboards, this.newId, { id: this.newId, icon: 'view_module', text: 'Refactuiton2' })
//       this.newId = (parseInt(this.newId)+1).toString()
//     },
//     editDashboard: function() {
//       this.drawerRight = !this.drawerRight
//     },
//     removeDashboard: function(id) {
//       this.$delete(this.dashboards, id)
//     }
//   }
// }


export default {
  data: () => ({
    dialog: false,
    drawer: null,
    drawerRight: null,
    newId: '3',
    dashboards: {
      '1': { id: '1', icon: '/img/widgets/invention.svg', text: 'Intuition' },
      '2': { id: '2', icon: '/img/widgets/invention.svg', text: 'Refactuiton' }
    }
  }),
  methods: {
    openDashboard: function(id) {
      console.log(id)
    },
    addDashboard: function() {
      this.$set(this.dashboards, this.newId, { id: this.newId, icon: 'view_module', text: 'Refactuiton2' })
      this.newId = (parseInt(this.newId)+1).toString()
    },
    editDashboard: function() {
      this.drawerRight = !this.drawerRight
    },
    removeDashboard: function(id) {
      this.$delete(this.dashboards, id)
    }
  }
}
