import { observable } from 'mobx'

class DashboardsStore {
  @observable widgets = [
    {i: "0", component: './core_components/Orders', header: "Orders asks", data: {type: "asks"}, x: 0, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "1", component: './core_components/Orders', header: "Orders bids", data: {type: "bids"}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "2", component: './core_components/charts/HeikinAshi', header: "HeikinAshi", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    // // {i: "3", component: Crocodile, header: "Crocodile", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "4", component: './core_components/Balance', header: "Balance", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "5", component: './core_components/Pairs', header: "Pairs", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "6", component: './core_components/Stocks', header: "Stocks", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "8", component: './core_components/OpenOrders', header: "OpenOrders", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "9", component: './core_components/MyTrades', header: "MyTrades", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "10", component: './core_components/RawTrades', header: "RawTrades", data: {}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "11", component: './core_components/CreateOrder', header: "CreateOrder sell", data: {type: "sell"}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
    {i: "12", component: './core_components/CreateOrder', header: "CreateOrder buy", data: {type: "buy"}, x: 2, y: 0, w: 5, h: 5, minW: 2, minH: 3},
  ]
}

const store = window.DashboardsStore = new DashboardsStore()

export default store
