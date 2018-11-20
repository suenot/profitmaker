import { observable, action } from 'mobx'
import axios from 'axios'

class Store {
  hash = ''
  @observable signals = []
  intervalId = ''
  @action async mount(url) {
    this.intervalId = setInterval(()=>{
      axios.get(`${url}`)
        .then((response) => {
          console.log(response.data)
          if (this.hash === JSON.stringify(response.data)) {
            return true
          }
          this.hash = JSON.stringify(response.data)
          this.signals = response.data
        })
        .catch((error) => {
          this.signals = []
        })
    }, 1000)
  }
  @action unmount() {
    clearInterval(this.intervalId)
  }
}

const store = new Store()
export default store

// var openSocket = require('socket.io-client')
// var socket = openSocket('http://localhost:8000')

// componentWillMount() {
//   socket.on('intuition', function(msg){
//     console.log('intuition')
//     console.log(msg)
//   })
// }
