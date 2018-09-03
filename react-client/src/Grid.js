import React from "react"
import { BrowserRouter as Router, Link, Route } from "react-router-dom"
import { WidthProvider, Responsive } from "react-grid-layout"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'


// components
import Stocks from './core_components/Stocks'
import Pairs from './core_components/Pairs'
import Orders from './core_components/Orders'
import OpenOrders from './core_components/OpenOrders'
import MyTrades from './core_components/MyTrades'
import RawTrades from './core_components/RawTrades'
import CreateOrder from './core_components/CreateOrder'
import HeikinAshi from './core_components/charts/HeikinAshi'
import Crocodile from './core_components/charts/Crocodile'
import Balance from './core_components/Balance'
import HighstockWithPreloader from './core_components/HighstockWithPreloader'
// import GitterChat from './core_components/GitterChat'

// icons
import Clear from '@material-ui/icons/Clear'
import Settings from '@material-ui/icons/Settings'
import { inject, observer } from 'mobx-react'


const ResponsiveReactGridLayout = WidthProvider(Responsive);
const originalLayouts = getFromLS("layouts") || {};

// const Stock = ({ match }) => (
//   <div>
//     {match.params.stockId}  {match.params.pair}
//   </div>
// )


@inject('OrdersStore')
@observer
class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      layouts: JSON.parse(JSON.stringify(originalLayouts)),
      tokenDecimals: 18,
      tokenName: '-',
      tokenSymbol: '-',
      asks: {},
      orderbook: {
        'asks': {},
        'bids': {}
      },
      bids: {}
    };
  }

  static get defaultProps() {
    return {
      className: "layout",
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 30
    };
  }

  resetLayout() {
    this.setState({ layouts: {} });
  }

  onLayoutChange(layout, layouts) {
    saveToLS("layouts", layouts);
    this.setState({ layouts });
  }

  render() {
    return (
      <Router>
        <div>


          <button onClick={() => this.resetLayout()}>Reset Layout</button>
          <ResponsiveReactGridLayout
            className="layout"
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            layouts={this.state.layouts}
            onLayoutChange={(layout, layouts) => {
                this.onLayoutChange(layout, layouts)
                setTimeout(function() {
                  window.dispatchEvent(new Event('resize'))
                }, 200)
              }
            }
            draggableCancel="input,textarea"
            draggableHandle=".widget-header"
          >
            <div key="1" data-grid={{ w: 2, h: 3, x: 0, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>HeikinAshi</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <HeikinAshi tokenAddress="0xe41d2489571d322189246dafa5ebde1f4699f498" />
                </div>
              </div>
            </div>
            <div key="2" data-grid={{ w: 2, h: 3, x: 2, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Crocodile</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <Crocodile tokenAddress="0xe41d2489571d322189246dafa5ebde1f4699f498" />
                </div>
              </div>
            </div>
            <div key="3" data-grid={{ w: 2, h: 3, x: 4, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Asks</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <Orders type="asks" />
                </div>
              </div>
            </div>
            <div key="4" data-grid={{ w: 2, h: 3, x: 6, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Bids</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <Orders type="bids" />
                </div>
              </div>
            </div>

            <div key="6" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Balance</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <Balance />
                </div>
              </div>
            </div>
            <div key="7" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Pairs</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <Pairs />
                </div>
              </div>
            </div>
            <div key="8" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Stocks</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <Stocks />
                </div>
              </div>
            </div>
            <div key="9" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Hightstock</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <HighstockWithPreloader />
                </div>
              </div>
            </div>
            <div key="10" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>openOrders</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <OpenOrders />
                </div>
              </div>
            </div>
            <div key="11" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>myTrades</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <MyTrades />
                </div>
              </div>
            </div>
            <div key="12" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>rawTrades</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <RawTrades />
                </div>
              </div>
            </div>
            <div key="5" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Create sell order</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <CreateOrder type="sell" />
                </div>
              </div>
            </div>
            <div key="13" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
              <div class="widget">
                <div class="widget-header">
                  <span>Create buy order</span>
                  <div>
                    <Settings style={{ fontSize: 18 }} />
                    <Clear style={{ fontSize: 18 }} />
                  </div>
                </div>
                <div class="widget-body">
                  <CreateOrder type="buy" />
                </div>
              </div>
            </div>
          </ResponsiveReactGridLayout>
        </div>
      </Router>
    );
  }
  async componentWillMount() {

  }
}

// module.exports = ResponsiveLocalStorageLayout;

function getFromLS(key) {
  let ls = {};
  if (global.localStorage) {
    try {
      ls = JSON.parse(global.localStorage.getItem("rgl-8")) || {};
    } catch (e) {
      /*Ignore*/
    }
  }
  return ls[key];
}

function saveToLS(key, value) {
  if (global.localStorage) {
    global.localStorage.setItem(
      "rgl-8",
      JSON.stringify({
        [key]: value
      })
    );
  }
}

export default App
