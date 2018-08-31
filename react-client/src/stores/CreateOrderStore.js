import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'

class CreateOrderStore {
    @observable price = 0
    @observable amount = 0
    @observable result = 0

}

const store = window.CreateOrderStore = new CreateOrderStore()

export default store

// autorun(() => {

// })
