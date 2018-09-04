import { observable } from 'mobx'

// components
import Orders from '../core_components/Orders'
import Stocks from '../core_components/Stocks'
import Pairs from '../core_components/Pairs'
import OpenOrders from '../core_components/OpenOrders'
import MyTrades from '../core_components/MyTrades'
import RawTrades from '../core_components/RawTrades'
import CreateOrder from '../core_components/CreateOrder'
import HeikinAshi from '../core_components/charts/HeikinAshi'
import Crocodile from '../core_components/charts/Crocodile'
import Balance from '../core_components/Balance'
import HighstockWithPreloader from '../core_components/HighstockWithPreloader'

class DashboardsStore {
  @observable widgets = [
    {i: "0", component: Orders, header: "Orders asks", data: {type: "asks"}, x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 3},
    {i: "1", component: Orders, header: "Orders bids", data: {type: "bids"}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "2", component: HeikinAshi, header: "HeikinAshi", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "3", component: Crocodile, header: "Crocodile", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "4", component: Balance, header: "Balance", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "5", component: Pairs, header: "Pairs", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "6", component: Stocks, header: "Stocks", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "7", component: HighstockWithPreloader, header: "HighstockWithPreloader", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "8", component: OpenOrders, header: "OpenOrders", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "9", component: MyTrades, header: "MyTrades", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "10", component: RawTrades, header: "RawTrades", data: {}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "11", component: CreateOrder, header: "CreateOrder sell", data: {type: "sell"}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
    {i: "12", component: CreateOrder, header: "CreateOrder buy", data: {type: "buy"}, x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3},
  ]
}

const store = window.DashboardsStore = new DashboardsStore()

export default store
