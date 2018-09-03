import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'

class CreateOrderStore {
    @observable price = 0
    @observable amount = 0
    @computed get total() {
        return this.price * this.amount
    }

}

const store = window.CreateOrderStore = new CreateOrderStore()

export default store

// autorun(() => {

// })
